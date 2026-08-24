import crypto from 'crypto';
import { pool, query } from '../server/db';
import { hashPassword } from '../server/auth';
import { enforceAdminGeoIp } from '../server/middleware/adminGeoIp';

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5000';
const suffix = crypto.randomBytes(6).toString('hex');
const userId = `rotation-test-${suffix}`;
const email = `rotation-test-${suffix}@example.test`;
const password = 'RotationTestPassword123!';

function cookieFrom(response: Response): string {
  return response.headers.get('set-cookie')?.split(';')[0] || '';
}

async function login(body: Record<string, unknown>) {
  return fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, ...body }),
  });
}

try {
  await query(
    'INSERT INTO users (id, email, password_hash, display_name, photo_url, role) VALUES ($1, $2, $3, $4, $5, $6)',
    [userId, email, await hashPassword(password), 'Rotation Test Admin', null, 'admin'],
  );

  const loginResponse = await login({ latitude: 27.7172, longitude: 85.324, device: 'Dell Laptop Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36' });
  if (loginResponse.status !== 200) throw new Error(`Initial admin login failed: ${loginResponse.status}`);
  const initial = await loginResponse.json() as { token?: string };
  const firstCookie = cookieFrom(loginResponse);
  if (!initial.token || !firstCookie) throw new Error('Initial access token or refresh cookie missing.');

  const refreshResponse = await fetch(`${baseUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { cookie: firstCookie },
  });
  if (refreshResponse.status !== 200) throw new Error(`Refresh failed: ${refreshResponse.status}`);
  const rotated = await refreshResponse.json() as { token?: string };
  const secondCookie = cookieFrom(refreshResponse);
  if (!rotated.token || !secondCookie || secondCookie === firstCookie) throw new Error('Refresh token did not rotate.');

  const reuseResponse = await fetch(`${baseUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { cookie: firstCookie },
  });
  if (reuseResponse.status !== 401) throw new Error(`Refresh-token reuse was not rejected: ${reuseResponse.status}`);

  const originalFetch = globalThis.fetch;
  process.env.ADMIN_ALLOWED_COUNTRY = 'NP';
  process.env.ADMIN_ALLOWED_LATITUDE = '27.7172';
  process.env.ADMIN_ALLOWED_LONGITUDE = '85.324';
  process.env.ADMIN_ALLOWED_RADIUS_KM = '25';
  process.env.GEOIP_PROVIDER_URL = 'https://geo.test/{ip}';
  globalThis.fetch = (async () => new Response(JSON.stringify({ countryCode: 'NP', lat: 27.72, lon: 85.33 }), { status: 200 })) as typeof fetch;
  const allowed = await enforceAdminGeoIp({ ip: '203.0.113.10', socket: { remoteAddress: '203.0.113.10' } } as any);
  if (!allowed.allowed) throw new Error(`Allowed GeoIP request was rejected: ${allowed.reason}`);
  globalThis.fetch = (async () => new Response(JSON.stringify({ countryCode: 'US', lat: 40.7, lon: -74 }), { status: 200 })) as typeof fetch;
  const denied = await enforceAdminGeoIp({ ip: '203.0.113.11', socket: { remoteAddress: '203.0.113.11' } } as any);
  if (denied.allowed) throw new Error('Disallowed GeoIP country was accepted.');
  globalThis.fetch = originalFetch;
  delete process.env.ADMIN_ALLOWED_COUNTRY;
  delete process.env.ADMIN_ALLOWED_LATITUDE;
  delete process.env.ADMIN_ALLOWED_LONGITUDE;
  delete process.env.ADMIN_ALLOWED_RADIUS_KM;
  delete process.env.GEOIP_PROVIDER_URL;

  await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST', headers: { cookie: secondCookie, authorization: `Bearer ${rotated.token}` } });
  console.log('JWT ROTATION AND GEOIP TEST PASSED');
} finally {
  await query('DELETE FROM users WHERE id = $1', [userId]).catch(() => undefined);
  await pool.end();
}
