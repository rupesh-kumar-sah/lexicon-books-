import fetch from 'node-fetch';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'sahkkr702@gmail.com';
const ADMIN_PASSWORD = 'password123'; // use same as signup test

(async () => {
  // login as admin (must provide device and location)
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      latitude: 27.7,
      longitude: 85.3,
      device: 'Samsung F23'
    })
  });
  const loginData = await loginRes.json();
  console.log('Login status', loginRes.status);
  console.log(loginData);
  if (!loginData.token) {
    console.error('Login failed, abort');
    return;
  }
  const adminToken = loginData.token;
  // fetch admin stats
  const statsRes = await fetch('http://localhost:5000/api/admin/stats', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'x-admin-security-token': process.env.VITE_ADMIN_PATH || '/admin-dashboard-secret-2063'
    }
  });
  const stats = await statsRes.json();
  console.log('Admin stats status', statsRes.status);
  console.log(stats);
})();
