import { NextResponse } from 'next/server';
import { pool, generateId } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const client = await pool.connect();
  
  try {
    const user = getUserFromRequest(request as any);
    const body = await request.json();
    const { doId, warehouseId, items } = body;

    if (!doId || !warehouseId || !items || !items.length) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    await client.query('BEGIN');

    // 1. Verify DO exists
    const doRes = await client.query('SELECT * FROM delivery_orders WHERE id = $1', [doId]);
    if (doRes.rows.length === 0) {
      throw new Error('Delivery Order not found');
    }

    // Resolve creator name
    let creatorName = user?.name || null;
    let creatorId = user?.sub || null;
    if (!creatorName) {
      const whRes = await client.query('SELECT pic_name FROM warehouses WHERE id = $1', [warehouseId]);
      creatorName = whRes.rowCount && whRes.rows[0].pic_name ? whRes.rows[0].pic_name : 'Admin';
    }

    // 2. Process each received item
    for (const item of items) {
      if (!item.materialId || !item.receivedQty || item.receivedQty <= 0) continue;
      
      const qty = parseInt(item.receivedQty, 10);

      // Check if stock exists in warehouse for this material
      const stockRes = await client.query(`
        SELECT id, quantity FROM inventory_stocks 
        WHERE warehouse_id = $1 AND material_id = $2
      `, [warehouseId, item.materialId]);

      if (stockRes.rows.length > 0) {
        // Update existing stock
        await client.query(`
          UPDATE inventory_stocks 
          SET quantity = quantity + $1, last_updated = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [qty, stockRes.rows[0].id]);
      } else {
        // Create new stock entry
        const stockId = generateId();
        await client.query(`
          INSERT INTO inventory_stocks (id, warehouse_id, material_id, quantity)
          VALUES ($1, $2, $3, $4)
        `, [stockId, warehouseId, item.materialId, qty]);
      }

      // Record the transaction history
      const txId = generateId();
      await client.query(`
        INSERT INTO inventory_transactions 
        (id, warehouse_id, material_id, transaction_type, quantity, reference_id, notes, created_by, created_by_name)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [txId, warehouseId, item.materialId, 'DO_RECEIPT', qty, doId, 'Received from DO', creatorId, creatorName]);
    }

    // 3. Update DO status to COMPLETED
    await client.query(`
      UPDATE delivery_orders 
      SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [doId]);

    await client.query('COMMIT');

    return NextResponse.json({ message: 'Goods received successfully' }, { status: 200 });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error in goods receipt:', error);
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
