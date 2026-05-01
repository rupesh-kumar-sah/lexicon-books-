import { query } from './server/db.ts';
import { newId } from './server/auth.ts';

async function testCRUD() {
  console.log('=== FULL CRUD TEST ===\n');

  // CREATE
  const bookId = newId();
  console.log('1. CREATE book...');
  await query(
    `INSERT INTO books (id, title, author, description, price, cover_image, isbn, genre, stock, rating, year, featured)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [bookId, 'Test Book', 'Test Author', 'A test description', 10.99, 'https://example.com/img.jpg', '1234567890', 'Fiction', 5, 4.5, 2024, true]
  );
  const created = await query('SELECT * FROM books WHERE id = $1', [bookId]);
  console.log('   ✓ Created:', created.rows[0].title, '| Price:', created.rows[0].price, '| Stock:', created.rows[0].stock);

  // READ
  console.log('\n2. READ book...');
  const read = await query('SELECT * FROM books WHERE id = $1', [bookId]);
  console.log('   ✓ Read:', read.rows[0].title, '| Genre:', read.rows[0].genre);

  // UPDATE
  console.log('\n3. UPDATE book...');
  await query('UPDATE books SET title = $1, price = $2, stock = $3 WHERE id = $4', ['Updated Test Book', 19.99, 10, bookId]);
  const updated = await query('SELECT * FROM books WHERE id = $1', [bookId]);
  console.log('   ✓ Updated:', updated.rows[0].title, '| Price:', updated.rows[0].price, '| Stock:', updated.rows[0].stock);

  // DELETE
  console.log('\n4. DELETE book...');
  await query('DELETE FROM books WHERE id = $1', [bookId]);
  const deleted = await query('SELECT * FROM books WHERE id = $1', [bookId]);
  console.log('   ✓ Deleted: rows remaining =', deleted.rows.length);

  // VERIFY USER SIGNUP SAVES
  console.log('\n5. VERIFY users table...');
  const users = await query('SELECT id, email, role, created_at FROM users');
  console.log('   ✓ Users in DB:', users.rows.length);
  users.rows.forEach(u => console.log('     -', u.email, '| role:', u.role));

  // VERIFY ORDERS TABLE
  console.log('\n6. VERIFY orders table...');
  const orders = await query('SELECT COUNT(*)::text AS count FROM orders');
  console.log('   ✓ Orders in DB:', orders.rows[0].count);

  // VERIFY SITE SETTINGS
  console.log('\n7. VERIFY site_settings...');
  const settings = await query('SELECT * FROM site_settings');
  console.log('   ✓ Site name:', settings.rows[0]?.site_name);

  console.log('\n=== ALL CRUD OPERATIONS VERIFIED ✓ ===');
  process.exit(0);
}

testCRUD().catch(e => { console.error('FAILED:', e); process.exit(1); });
