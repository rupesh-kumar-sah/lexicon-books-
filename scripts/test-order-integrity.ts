import crypto from 'crypto';
import { pool, query } from '../server/db';
import { hashPassword } from '../server/auth';

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5000';
const suffix = crypto.randomBytes(6).toString('hex');
const userId = `order-integrity-user-${suffix}`;
const bookId = `order-integrity-book-${suffix}`;
const email = `order-integrity-${suffix}@example.test`;
const password = 'OrderIntegrityTest123!';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function json(response: Response) {
  return { status: response.status, body: await response.json().catch(() => ({})), headers: response.headers };
}

async function createOrder(token: string, idempotencyKey: string, items: unknown[]) {
  const response = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      'idempotency-key': idempotencyKey,
    },
    body: JSON.stringify({
      items,
      customer: {
        email,
        firstName: 'Order',
        lastName: 'Tester',
        phone: '9812345678',
        address: 'Test Street 1',
        city: 'Kathmandu',
        zip: '44600',
        country: 'Nepal',
        deliveryArea: 'ktm',
        locationCoords: { lat: 27.7172, lng: 85.324 },
      },
    }),
  });
  return json(response);
}

try {
  await query(
    'INSERT INTO users (id, email, password_hash, display_name, photo_url, role) VALUES ($1, $2, $3, $4, $5, $6)',
    [userId, email, await hashPassword(password), 'Order Integrity Tester', null, 'user'],
  );
  await query(
    `INSERT INTO books (id, title, author, description, price, cover_image, isbn, genre, stock, rating, year, featured)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [bookId, 'Order Integrity Book', 'Lexicon Test', '', 499, '', '', 'Testing', 3, 0, 2026, false],
  );

  const login = await json(await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }));
  assert(login.status === 200 && typeof login.body.token === 'string', `Test-user login failed: ${login.status}`);

  const idempotencyKey = `checkout-${crypto.randomUUID()}`;
  const first = await createOrder(login.body.token, idempotencyKey, [
    { id: bookId, quantity: 1, price: 0, title: 'Forged title' },
    { id: bookId, quantity: 1, price: 0, title: 'Forged title' },
  ]);
  assert(first.status === 201, `First order failed: ${first.status} ${first.body?.error || ''}`);
  assert(first.body.subtotal === 998, `Server did not calculate subtotal from the database price: ${first.body.subtotal}`);
  assert(first.body.shipping === 100 && first.body.total === 1098, `Server shipping calculation is incorrect: ${first.body.shipping}/${first.body.total}`);

  const replay = await createOrder(login.body.token, idempotencyKey, [{ id: bookId, quantity: 2, price: 1 }]);
  assert(replay.status === 200 && replay.body.repeated === true && replay.body.orderId === first.body.orderId, 'Idempotent checkout retry did not return the original order.');

  const stockAfterOrder = await query<{ stock: number }>('SELECT stock FROM books WHERE id = $1', [bookId]);
  assert(stockAfterOrder.rows[0]?.stock === 1, `Idempotent retry decremented stock twice: ${stockAfterOrder.rows[0]?.stock}`);

  const oversell = await createOrder(login.body.token, `checkout-${crypto.randomUUID()}`, [{ id: bookId, quantity: 2 }]);
  assert(oversell.status === 409, `Oversell request was not rejected: ${oversell.status}`);
  const stockAfterOversell = await query<{ stock: number }>('SELECT stock FROM books WHERE id = $1', [bookId]);
  assert(stockAfterOversell.rows[0]?.stock === 1, `Rejected oversell changed stock: ${stockAfterOversell.rows[0]?.stock}`);

  console.log('ORDER INTEGRITY TEST PASSED');
} finally {
  await query('DELETE FROM orders WHERE user_id = $1', [userId]).catch(() => undefined);
  await query('DELETE FROM books WHERE id = $1', [bookId]).catch(() => undefined);
  await query('DELETE FROM users WHERE id = $1', [userId]).catch(() => undefined);
  await pool.end();
}
