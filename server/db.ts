import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 50,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  ssl: { rejectUnauthorized: false },
});

// Dedicated Admin Pool: Uses ADMIN_DATABASE_URL if configured for extra isolation
export const adminPool = new Pool({
  connectionString: process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  ssl: { rejectUnauthorized: false },
});

export async function query<T = any>(text: string, params: any[] = []): Promise<{ rows: T[] }> {
  return pool.query(text, params) as any;
}

export async function adminQuery<T = any>(text: string, params: any[] = []): Promise<{ rows: T[] }> {
  return adminPool.query(text, params) as any;
}
