import { NextResponse } from 'next/server';
import { pool, generateId } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const client = await pool.connect();
  
  try {
    const user = getUserFromRequest(request as any);
    const body = await request.json();
    const { rfcId, warehouseId, items } = body;

    if (!rfcId || !warehouseId || !items || !items.length) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    await client.query('BEGIN');

    // 1. Verify RFC exists
    const rfcRes = await client.query('SELECT * FROM rfcs WHERE id = $1', [rfcId]);
    if (rfcRes.rows.length === 0) {
      throw new Error('RFC not found');
    }

    // Resolve creator name
    let creatorName = user?.name || null;
    let creatorId = user?.sub || null;
    if (!creatorName) {
      const whRes = await client.query('SELECT pic_name FROM warehouses WHERE id = $1', [warehouseId]);
      creatorName = whRes.rowCount && whRes.rows[0].pic_name ? whRes.rows[0].pic_name : 'Admin';
    }

    // 2. Process each issued item
    for (const item of items) {
      if (!item.materialId || !item.issuedQty || item.issuedQty <= 0) continue;
      
      const qty = parseInt(item.issuedQty, 10);

      // Check if stock exists in warehouse for this material
      const stockRes = await client.query(`
        SELECT id, quantity FROM inventory_stocks 
        WHERE warehouse_id = $1 AND material_id = $2
      `, [warehouseId, item.materialId]);

      if (stockRes.rows.length === 0 || stockRes.rows[0].quantity < qty) {
        throw new Error(`Insufficient stock for material ${item.materialId} in the selected warehouse.`);
      }

      // Update existing stock (deduct)
      await client.query(`
        UPDATE inventory_stocks 
        SET quantity = quantity - $1, last_updated = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [qty, stockRes.rows[0].id]);

      // Record the transaction history
      const txId = generateId();
      await client.query(`
        INSERT INTO inventory_transactions 
        (id, warehouse_id, material_id, transaction_type, quantity, reference_id, notes, created_by, created_by_name)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [txId, warehouseId, item.materialId, 'RFC_ISSUE', -qty, rfcId, 'Issued for RFC', creatorId, creatorName]);
    }

    // 3. Update RFC status to COMPLETED
    await client.query(`
      UPDATE rfcs 
      SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [rfcId]);

    await client.query('COMMIT');

    return NextResponse.json({ message: 'Materials issued successfully' }, { status: 200 });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error in material issue:', error);
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
