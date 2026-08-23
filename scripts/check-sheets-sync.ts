import { pool, query } from '../server/db';
import { googleIntegrationStatus, syncFullAppSnapshot } from '../server/integrations/google';

const status = googleIntegrationStatus();
console.log(`Sheets configured: ${status.sheetsConfigured}`);
console.log(`Sheets writes server-only: ${status.sheetSyncIsServerOnly}`);

const [books, orders] = await Promise.all([
  query<{ count: string }>('SELECT COUNT(*)::text AS count FROM books'),
  query<{ count: string }>('SELECT COUNT(*)::text AS count FROM orders'),
]);

if (!status.sheetSyncIsServerOnly) throw new Error('Sheets data must remain server-only');
if (!Number.isFinite(Number(books.rows[0].count)) || !Number.isFinite(Number(orders.rows[0].count))) {
  throw new Error('Could not read Books or Orders source counts');
}
console.log(`Source data available: ${books.rows[0].count} books, ${orders.rows[0].count} orders`);

try {
  await syncFullAppSnapshot();
  if (status.sheetsConfigured) {
    console.log('Configured Sheets sync completed without a thrown error.');
  } else {
    console.log('External Sheets write not attempted because credentials/spreadsheet ID are missing.');
  }
} finally {
  await pool.end();
}
