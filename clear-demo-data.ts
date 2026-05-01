import { query } from './server/db.ts';
import { newId, hashPassword } from './server/auth.ts';

async function main() {
  try {
    console.log('Deleting all demo books and cascading to reviews/wishlist...');
    await query('DELETE FROM books');
    console.log('Books deleted successfully.');

    console.log('Deleting old users except the main admin...');
    await query('DELETE FROM users WHERE email != $1', ['sahkkr702@gmail.com']);
    console.log('Users deleted successfully.');

    const existing = await query('SELECT id FROM users WHERE email = $1', ['sahkkr702@gmail.com']);
    if (existing.rows.length === 0) {
      console.log('Admin user does not exist. Creating admin...');
      const id = newId();
      const hash = await hashPassword('password123');
      const displayName = 'Admin Sahkkr';
      const photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1d4ed8&color=fff`;
      
      await query(
        `INSERT INTO users (id, email, password_hash, display_name, photo_url, role)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, 'sahkkr702@gmail.com', hash, displayName, photoURL, 'admin']
      );
      console.log('Admin user created successfully!');
    } else {
      console.log('Admin user already exists.');
    }
  } catch (e) {
    console.error('Database Error:', e);
  } finally {
    process.exit(0);
  }
}

main();
