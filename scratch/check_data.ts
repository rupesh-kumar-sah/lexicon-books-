import { query } from '../server/db';

async function check() {
  try {
    const res = await query("SELECT COUNT(*) FROM users;");
    console.log("Users count:", res.rows[0].count);
  } catch (e) {
    console.error("Error checking users count:", e.message);
  }
}

check();
