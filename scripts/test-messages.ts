import crypto from 'node:crypto';
import { pool, query } from '../server/db';
import { hashPassword } from '../server/auth';

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5000';
const suffix = crypto.randomBytes(6).toString('hex');
const userId = `message-test-admin-${suffix}`;
const email = `message-test-admin-${suffix}@example.test`;
const password = 'MessageTestPassword123!';
let messageId = '';

async function json(response: Response) {
  return { status: response.status, body: await response.json() as any };
}

try {
  await query(
    'INSERT INTO users (id, email, password_hash, display_name, photo_url, role) VALUES ($1, $2, $3, $4, $5, $6)',
    [userId, email, await hashPassword(password), 'Message Test Admin', null, 'admin'],
  );

  const login = await json(await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, latitude: 27.7172, longitude: 85.324, device: 'Mozilla/5.0 Samsung F23 Chrome' }),
  }));
  if (login.status !== 200 || !login.body.token) throw new Error(`Admin login failed: ${login.status}`);
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${login.body.token}` };

  const created = await json(await fetch(`${baseUrl}/api/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Message Test Customer', email: 'customer@example.test', subject: 'Test inquiry', message: 'This is a message CRUD test.' }),
  }));
  if (created.status !== 201 || !created.body.id) throw new Error(`Message create failed: ${created.status}`);
  messageId = created.body.id;

  const listed = await json(await fetch(`${baseUrl}/api/admin/messages?search=test%20inquiry`, { headers }));
  if (listed.status !== 200 || !listed.body.messages.some((item: any) => item.id === messageId)) throw new Error(`Message list failed: ${listed.status}`);

  const updated = await json(await fetch(`${baseUrl}/api/admin/messages/${messageId}`, {
    method: 'PATCH', headers, body: JSON.stringify({ status: 'read' }),
  }));
  if (updated.status !== 200 || updated.body.message?.status !== 'read') throw new Error(`Message update failed: ${updated.status}`);

  const removed = await json(await fetch(`${baseUrl}/api/admin/messages/${messageId}`, { method: 'DELETE', headers }));
  if (removed.status !== 200) throw new Error(`Message delete failed: ${removed.status}`);
  messageId = '';
  console.log('CONTACT MESSAGE CREATE/LIST/UPDATE/DELETE TEST PASSED');
} finally {
  if (messageId) await query('DELETE FROM contact_messages WHERE id = $1', [messageId]).catch(() => undefined);
  await query('DELETE FROM users WHERE id = $1', [userId]).catch(() => undefined);
  await pool.end();
}
