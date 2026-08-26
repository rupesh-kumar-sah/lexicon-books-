const keys = ['OPENWA_ENABLED', 'OPENWA_BASE_URL', 'OPENWA_API_KEY', 'OPENWA_SESSION_ID', 'OPENWA_ADMIN_RECIPIENT'] as const;
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
const originalDatabaseUrl = process.env.DATABASE_URL;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

try {
  // The adapter imports the shared database client, but this readiness-only test never
  // issues a query. A placeholder prevents module initialization from requiring a real DB.
  if (!process.env.DATABASE_URL) process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';
  const { openWaIntegrationStatus } = await import('../server/integrations/openwa');

  for (const key of keys) delete process.env[key];
  const disabled = openWaIntegrationStatus();
  assert(disabled.configured === false && disabled.enabled === false, 'OpenWA must be disabled when no gateway configuration exists.');

  process.env.OPENWA_ENABLED = 'true';
  process.env.OPENWA_BASE_URL = 'https://gateway.example.test/api';
  process.env.OPENWA_API_KEY = 'test-key';
  process.env.OPENWA_SESSION_ID = 'session-test';
  process.env.OPENWA_ADMIN_RECIPIENT = '9812345678';
  const enabled = openWaIntegrationStatus();
  assert(enabled.configured === true, 'OpenWA should report configured only when enabled and complete.');
  assert(enabled.senderSessionConfigured === true && enabled.adminRecipientConfigured === true, 'OpenWA readiness details are incorrect.');

  console.log('OPENWA CONFIGURATION SAFEGUARD TEST PASSED');
} finally {
  for (const key of keys) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
}
