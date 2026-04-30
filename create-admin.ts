import { query } from './server/db.ts';
import { newId, hashPassword } from './server/auth.ts';

async function main() {
  try {
    const email = 'sahkkr702@gmail.com';
    const password = 'password123'; // Temporary password
    const displayName = 'Admin Sahkkr';
    
    console.log('Checking for user...');
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (existing.rows.length > 0) {
      console.log('User already exists! Resetting password to password123...');
      const hash = await hashPassword(password);
      await query('UPDATE users SET password_hash = $1, role = $2 WHERE email = $3', [hash, 'admin', email]);
      console.log('Password reset successfully.');
    } else {
      console.log('User does not exist. Creating permanent admin user...');
      const id = newId();
      const hash = await hashPassword(password);
      const photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1d4ed8&color=fff`;
      
      await query(
        `INSERT INTO users (id, email, password_hash, display_name, photo_url, role)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, email, hash, displayName, photoURL, 'admin']
      );
      console.log('Admin user created successfully!');
    }
  } catch(e) {
    console.error('Database Error:', e);
  } finally {
    process.exit(0);
  }
}

main();
