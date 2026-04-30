import { query } from '../server/db';

async function check() {
  const email = 'sahkkr702@gmail.com';
  try {
    const result = await query('SELECT email, role FROM users WHERE email = $1', [email]);
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (e) {
    console.error(e);
  }
}

check();
