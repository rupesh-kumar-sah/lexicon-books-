import { pool, query } from '../server/db';
import { seedIfEmpty } from '../server/seed';

async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_STAGING_RESET !== 'true') {
    throw new Error('Refusing reset: set NODE_ENV=development and ALLOW_STAGING_RESET=true for staging only.');
  }
  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
  if (!adminEmail) throw new Error('ADMIN_EMAIL must be configured.');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM sessions');
    await client.query('DELETE FROM reviews');
    await client.query('DELETE FROM wishlist_items');
    await client.query('DELETE FROM orders');
    await client.query('DELETE FROM users WHERE LOWER(email) <> $1', [adminEmail]);
    await client.query('DELETE FROM books');
    await client.query('COMMIT');
    console.log('[staging reset] Cleared demo books, orders, customers, reviews, wishlists, and sessions. Admin preserved.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  await seedIfEmpty();
  const [books, users, orders] = await Promise.all([
    query<{ count: string }>('SELECT COUNT(*)::text AS count FROM books'),
    query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users'),
    query<{ count: string }>('SELECT COUNT(*)::text AS count FROM orders'),
  ]);
  console.log(`[staging reset] Fresh state: ${books.rows[0].count} books, ${users.rows[0].count} users, ${orders.rows[0].count} orders.`);
  await pool.end();
}

main().catch((error) => {
  console.error('[staging reset] failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
