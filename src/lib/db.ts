import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

const globalForPg = global as unknown as { pool: Pool };

export const pool =
  globalForPg.pool ||
  new Pool({
    connectionString: process.env.DATABASE_URL?.replace(/"/g, ''), // Strip quotes just in case
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 15000,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });

// Handle unexpected errors on idle pool clients so they are removed cleanly without crashing
pool.on('error', (err) => {
  console.error('[pg pool] Unexpected error on idle client (auto-recovering):', err.message);
});

if (process.env.NODE_ENV !== 'production') globalForPg.pool = pool;

// A generic query helper function
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    return res;
  } catch (err: any) {
    if (err?.message?.includes('Connection terminated') || err?.message?.includes('timeout')) {
      console.warn('[pg pool] Terminated socket detected, retrying query once...');
      return await pool.query(text, params);
    }
    throw err;
  }
};

// Keep generateId for backwards compatibility and easy uuid generation
export const generateId = () => {
  return uuidv4();
};
