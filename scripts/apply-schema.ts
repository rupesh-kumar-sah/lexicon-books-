import { ensureSchema } from '../server/schema';
import { pool, adminPool } from '../server/db';

try {
  await ensureSchema();
  console.log('SCHEMA AND INDEXES APPLIED');
} finally {
  await Promise.all([pool.end(), adminPool.end()]);
}
