import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 30000, // How long to wait when connecting to a new client
  ssl: {
    rejectUnauthorized: false, // Required for some hosted Postgres providers like Neon
  },
});

export async function query<T = any>(text: string, params: any[] = []): Promise<{ rows: T[] }> {
  return pool.query(text, params) as any;
}
