import crypto from 'crypto';
import { pool, query } from '../server/db';
import { hashPassword, verifyPassword } from '../server/auth';

const baseUrl = 'http://localhost:5000';
const suffix = crypto.randomBytes(6).toString('hex');
const userId = `password-reset-test-${suffix}`;
const email = `password-reset-${suffix}@example.test`;
const oldPassword = 'OldPassword123!';
const newPassword = 'NewPassword456!';

async function jsonRequest(path: string, body: Record<string, string>) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

try {
  await query(
    'INSERT INTO users (id, email, password_hash, display_name, photo_url, role) VALUES ($1, $2, $3, $4, $5, $6)',
    [userId, email, await hashPassword(oldPassword), 'Password Reset Test', null, 'user'],
  );

  const unknown = await jsonRequest('/api/auth/password-reset/request', { email: 'does-not-exist@example.test' });
  const known = await jsonRequest('/api/auth/password-reset/request', { email });
  if (unknown.status !== 200 || known.status !== 200 || unknown.body.message !== known.body.message) {
    throw new Error('Password reset request response is not generic.');
  }

  const generatedToken = await query<{ token_hash: string; used_at: string | null }>(
    'SELECT token_hash, used_at FROM password_reset_tokens WHERE user_id = $1',
    [userId],
  );
  if (generatedToken.rows.length !== 1 || generatedToken.rows[0].token_hash.length !== 64 || generatedToken.rows[0].used_at !== null) {
    throw new Error('Password reset request did not create one hashed, unused token.');
  }

  const rawToken = crypto.randomBytes(32).toString('base64url');
  await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
  await query(
    'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL \'10 minutes\')',
    [`password-reset-token-${suffix}`, userId, crypto.createHash('sha256').update(rawToken).digest('hex')],
  );

  const completed = await jsonRequest('/api/auth/password-reset/complete', { token: rawToken, password: newPassword });
  if (completed.status !== 200) throw new Error(`Password reset completion failed: ${completed.status}`);
  const user = await query<{ password_hash: string | null }>('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (!user.rows[0].password_hash || !(await verifyPassword(newPassword, user.rows[0].password_hash))) {
    throw new Error('New password was not stored correctly.');
  }

  const reused = await jsonRequest('/api/auth/password-reset/complete', { token: rawToken, password: 'AnotherPassword789!' });
  if (reused.status !== 400) throw new Error('Reset token was reusable.');

  const tokenState = await query<{ used_at: string | null }>('SELECT used_at FROM password_reset_tokens WHERE user_id = $1', [userId]);
  if (!tokenState.rows[0]?.used_at) throw new Error('Reset token was not marked used.');
  console.log('PASSWORD RESET END-TO-END TEST PASSED');
} finally {
  await query('DELETE FROM users WHERE id = $1', [userId]).catch(() => undefined);
  await pool.end();
}
