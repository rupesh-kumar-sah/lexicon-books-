import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 50, // Increased for better concurrency
  idleTimeoutMillis: 60000, // Keep connections alive for 60s
  connectionTimeoutMillis: 10000, // Faster timeout
  keepAlive: true, // Crucial for maintaining ready connections
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function query<T = any>(text: string, params: any[] = []): Promise<{ rows: T[] }> {
  return pool.query(text, params) as any;
}
