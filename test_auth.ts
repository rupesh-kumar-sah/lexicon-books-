import { authApi } from './src/lib/api';

async function run() {
  try {
    const res = await fetch('http://localhost:5001/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123', displayName: 'Test User' })
    });
    console.log('Signup:', await res.json());

    const res2 = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
    });
    console.log('Login:', await res2.json());
  } catch (e) {
    console.error(e);
  }
}
run();
