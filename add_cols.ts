import { query } from './server/db.ts';

async function addCols() {
  try {
    await query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS shipping_ktm NUMERIC(10,2) NOT NULL DEFAULT 100`);
    await query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS shipping_outside NUMERIC(10,2) NOT NULL DEFAULT 150`);
    await query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS free_shipping_threshold NUMERIC(10,2) NOT NULL DEFAULT 5000`);
    console.log('Columns added to site_settings');
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
addCols();
