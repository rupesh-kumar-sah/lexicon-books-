import fetch from 'node-fetch';

(async () => {
  const res = await fetch('http://localhost:5000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test2@example.com', password: 'password123', displayName: 'Test2' })
  });
  const data = await res.json();
  console.log('Status', res.status);
  console.log(data);
})();
