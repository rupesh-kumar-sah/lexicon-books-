import { Router } from 'express';
import crypto from 'crypto';
import { google } from 'googleapis';
import { query } from '../db';
import {
  hashPassword,
  verifyPassword,
  createSession,
  deleteSession,
  newId,
  requireAuth,
} from '../auth';
import { sendPasswordResetEmail } from '../integrations/google';

const router = Router();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const GOOGLE_SCOPES = ['openid', 'email', 'profile'];
const RESET_TTL_MINUTES = Math.max(10, Math.min(120, Number(process.env.PASSWORD_RESET_TTL_MINUTES || 30)));
const resetRequestWindows = new Map<string, { count: number; resetAt: number }>();

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function hashResetToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function canRequestReset(key: string) {
  const now = Date.now();
  const existing = resetRequestWindows.get(key);
  if (!existing || existing.resetAt <= now) {
    resetRequestWindows.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (existing.count >= 5) return false;
  existing.count += 1;
  return true;
}

function googleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function signGoogleState(value: string) {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'change-me';
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

function createGoogleState() {
  const payload = `${Date.now()}:${crypto.randomBytes(18).toString('hex')}`;
  return `${Buffer.from(payload).toString('base64url')}.${signGoogleState(payload)}`;
}

function validGoogleState(state: string) {
  const [encoded, signature] = state.split('.');
  if (!encoded || !signature) return false;
  const payload = Buffer.from(encoded, 'base64url').toString('utf8');
  const expected = signGoogleState(payload);
  if (!/^[0-9a-f]+$/i.test(signature) || signature.length !== expected.length) return false;
  const validSignature = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  const createdAt = Number(payload.split(':', 1)[0]);
  return validSignature && Number.isFinite(createdAt) && Date.now() - createdAt < 10 * 60 * 1000;
}

router.get('/google', (req, res) => {
  const client = googleOAuthClient();
  if (!client) return res.status(503).json({ error: 'Google sign-in is not configured' });
  const state = createGoogleState();
  const url = client.generateAuthUrl({ access_type: 'offline', prompt: 'select_account', scope: GOOGLE_SCOPES, state });
  res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
  const client = googleOAuthClient();
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  if (!client || !code || !validGoogleState(state)) return res.status(400).send('Invalid or expired Google sign-in request.');
  try {
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    const profile = await google.oauth2({ version: 'v2', auth: client }).userinfo.get();
    const email = profile.data.email?.toLowerCase();
    if (!email || profile.data.verified_email === false) return res.status(403).send('Google account email could not be verified.');

    const existing = await query<any>('SELECT id, email, display_name, photo_url, role, created_at FROM users WHERE email = $1', [email]);
    let user = existing.rows[0];
    if (!user) {
      const id = newId();
      await query(
        `INSERT INTO users (id, email, password_hash, display_name, photo_url, role) VALUES ($1, $2, NULL, $3, $4, 'user')`,
        [id, email, profile.data.name || email.split('@')[0], profile.data.picture || null],
      );
      user = { id, email, display_name: profile.data.name || email.split('@')[0], photo_url: profile.data.picture || null, role: 'user', created_at: new Date().toISOString() };
    }
    const token = await createSession(user.id);
    res.redirect(`/#google_token=${encodeURIComponent(token)}`);
  } catch (error) {
    console.error('google sign-in error', error);
    res.status(502).send('Google sign-in could not be completed.');
  }
});

router.post('/password-reset/request', async (req, res) => {
  const genericResponse = { message: 'If an account exists for that email, a password reset link will be sent shortly.' };
  const email = normalizeEmail(req.body?.email);
  const requestKey = `${req.ip || 'unknown'}:${email || 'invalid'}`;
  if (!email || !canRequestReset(requestKey)) return res.json(genericResponse);

  try {
    const result = await query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.json(genericResponse);

    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = hashResetToken(rawToken);
    const tokenId = newId();
    const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);
    await query('DELETE FROM password_reset_tokens WHERE user_id = $1 OR expires_at <= NOW()', [result.rows[0].id]);
    await query(
      'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
      [tokenId, result.rows[0].id, tokenHash, expiresAt],
    );

    const baseUrl = process.env.PUBLIC_BASE_URL || process.env.FRONTEND_URL;
    if (baseUrl) {
      const resetUrl = new URL('/reset-password', baseUrl);
      resetUrl.searchParams.set('token', rawToken);
      await sendPasswordResetEmail(email, resetUrl.toString());
    } else {
      console.error('[Auth] Password reset skipped: PUBLIC_BASE_URL or FRONTEND_URL is not configured.');
    }
    return res.json(genericResponse);
  } catch (error) {
    console.error('password reset request error', error);
    return res.json(genericResponse);
  }
});

router.post('/password-reset/complete', async (req, res) => {
  const token = typeof req.body?.token === 'string' ? req.body.token : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!token || token.length < 32 || password.length < 8) {
    return res.status(400).json({ error: 'A valid reset token and a password of at least 8 characters are required.' });
  }

  const tokenHash = hashResetToken(token);
  const client = await (await import('../db')).pool.connect();
  try {
    await client.query('BEGIN');
    const tokenResult = await client.query<{ user_id: string }>(
      'SELECT user_id FROM password_reset_tokens WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW() FOR UPDATE',
      [tokenHash],
    );
    if (tokenResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This reset link is invalid or has expired.' });
    }

    const passwordHash = await hashPassword(password);
    const userId = tokenResult.rows[0].user_id;
    await client.query('UPDATE users SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL WHERE id = $2', [passwordHash, userId]);
    await client.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1', [tokenHash]);
    await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    await client.query('COMMIT');
    return res.json({ message: 'Password updated. Please sign in with your new password.' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('password reset completion error', error);
    return res.status(500).json({ error: 'Unable to reset password right now.' });
  } finally {
    client.release();
  }
});

router.post('/signup', async (req, res) => {
  try {
    const { email, password, displayName } = req.body || {};
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'email, password, and displayName are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const countRes = await query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users');
    const isFirstUser = countRes.rows[0].count === '0';
    const isSpecialAdmin = email.toLowerCase() === (process.env.ADMIN_EMAIL || '').toLowerCase();
    const role = (isFirstUser || isSpecialAdmin) ? 'admin' : 'user';

    const id = newId();
    const hash = await hashPassword(password);
    const photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1d4ed8&color=fff`;

    await query(
      `INSERT INTO users (id, email, password_hash, display_name, photo_url, role)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, email.toLowerCase(), hash, displayName, photoURL, role]
    );

    const token = await createSession(id);
    res.json({
      token,
      user: { id, email: email.toLowerCase(), displayName, photoURL, role, createdAt: new Date().toISOString() },
    });
  } catch (e: any) {
    console.error('signup error', e);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const result = await query<any>(
      'SELECT id, email, password_hash, display_name, photo_url, role, created_at, failed_login_attempts, locked_until FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const u = result.rows[0];

    // Check lockout
    if (u.locked_until && new Date(u.locked_until) > new Date()) {
      const remaining = Math.ceil((new Date(u.locked_until).getTime() - Date.now()) / 60000);
      return res.status(403).json({ error: `Account locked. Please try again in ${remaining} minutes.` });
    }

    const isSpecialAdmin = u.email.toLowerCase() === (process.env.ADMIN_EMAIL || '').toLowerCase();
    const ok = await verifyPassword(password, u.password_hash);
    
    if (!ok) {
      const attempts = u.failed_login_attempts + 1;
      let lockoutMsg = '';
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        await query('UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3', [attempts, lockedUntil, u.id]);
        lockoutMsg = `. Account locked for ${LOCKOUT_MINUTES} minutes.`;
      } else {
        await query('UPDATE users SET failed_login_attempts = $1 WHERE id = $2', [attempts, u.id]);
      }
      return res.status(401).json({ error: `Invalid email or password${lockoutMsg}` });
    }

    // Success - reset attempts
    if (u.failed_login_attempts > 0 || u.locked_until) {
      await query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1', [u.id]);
    }

    let userRole = u.role;
    if (isSpecialAdmin && userRole !== 'admin') {
      userRole = 'admin';
      await query('UPDATE users SET role = $1 WHERE id = $2', ['admin', u.id]);
    }

    // Check device and location for admins
    if (userRole === 'admin') {
      const { latitude, longitude, device } = req.body || {};

      // In development mode, skip device/location verification for testing
      if (process.env.NODE_ENV !== 'production') {
        // Allow admin login without device restrictions in development
      } else {
        if (!latitude || !longitude || !device) {
          return res.status(401).json({ 
            error: 'Admin security verification required. Please allow location access.', 
            requiresAdminVerification: true 
          });
        }

        if (!latitude || !longitude) {
          return res.status(403).json({ error: 'Location is required to login as admin' });
        }

        const ua = String(device || '').toLowerCase();
        const normalizedDevice = ua.replace(/[\s_-]+/g, '');
        // Chrome may expose the model as "SM-E236", "SM E236", "SME236", or "Samsung F23".
        const isSamsungF23 = ua.includes('samsung f23') || ua.includes('sm-e236') || normalizedDevice.includes('sme236');
        if (!isSamsungF23) {
          return res.status(403).json({ error: 'Admin login is restricted to Samsung F23 devices only' });
        }
      }
    }

    const token = await createSession(u.id);
    res.json({
      token,
      user: {
        id: u.id,
        email: u.email,
        displayName: u.display_name,
        photoURL: u.photo_url,
        role: userRole,
        createdAt: u.created_at,
      },
    });
  } catch (e: any) {
    console.error('login error', e);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

router.post('/logout', async (req, res) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    await deleteSession(auth.slice(7));
  }
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const { displayName, photoURL } = req.body || {};
    const updates: string[] = [];
    const params: any[] = [];

    if (displayName) {
      params.push(displayName.trim());
      updates.push(`display_name = $${params.length}`);
    }
    if (photoURL !== undefined) {
      params.push(photoURL);
      updates.push(`photo_url = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No update data provided' });
    }

    params.push(req.user!.id);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length}`, params);

    const result = await query(
      'SELECT id, email, display_name, photo_url, role, created_at FROM users WHERE id = $1',
      [req.user!.id]
    );
    const u = result.rows[0];

    res.json({
      user: {
        id: u.id,
        email: u.email,
        displayName: u.display_name,
        photoURL: u.photo_url,
        role: u.role,
        createdAt: u.created_at,
      },
    });
  } catch (e: any) {
    console.error('profile update error', e);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
