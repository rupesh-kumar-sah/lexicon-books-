import { query } from '../server/db';

async function check() {
  const result = await query('SELECT id, customer_name, location_coords FROM orders ORDER BY created_at DESC LIMIT 5');
  console.log('--- Orders Check ---');
  result.rows.forEach(r => {
    console.log(`Order ${r.id} (${r.customer_name}):`);
    console.log(`  location_coords type: ${typeof r.location_coords}`);
    console.log(`  location_coords value:`, JSON.stringify(r.location_coords));
  });
  process.exit(0);
}

check().catch(console.error);
