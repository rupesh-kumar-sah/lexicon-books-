import crypto from 'crypto';
import { pool, query } from '../server/db';
import { hashPassword } from '../server/auth';

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5000';
const suffix = crypto.randomBytes(6).toString('hex');
const userId = `passkey-test-admin-${suffix}`;
const email = `passkey-test-admin-${suffix}@example.test`;
const password = 'PasskeyTestPassword123!';
const dellChrome = 'Dell Laptop Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36';

async function json(response: Response) {
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
    [userId, email, await hashPassword(password), 'Passkey Test Admin', null, 'admin'],
  );

  const unauthenticated = await json(await fetch(`${baseUrl}/api/auth/passkeys/status`));
  assert(unauthenticated.status === 401, `passkey status was not protected: ${unauthenticated.status}`);

  const login = await json(await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, latitude: 27.7172, longitude: 85.324, device: dellChrome }),
  }));
  assert(login.status === 200 && login.body?.token, `admin login failed: ${login.status}`);
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${login.body.token}` };

  const status = await json(await fetch(`${baseUrl}/api/auth/passkeys/status`, { headers }));
  assert(status.status === 200 && status.body?.enrolled === false && status.body?.count === 0, `empty passkey status failed: ${status.status}`);

  const registrationOptions = await json(await fetch(`${baseUrl}/api/auth/passkeys/register/options`, { method: 'POST', headers }));
  assert(registrationOptions.status === 200 && registrationOptions.body?.challengeId && registrationOptions.body?.options?.challenge, `registration options failed: ${registrationOptions.status}`);

  const loginOptions = await json(await fetch(`${baseUrl}/api/auth/passkeys/login/options`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email }),
  }));
  assert(loginOptions.status === 404, `un-enrolled passkey login was not rejected: ${loginOptions.status}`);

  const invalidVerify = await json(await fetch(`${baseUrl}/api/auth/passkeys/login/verify`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, challengeId: 'expired', response: { id: 'missing' }, latitude: 27.7172, longitude: 85.324, device: dellChrome }),
  }));
  assert(invalidVerify.status === 401, `invalid passkey verification was not rejected: ${invalidVerify.status}`);

  console.log('PASSKEY ROUTE AUTHORIZATION, OPTIONS, AND SAFE-FAILURE TEST PASSED');
} finally {
  await query('DELETE FROM users WHERE id = $1', [userId]).catch(() => undefined);
  await pool.end();
}
