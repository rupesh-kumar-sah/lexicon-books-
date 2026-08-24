import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { pool, query } from './db';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface SessionTokens {
  token: string;
  refreshToken: string;
}

const SESSION_DAYS = 30;
const ACCESS_TOKEN_MINUTES = 10;
const REFRESH_TOKEN_DAYS = 30;
const JWT_ISSUER = 'lexicon-books';
const REFRESH_COOKIE = 'lexicon_refresh';

function jwtSecret() {
  return process.env.JWT_SECRET || 'change-me-before-production';
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) return Promise.resolve(false);
  return bcrypt.compare(plain, hash);
}

export function newToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function newId(): string {
  return crypto.randomBytes(12).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function accessTokenFor(user: AuthUser): string {
  return jwt.sign(
    { type: 'access', role: user.role },
    jwtSecret(),
    { subject: user.id, issuer: JWT_ISSUER, expiresIn: `${ACCESS_TOKEN_MINUTES}m` },
  );
}

async function userById(userId: string): Promise<AuthUser | null> {
  const result = await query<any>(
    'SELECT id, email, display_name, photo_url, role, created_at FROM users WHERE id = $1',
    [userId],
  );
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  const isSpecialAdmin = r.email.toLowerCase() === (process.env.ADMIN_EMAIL || '').toLowerCase();
  let role = r.role as 'admin' | 'user';
  if (isSpecialAdmin && role !== 'admin') {
    role = 'admin';
    await query('UPDATE users SET role = $1 WHERE id = $2', ['admin', r.id]);
  }
  return {
    id: r.id,
    email: r.email,
    displayName: r.display_name,
    photoURL: r.photo_url,
    role,
    createdAt: r.created_at,
  };
}

export async function createSessionPair(userId: string): Promise<SessionTokens> {
  const user = await userById(userId);
  if (!user) throw new Error('User not found');
  const refreshToken = newToken();
  const familyId = newId();
  const refreshId = newId();
  const expires = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO auth_refresh_tokens (id, user_id, family_id, token_hash, expires_at) VALUES ($1, $2, $3, $4, $5)',
    [refreshId, userId, familyId, hashToken(refreshToken), expires],
  );
  return { token: accessTokenFor(user), refreshToken };
}

// Legacy-compatible helper for code that still expects a single session token.
export async function createSession(userId: string): Promise<string> {
  const pair = await createSessionPair(userId);
  return pair.token;
}

export async function rotateRefreshToken(rawRefreshToken: string): Promise<SessionTokens> {
  const tokenHash = hashToken(rawRefreshToken);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<any>(
      `SELECT r.id, r.user_id, r.family_id, r.expires_at, r.used_at, r.revoked_at,
              u.id AS uid, u.email, u.display_name, u.photo_url, u.role, u.created_at
         FROM auth_refresh_tokens r
         JOIN users u ON u.id = r.user_id
        WHERE r.token_hash = $1
        FOR UPDATE`,
      [tokenHash],
    );
    const row = result.rows[0];
    if (!row) {
      await client.query('ROLLBACK');
      throw new Error('Invalid refresh token');
    }
    if (row.used_at || row.revoked_at || new Date(row.expires_at) <= new Date()) {
      await client.query('UPDATE auth_refresh_tokens SET revoked_at = COALESCE(revoked_at, NOW()) WHERE family_id = $1', [row.family_id]);
      await client.query('COMMIT');
      throw new Error('Refresh token reuse or expiry detected');
    }

    await client.query('UPDATE auth_refresh_tokens SET used_at = NOW() WHERE id = $1', [row.id]);
    const nextRefreshToken = newToken();
    const nextRefreshId = newId();
    const nextExpiry = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
    await client.query(
      'INSERT INTO auth_refresh_tokens (id, user_id, family_id, token_hash, parent_id, expires_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [nextRefreshId, row.user_id, row.family_id, hashToken(nextRefreshToken), row.id, nextExpiry],
    );
    const user: AuthUser = {
      id: row.uid,
      email: row.email,
      displayName: row.display_name,
      photoURL: row.photo_url,
      role: row.role,
      createdAt: row.created_at,
    };
    const accessToken = accessTokenFor(user);
    await client.query('COMMIT');
    return { token: accessToken, refreshToken: nextRefreshToken };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth' });
}

export function refreshTokenFromRequest(req: Request): string | undefined {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${REFRESH_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(REFRESH_COOKIE.length + 1)) : undefined;
}

export async function revokeRefreshToken(rawRefreshToken: string): Promise<void> {
  await query('UPDATE auth_refresh_tokens SET revoked_at = COALESCE(revoked_at, NOW()) WHERE token_hash = $1', [hashToken(rawRefreshToken)]);
}

export async function deleteSession(token: string): Promise<void> {
  await query('DELETE FROM sessions WHERE token = $1', [token]);
}

async function getUserFromJwt(token: string): Promise<AuthUser | null> {
  const payload = jwt.verify(token, jwtSecret(), { issuer: JWT_ISSUER }) as JwtPayload;
  if (payload.type !== 'access' || typeof payload.sub !== 'string') return null;
  return userById(payload.sub);
}

export async function getUserFromToken(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null;
  try {
    const user = await getUserFromJwt(token);
    if (user) return user;
  } catch {
    // Fall back to the legacy database session during migration.
  }
  const result = await query<any>(
    `SELECT u.id, u.email, u.display_name, u.photo_url, u.role, u.created_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [token],
  );
  if (result.rows.length === 0) return null;
  return userById(result.rows[0].id);
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
  } catch {
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
