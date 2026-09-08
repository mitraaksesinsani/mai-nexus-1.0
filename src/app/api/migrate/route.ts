import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check and add po_id
    const colCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'delivery_orders'
    `);
    const cols = colCheck.rows.map(r => r.column_name);

    if (!cols.includes('po_id')) {
      await client.query('ALTER TABLE delivery_orders ADD COLUMN po_id UUID');
    }
    if (!cols.includes('origin_lat')) {
      await client.query('ALTER TABLE delivery_orders ADD COLUMN origin_lat NUMERIC(10, 8)');
    }
    if (!cols.includes('origin_lng')) {
      await client.query('ALTER TABLE delivery_orders ADD COLUMN origin_lng NUMERIC(11, 8)');
    }
    if (!cols.includes('evidence')) {
      await client.query('ALTER TABLE delivery_orders ADD COLUMN evidence TEXT');
    }

    // Material masters packaging_type
    const matColCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'material_masters'
    `);
    const matCols = matColCheck.rows.map(r => r.column_name);
    if (!matCols.includes('packaging_type')) {
      await client.query(`
        ALTER TABLE material_masters 
        ADD COLUMN packaging_type VARCHAR(50) DEFAULT 'NON_PACKAGING'
      `);
      await client.query(`
        UPDATE material_masters SET packaging_type = 'KABEL_UDARA'
        WHERE material_code LIKE 'AC-OF%' OR LOWER(material_name) LIKE '%kabel udara%';
        UPDATE material_masters SET packaging_type = 'KABEL_TANAH'
        WHERE material_code LIKE 'DC-OF%' OR LOWER(material_name) LIKE '%kabel duct%' OR LOWER(material_name) LIKE '%kabel tanah%';
        UPDATE material_masters SET packaging_type = 'HDPE_SUBDUCT'
        WHERE material_code LIKE '%-SD-%' OR LOWER(material_name) LIKE '%subduct%' OR LOWER(material_name) LIKE '%hdpe%';
        UPDATE material_masters SET packaging_type = 'NON_PACKAGING' WHERE packaging_type IS NULL;
      `);
    }

    // Inventory transactions created_by & created_by_name
    const txColCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'inventory_transactions'
    `);
    const txCols = txColCheck.rows.map(r => r.column_name);
    if (!txCols.includes('created_by')) {
      await client.query('ALTER TABLE inventory_transactions ADD COLUMN created_by UUID');
    }
    if (!txCols.includes('created_by_name')) {
      await client.query('ALTER TABLE inventory_transactions ADD COLUMN created_by_name VARCHAR(255)');
      await client.query(`
        UPDATE inventory_transactions t
        SET created_by_name = COALESCE(w.pic_name, 'Admin')
        FROM warehouses w
        WHERE t.warehouse_id = w.id AND (t.created_by_name IS NULL OR t.created_by_name = '')
      `);
    }

    await client.query('COMMIT');
    return NextResponse.json({ message: 'Migration successful!' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
