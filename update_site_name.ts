import { query } from './server/db.ts';

async function updateDb() {
  await query("UPDATE site_settings SET site_name = 'BookSellNP'");
  console.log('Site name updated in DB');
  process.exit(0);
}
updateDb();
