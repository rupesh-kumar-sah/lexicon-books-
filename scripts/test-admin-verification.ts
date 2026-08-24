import crypto from 'crypto';
import { pool, query } from '../server/db';
import { hashPassword } from '../server/auth';

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5000';
const suffix = crypto.randomBytes(6).toString('hex');
const userId = `admin-verification-test-${suffix}`;
const email = `admin-verification-${suffix}@example.test`;
const password = 'AdminTestPassword123!';

async function login(body: Record<string, unknown>) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, ...body }),
  });
  return { status: response.status, body: await response.json() };
}

try {
  await query(
    'INSERT INTO users (id, email, password_hash, display_name, photo_url, role) VALUES ($1, $2, $3, $4, $5, $6)',
    [userId, email, await hashPassword(password), 'Verification Test Admin', null, 'admin'],
  );

  const missingLocation = await login({ device: 'Dell Laptop Chrome' });
  if (missingLocation.status !== 401 || !missingLocation.body.requiresAdminVerification) {
    throw new Error(`Missing-location request was not rejected correctly: ${missingLocation.status}`);
  }

  const wrongDevice = await login({ latitude: 27.7172, longitude: 85.324, device: 'iPhone Chrome' });
  if (wrongDevice.status !== 403) throw new Error(`Wrong-device request was not rejected correctly: ${wrongDevice.status}`);
  const wrongBrowser = await login({ latitude: 27.7172, longitude: 85.324, device: 'Dell Laptop Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/140.0' });
  if (wrongBrowser.status !== 403) throw new Error(`Non-Chrome browser was not rejected correctly: ${wrongBrowser.status}`);

  const validDevice = await login({ latitude: 27.7172, longitude: 85.324, device: 'Dell Laptop Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36' });
  if (validDevice.status !== 200 || !validDevice.body.token || validDevice.body.user?.role !== 'admin') {
    throw new Error(`Valid Dell laptop Chrome request did not authenticate: ${validDevice.status}`);
  }

  await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { authorization: `Bearer ${validDevice.body.token}`, 'content-type': 'application/json' },
  });
  console.log('ADMIN DELL LAPTOP CHROME AND GEOLOCATION TEST PASSED');
} finally {
  await query('DELETE FROM users WHERE id = $1', [userId]).catch(() => undefined);
  await pool.end();
}
