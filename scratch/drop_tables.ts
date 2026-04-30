import { query } from '../server/db';

const tables = [
  'wishlist_items',
  'reviews',
  'orders',
  'sessions',
  'books',
  'users',
  'site_settings'
];

async function drop() {
  for (const table of tables) {
    try {
      console.log(`Dropping table ${table}...`);
      await query(`DROP TABLE IF EXISTS ${table} CASCADE;`);
    } catch (e) {
      console.error(`Error dropping ${table}:`, e.message);
    }
  }
}

drop();
