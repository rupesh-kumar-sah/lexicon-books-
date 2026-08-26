import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

function boundedPoolSize(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.max(1, Math.min(20, parsed));
}

const primaryPoolSize = boundedPoolSize(process.env.DATABASE_POOL_MAX, 10);
const adminPoolSize = boundedPoolSize(process.env.ADMIN_DATABASE_POOL_MAX, 4);
const poolOptions = {
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  keepAlive: true,
  ssl: { rejectUnauthorized: false },
};

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: primaryPoolSize,
  ...poolOptions,
});

// Reuse the primary pool unless the administrator is intentionally isolated on a different database.
export const adminPool = process.env.ADMIN_DATABASE_URL && process.env.ADMIN_DATABASE_URL !== process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.ADMIN_DATABASE_URL, max: adminPoolSize, ...poolOptions })
  : pool;

export async function query<T = any>(text: string, params: any[] = []): Promise<{ rows: T[] }> {
  return pool.query(text, params) as any;
}

export async function adminQuery<T = any>(text: string, params: any[] = []): Promise<{ rows: T[] }> {
  return adminPool.query(text, params) as any;
}
