import { Router, Request, Response, NextFunction } from 'express';
import { hashPassword, verifyPassword, newToken } from '../auth';
import { query } from '../db';
import crypto from 'crypto';

const router = Router();

interface AdminPortalSession {
  token: string;
  email: string;
  pin: string;
  expiresAt: Date;
}

// In-memory store for admin portal sessions (in production, use Redis)
const adminSessions = new Map<string, AdminPortalSession>();

// ===========================================================
// FIREWALL MIDDLEWARE: Validate admin portal access
// ===========================================================
function validateAdminPortalAccess(req: Request, res: Response, next: NextFunction) {
  const secretPath = process.env.ADMIN_SECRET_PATH || 'admin-dashboard-secret-2063';
  const pathArray = req.path.split('/');
  
  if (!pathArray.includes(secretPath)) {
    return res.status(403).json({ error: 'Security Firewall: Invalid Access Path' });
  }
  
  next();
}

// ===========================================================
// LOGIN: Authenticate admin with email, password, and PIN
// ===========================================================
router.post('/login', validateAdminPortalAccess, async (req: Request, res: Response) => {
  try {
    const { email, password, pin } = req.body;
    
    // Validate input
    if (!email || !password || !pin) {
      return res.status(400).json({ error: 'Email, password, and PIN are required' });
    }

    // Check credentials against environment variables
    const envEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
    const envPin = process.env.ADMIN_PIN || '2063';
    const correctEmail = email.toLowerCase() === envEmail;
    const correctPin = pin === envPin;

    if (!correctEmail || !correctPin) {
      // Log failed attempts (but don't expose which field failed)
      console.warn(`[SECURITY] Failed admin login attempt from ${req.ip} - Invalid credentials`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password with bcrypt
    const passwordHash = process.env.ADMIN_HASHED_PASSWORD || '';
    let passwordValid = false;
    
    try {
      passwordValid = await verifyPassword(password, passwordHash);
    } catch {
      // If password verification fails, reject login
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!passwordValid) {
      console.warn(`[SECURITY] Failed admin login attempt from ${req.ip} - Invalid password`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate secure session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store session
    adminSessions.set(sessionToken, {
      token: sessionToken,
      email,
      pin,
      expiresAt,
    });

    // Log successful login
    console.info(`[AUDIT] Admin login successful for ${email} from ${req.ip}`);

    res.json({
      token: sessionToken,
      message: 'Admin portal access granted',
    });
  } catch (err) {
    console.error('[SECURITY] Admin login error:', err);
    res.status(500).json({ error: 'Authentication service error' });
  }
});

// ===========================================================
// VERIFY: Check if admin session token is valid
// ===========================================================
router.get('/verify', validateAdminPortalAccess, (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const session = adminSessions.get(token);
    
    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    res.json({
      authenticated: true,
      email: session.email,
      expiresAt: session.expiresAt,
    });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ===========================================================
// LOGOUT: Invalidate admin session
// ===========================================================
router.post('/logout', validateAdminPortalAccess, (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      adminSessions.delete(token);
      console.info(`[AUDIT] Admin logout for token ${token?.slice(0, 8)}...`);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ===========================================================
// SESSION CLEANUP: Remove expired sessions every hour
// ===========================================================
setInterval(() => {
  const now = new Date();
  for (const [token, session] of adminSessions.entries()) {
    if (session.expiresAt < now) {
      adminSessions.delete(token);
    }
  }
}, 60 * 60 * 1000);

export default router;
