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

// Wrap pool.query with automatic retry for transient network/DNS errors (e.g. ENOTFOUND, ECONNRESET, socket drops)
const rawQuery = pool.query.bind(pool);
(pool as any).query = async function (text: any, params?: any, callback?: any) {
  if (typeof params === 'function' || typeof callback === 'function') {
    return (rawQuery as any)(text, params, callback);
  }

  let attempts = 0;
  while (attempts < 2) {
    try {
      return await rawQuery(text, params);
    } catch (err: any) {
      attempts++;
      const isTransient =
        err?.code === 'ENOTFOUND' ||
        err?.code === 'ECONNRESET' ||
        err?.code === 'ETIMEDOUT' ||
        err?.message?.includes('Connection terminated') ||
        err?.message?.includes('timeout');

      if (isTransient && attempts < 2) {
        console.warn(`[pg pool] Transient DB error (${err.code || err.message}). Retrying query in 500ms... (attempt ${attempts})`);
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
      throw err;
    }
  }
};

// A generic query helper function (delegates to resilient pool.query)
export const query = async (text: string, params?: any[]) => {
  return pool.query(text, params);
};

// Keep generateId for backwards compatibility and easy uuid generation
export const generateId = () => {
  return uuidv4();
};
