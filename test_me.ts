import { authApi } from './src/lib/api';

async function run() {
  try {
    const res2 = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
    });
    const { token } = await res2.json();

    const res3 = await fetch('http://localhost:5001/api/auth/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    console.log('Me:', await res3.json());
  } catch (e) {
    console.error(e);
  }
}
run();
