import { query } from './server/db.ts';

async function main() {
  try {
    const res = await query('UPDATE books SET price = price * 100 WHERE price < 100');
    console.log(`Updated books to NPR pricing scale.`);
  } catch(e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}
main();
