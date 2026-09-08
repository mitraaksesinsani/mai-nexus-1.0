import { NextResponse } from 'next/server';
import { pool, generateId } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = getUserFromRequest(request as any);
    const { poId, warehouseId, doNumber, evidencePhotoUrl } = await request.json();

    if (!poId || !warehouseId) {
      return NextResponse.json({ message: 'poId and warehouseId are required' }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Resolve creator name
      let creatorName = user?.name || null;
      let creatorId = user?.sub || null;
      if (!creatorName) {
        const whRes = await client.query('SELECT pic_name FROM warehouses WHERE id = $1', [warehouseId]);
        creatorName = whRes.rowCount && whRes.rows[0].pic_name ? whRes.rows[0].pic_name : 'Admin';
      }

      // 1. Fetch PO Items
      const poItemsRes = await client.query(
        'SELECT material_id, quantity FROM purchase_order_items WHERE purchase_order_id = $1',
        [poId]
      );

      const items = poItemsRes.rows;
      if (items.length === 0) {
        throw new Error('No items found in this PO');
      }

      // 2. Process each item (Upsert stock & log transaction)
      for (const item of items) {
        const { material_id, quantity } = item;

        // Upsert into inventory_stocks
        const stockId = generateId();
        await client.query(`
          INSERT INTO inventory_stocks (id, warehouse_id, material_id, quantity)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (warehouse_id, material_id)
          DO UPDATE SET 
            quantity = inventory_stocks.quantity + EXCLUDED.quantity,
            last_updated = CURRENT_TIMESTAMP
        `, [stockId, warehouseId, material_id, quantity]);

        // Insert into inventory_transactions
        const txId = generateId();
        await client.query(`
          INSERT INTO inventory_transactions (id, warehouse_id, material_id, transaction_type, quantity, reference_id, notes, do_number, evidence_photo_url, created_by, created_by_name)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [txId, warehouseId, material_id, 'IN_PO_RECEIPT', quantity, poId, 'Received from PO', doNumber || null, evidencePhotoUrl || null, creatorId, creatorName]);
      }

      // 3. Update PO status
      await client.query(
        'UPDATE purchase_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['COMPLETED', poId]
      );

      await client.query('COMMIT');
      return NextResponse.json({ message: 'Goods Receipt processed successfully' }, { status: 200 });
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Goods receipt error:', error);
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 });
  }
}
