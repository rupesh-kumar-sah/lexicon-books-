import { query } from '../server/db';

async function run() {
  await query("UPDATE site_settings SET footer_text_2 = 'Premium Quality' WHERE footer_text_2 = '30-Day Easy Returns'");
  console.log('Updated footer text.');
  process.exit(0);
}

run();
