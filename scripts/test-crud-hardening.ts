import crypto from 'node:crypto';
import { pool, query } from '../server/db';
import { hashPassword } from '../server/auth';

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5000';
const suffix = crypto.randomBytes(6).toString('hex');
const userId = `crud-hardening-admin-${suffix}`;
const email = `crud-hardening-${suffix}@example.test`;
const password = 'CrudHardeningPassword123!';
let bookId = '';

async function readJson(response: Response) {
  let body: any = null;
  try { body = await response.json(); } catch { /* no-op */ }
  return { status: response.status, body };
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

try {
  await query(
    'INSERT INTO users (id, email, password_hash, display_name, photo_url, role) VALUES ($1, $2, $3, $4, $5, $6)',
    [userId, email, await hashPassword(password), 'CRUD Hardening Admin', null, 'admin'],
  );

  const login = await readJson(await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, latitude: 27.7172, longitude: 85.324, device: 'Dell Laptop Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36' }),
  }));
  assert(login.status === 200 && login.body?.token, `admin login failed: ${login.status}`);
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${login.body.token}` };

  const unauthorized = await readJson(await fetch(`${baseUrl}/api/admin/messages`));
  assert(unauthorized.status === 401, `admin endpoint was not protected: ${unauthorized.status}`);

  const invalidBook = await readJson(await fetch(`${baseUrl}/api/books`, {
    method: 'POST', headers, body: JSON.stringify({ title: 'Invalid Test', author: 'Test', price: -1 }),
  }));
  assert(invalidBook.status === 400, `invalid book payload accepted: ${invalidBook.status}`);

  const created = await readJson(await fetch(`${baseUrl}/api/books`, {
    method: 'POST', headers, body: JSON.stringify({ title: `Hardening Test ${suffix}`, author: 'Test Author', price: 12.5, stock: 3, genre: 'Fiction' }),
  }));
  assert(created.status === 200 && created.body?.book?.id, `book create failed: ${created.status}`);
  bookId = created.body.book.id;

  const stockAdded = await readJson(await fetch(`${baseUrl}/api/books/${bookId}/stock`, {
    method: 'PATCH', headers, body: JSON.stringify({ delta: 2 }),
  }));
  assert(stockAdded.status === 200 && stockAdded.body?.book?.stock === 5, `stock add failed: ${stockAdded.status}`);
  const stockUnderflow = await readJson(await fetch(`${baseUrl}/api/books/${bookId}/stock`, {
    method: 'PATCH', headers, body: JSON.stringify({ delta: -6 }),
  }));
  assert(stockUnderflow.status === 400, `stock underflow was accepted: ${stockUnderflow.status}`);

  const emptyUpdate = await readJson(await fetch(`${baseUrl}/api/books/${bookId}`, { method: 'PUT', headers, body: '{}' }));
  assert(emptyUpdate.status === 400, `empty book update accepted: ${emptyUpdate.status}`);

  const missingDelete = await readJson(await fetch(`${baseUrl}/api/books/not-a-real-book`, { method: 'DELETE', headers }));
  assert(missingDelete.status === 404, `missing book delete was not 404: ${missingDelete.status}`);

  const orderList = await readJson(await fetch(`${baseUrl}/api/admin/orders?status=pending&limit=10`, { headers }));
  assert(orderList.status === 200 && Array.isArray(orderList.body?.orders), `admin order filter failed: ${orderList.status}`);
  const messageList = await readJson(await fetch(`${baseUrl}/api/admin/messages?status=unread`, { headers }));
  assert(messageList.status === 200 && Array.isArray(messageList.body?.messages), `admin message filter failed: ${messageList.status}`);

  const configuredSystemAdmin = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (configuredSystemAdmin) {
    const protectedAccount = await query<{ id: string }>('SELECT id FROM users WHERE LOWER(email) = $1', [configuredSystemAdmin]);
    if (protectedAccount.rows[0]) {
      const userList = await readJson(await fetch(`${baseUrl}/api/admin/users`, { headers }));
      assert(userList.status === 200 && !userList.body?.users?.some((user: { id: string }) => user.id === protectedAccount.rows[0].id), 'system administrator leaked into the user list');
      const protectedRoleChange = await readJson(await fetch(`${baseUrl}/api/admin/users/${protectedAccount.rows[0].id}`, {
        method: 'PATCH', headers, body: JSON.stringify({ role: 'user' }),
      }));
      assert(protectedRoleChange.status === 403, `system administrator role protection failed: ${protectedRoleChange.status}`);
      const protectedDelete = await readJson(await fetch(`${baseUrl}/api/admin/users/${protectedAccount.rows[0].id}`, { method: 'DELETE', headers }));
      assert(protectedDelete.status === 403, `system administrator deletion protection failed: ${protectedDelete.status}`);
    }
  }

  const settingsBefore = await readJson(await fetch(`${baseUrl}/api/admin/settings`));
  assert(settingsBefore.status === 200 && settingsBefore.body?.settings, `settings read failed: ${settingsBefore.status}`);
  const savedPin = (await query<{ admin_pin: string }>(`SELECT admin_pin FROM site_settings WHERE id = 'default'`)).rows[0]?.admin_pin;
  assert(savedPin, 'default site settings pin is missing');
  const settingsSave = await readJson(await fetch(`${baseUrl}/api/admin/settings`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ ...settingsBefore.body.settings, adminPin: savedPin }),
  }));
  assert(settingsSave.status === 200 && settingsSave.body?.ok, `settings save failed: ${settingsSave.status}`);

  const removed = await readJson(await fetch(`${baseUrl}/api/books/${bookId}`, { method: 'DELETE', headers }));
  assert(removed.status === 200, `book delete failed: ${removed.status}`);
  bookId = '';
  console.log('CRUD VALIDATION, AUTHORIZATION, FILTER, AND NOT-FOUND TESTS PASSED');
} finally {
  if (bookId) await query('DELETE FROM books WHERE id = $1', [bookId]).catch(() => undefined);
  await query('DELETE FROM users WHERE id = $1', [userId]).catch(() => undefined);
  await pool.end();
}
