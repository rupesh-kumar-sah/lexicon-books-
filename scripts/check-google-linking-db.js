import pg from 'pg';

const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  const result = await client.query("SELECT COUNT(*)::int AS count FROM users WHERE password_hash IS NULL");
  if (result.rows[0].count !== 0) {
    console.error('Unexpected provider-only account exists in test database:', result.rows[0].count);
    process.exitCode = 1;
  } else {
    console.log('no unintended provider-only account was created');
  }
} finally {
  await client.end().catch(() => undefined);
}
