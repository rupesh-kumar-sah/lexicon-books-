import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 15000, // 15 seconds
  ssl: {
    rejectUnauthorized: false,
  },
});

async function main() {
  try {
    console.log('Connecting to database...');
    // We multiply existing prices by 100 to convert to typical NPR scale (e.g. 24.5 -> 2450)
    // Only update prices that are low (which means they are still in USD)
    const result = await pool.query('UPDATE books SET price = price * 100 WHERE price < 150 RETURNING id');
    console.log(`Successfully updated ${result.rowCount} books to NPR pricing.`);
  } catch (error) {
    console.error('Error updating books:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();
