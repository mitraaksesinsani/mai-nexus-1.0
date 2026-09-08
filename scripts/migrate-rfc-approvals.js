const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL?.replace(/"/g, ''),
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Tambah kolom current_step_order ke consumption_requests jika belum ada
    await client.query(`
      ALTER TABLE consumption_requests 
      ADD COLUMN IF NOT EXISTS current_step_order INTEGER DEFAULT 1;
    `);

    // 2. Buat tabel consumption_request_approvals
    await client.query(`
      CREATE TABLE IF NOT EXISTS consumption_request_approvals (
        id UUID PRIMARY KEY,
        consumption_request_id UUID REFERENCES consumption_requests(id) ON DELETE CASCADE,
        step_order INTEGER NOT NULL,
        step_name VARCHAR(100) NOT NULL,
        approver_id UUID REFERENCES users(id),
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        notes TEXT,
        action_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Tambahkan index untuk performa
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cra_cr_id ON consumption_request_approvals(consumption_request_id);
      CREATE INDEX IF NOT EXISTS idx_cra_approver ON consumption_request_approvals(approver_id);
    `);

    await client.query('COMMIT');
    console.log('Migration successfully executed!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
