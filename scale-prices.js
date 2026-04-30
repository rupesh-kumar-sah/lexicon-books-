import { query } from './server/db.js';

async function main() {
  try {
    const res = await query('UPDATE books SET price = price * 100 WHERE price < 100');
    console.log(`Updated ${res.rowCount || 0} books to NPR pricing scale.`);
  } catch(e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}
main();
