import { neon, neonConfig } from '@neondatabase/serverless';

neonConfig.fetchConnectionCache = true;

const connectionString = process.env.NEON_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'NEON_DATABASE_URL is not set. Add it to your Replit secrets.'
  );
}

export const sql = neon(connectionString);
