import { pool, query } from '../server/db';

try {
  const [extensions, indexes, tables, plans] = await Promise.all([
    query<any>(`SELECT extname FROM pg_extension WHERE extname IN ('pg_trgm', 'btree_gin') ORDER BY extname`),
    query<any>(`SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname`),
    query<any>(`SELECT relname AS table_name, n_live_tup, pg_size_pretty(pg_total_relation_size(relid)) AS total_size FROM pg_stat_user_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(relid) DESC`),
    query<any>(`EXPLAIN (FORMAT JSON) SELECT id, title, author, price, cover_image, isbn, genre, stock, rating, year, featured, created_at FROM books WHERE LOWER(title) LIKE $1 OR LOWER(author) LIKE $1 OR LOWER(isbn) LIKE $1 ORDER BY created_at DESC LIMIT 50`, ['%test%']),
  ]);
  console.log(JSON.stringify({ extensions: extensions.rows, indexes: indexes.rows, tables: tables.rows, bookSearchPlan: plans.rows[0] }, null, 2));
} finally {
  await pool.end();
}
