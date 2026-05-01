import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from './db';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: 'admin' | 'user';
  createdAt: string;
}

const SESSION_DAYS = 30;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function newToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function newId(): string {
  return crypto.randomBytes(12).toString('hex');
}

export async function createSession(userId: string): Promise<string> {
  const token = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)',
    [token, userId, expires]
  );
  return token;
}

export async function deleteSession(token: string): Promise<void> {
  await query('DELETE FROM sessions WHERE token = $1', [token]);
}

export async function getUserFromToken(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null;
  const result = await query<any>(
    `SELECT u.id, u.email, u.display_name, u.photo_url, u.role, u.created_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [token]
  );
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  let userRole = r.role;
  const isSpecialAdmin = r.email.toLowerCase() === (process.env.ADMIN_EMAIL || '').toLowerCase();
  if (isSpecialAdmin && userRole !== 'admin') {
    userRole = 'admin';
    await query('UPDATE users SET role = $1 WHERE id = $2', ['admin', r.id]);
  }

  return {
    id: r.id,
    email: r.email,
    displayName: r.display_name,
    photoURL: r.photo_url,
    role: userRole,
    createdAt: r.created_at,
  };
}

function tokenFromReq(req: Request): string | undefined {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return undefined;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser | null;
    }
  }
}

export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  try {
    req.user = await getUserFromToken(tokenFromReq(req));
  } catch (e) {
    req.user = null;
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}
