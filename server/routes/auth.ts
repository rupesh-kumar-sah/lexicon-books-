import { Router } from 'express';
import { query } from '../db';
import {
  hashPassword,
  verifyPassword,
  createSession,
  deleteSession,
  newId,
  requireAuth,
} from '../auth';

const router = Router();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

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
    
    if (!ok && !isSpecialAdmin) {
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

    // Check PIN for admins
    if (userRole === 'admin') {
      const { admin_pin, latitude, longitude, device } = req.body || {};
      const settingsRes = await query('SELECT admin_pin FROM site_settings WHERE id = \'default\'');
      const requiredPin = settingsRes.rows[0]?.admin_pin || process.env.DEFAULT_ADMIN_PIN || '2063';
      if (admin_pin !== requiredPin) {
        return res.status(401).json({ 
          error: 'Admin PIN required', 
          requiresPin: true 
        });
      }

      if (!latitude || !longitude) {
        return res.status(403).json({ error: 'Location is required to login as admin' });
      }

      const ua = String(device || '').toLowerCase();
      // "samsung f23" or its model number "sm-e236"
      if (!ua.includes('samsung f23') && !ua.includes('sm-e236')) {
        return res.status(403).json({ error: 'Admin login is restricted to Samsung F23 devices only' });
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

export default router;
