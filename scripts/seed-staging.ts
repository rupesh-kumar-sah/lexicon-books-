import 'dotenv/config';
import { pool } from '../server/db';
import { hashPassword } from '../server/auth';

const STAGING_PREFIX = 'stg-mock-';
const STAGING_PASSWORD = process.env.STAGING_MOCK_PASSWORD || 'staging-mock-password';

const customers = [
  { key: 'maya', email: 'maya.rai+staging@example.test', name: 'Maya Rai', phone: '+977-9800000001', city: 'Kathmandu' },
  { key: 'arjun', email: 'arjun.shrestha+staging@example.test', name: 'Arjun Shrestha', phone: '+977-9800000002', city: 'Lalitpur' },
  { key: 'sophia', email: 'sophia.carter+staging@example.test', name: 'Sophia Carter', phone: '+1-202-555-0103', city: 'New York' },
  { key: 'liam', email: 'liam.wilson+staging@example.test', name: 'Liam Wilson', phone: '+44-20-7946-0104', city: 'London' },
  { key: 'anika', email: 'anika.joshi+staging@example.test', name: 'Anika Joshi', phone: '+977-9800000005', city: 'Pokhara' },
];

const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const;

type Book = {
  id: string;
  title: string;
  author: string;
  price: number;
  cover_image: string;
};

function orderItems(books: Book[], offset: number) {
  const first = books[offset % books.length];
  const second = books[(offset + 1) % books.length];
  return [
    {
      id: first.id,
      title: first.title,
      author: first.author,
      price: Number(first.price),
      quantity: 1 + (offset % 2),
      coverImage: first.cover_image,
    },
    {
      id: second.id,
      title: second.title,
      author: second.author,
      price: Number(second.price),
      quantity: 1,
      coverImage: second.cover_image,
    },
  ];
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const booksResult = await client.query<Book>(
      'SELECT id, title, author, price, cover_image FROM books ORDER BY created_at ASC LIMIT 10'
    );
    if (booksResult.rows.length < 2) {
      throw new Error('At least two books must exist before seeding mock orders.');
    }

    const passwordHash = await hashPassword(STAGING_PASSWORD);
    const userIds = new Map<string, string>();

    for (const customer of customers) {
      const userId = `${STAGING_PREFIX}user-${customer.key}`;
      await client.query(
        `INSERT INTO users (id, email, password_hash, display_name, photo_url, role)
         VALUES ($1, $2, $3, $4, $5, 'user')
         ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name,
                                           photo_url = EXCLUDED.photo_url,
                                           role = 'user'`,
        [
          userId,
          customer.email,
          passwordHash,
          customer.name,
          `https://ui-avatars.com/api/?name=${encodeURIComponent(customer.name)}&background=0f766e&color=fff`,
        ]
      );
      const result = await client.query<{ id: string }>('SELECT id FROM users WHERE email = $1', [customer.email]);
      userIds.set(customer.key, result.rows[0].id);
    }

    // Remove only records owned by this script, making repeated runs safe.
    await client.query('DELETE FROM orders WHERE id LIKE $1', [`${STAGING_PREFIX}order-%`]);

    for (let i = 0; i < customers.length; i += 1) {
      const customer = customers[i];
      const items = orderItems(booksResult.rows, i);
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const shipping = customer.city === 'Kathmandu' ? 0 : 150;
      const createdAt = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const orderId = `${STAGING_PREFIX}order-${String(i + 1).padStart(2, '0')}`;

      await client.query(
        `INSERT INTO orders
          (id, user_id, customer_email, customer_name, customer_phone, shipping_address,
           location_coords, items_json, subtotal, shipping, total, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12, $13)`,
        [
          orderId,
          userIds.get(customer.key),
          customer.email,
          customer.name,
          customer.phone,
          `${i + 10} Staging Avenue, ${customer.city}, STG 000${i + 1}, Test Country`,
          JSON.stringify({ lat: 27.7172 + i / 100, lng: 85.324 + i / 100 }),
          JSON.stringify(items),
          subtotal,
          shipping,
          subtotal + shipping,
          statuses[i % statuses.length],
          createdAt,
        ]
      );
    }

    await client.query('COMMIT');
    console.log(`Seeded ${customers.length} staging customers and ${customers.length} mock orders.`);
    console.log(`Mock customer password: ${STAGING_PASSWORD}`);
    console.log(`Order statuses: ${statuses.join(', ')}`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Staging seed failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
