import crypto from 'crypto';
import { pool, query } from '../server/db';
import { hashPassword } from '../server/auth';

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5000';
const suffix = crypto.randomBytes(6).toString('hex');
const userId = `admin-verification-test-${suffix}`;
const email = `admin-verification-${suffix}@example.test`;
const password = 'AdminTestPassword123!';
const windowsChromeUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36';

async function login(body: Record<string, unknown>, userAgent = windowsChromeUserAgent) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': userAgent },
    body: JSON.stringify({ email, password, ...body }),
  });
  return { status: response.status, body: await response.json() };
}

try {
  await query(
    'INSERT INTO users (id, email, password_hash, display_name, photo_url, role) VALUES ($1, $2, $3, $4, $5, $6)',
    [userId, email, await hashPassword(password), 'Verification Test Admin', null, 'admin'],
  );

  const missingLocation = await login({ device: windowsChromeUserAgent });
  if (missingLocation.status !== 401 || !missingLocation.body.requiresAdminVerification) {
    throw new Error(`Missing-location request was not rejected correctly: ${missingLocation.status}`);
  }

  const wrongPlatform = await login(
    { latitude: 27.7172, longitude: 85.324 },
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/123.0.0.0 Mobile/15E148 Safari/604.1',
  );
  if (wrongPlatform.status !== 403) throw new Error(`Non-Windows request was not rejected correctly: ${wrongPlatform.status}`);

  const wrongBrowser = await login(
    { latitude: 27.7172, longitude: 85.324 },
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
  );
  if (wrongBrowser.status !== 403) throw new Error(`Non-Chrome browser was not rejected correctly: ${wrongBrowser.status}`);

  const validDevice = await login({ latitude: 27.7172, longitude: 85.324 });
  if (validDevice.status !== 200 || !validDevice.body.token || validDevice.body.user?.role !== 'admin') {
    throw new Error(`Valid Windows Chrome request did not authenticate: ${validDevice.status}`);
  }

  await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { authorization: `Bearer ${validDevice.body.token}`, 'content-type': 'application/json' },
  });
  console.log('ADMIN WINDOWS CHROME AND GEOLOCATION TEST PASSED');
} finally {
  await query('DELETE FROM users WHERE id = $1', [userId]).catch(() => undefined);
  await pool.end();
}
