import { NextResponse } from 'next/server';
import { pool, generateId } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = getUserFromRequest(request as any);
    const { warehouseId, items } = await request.json();

    if (!warehouseId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: 'warehouseId and items array are required' }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Resolve default creator name if user token not provided
      let creatorName = user?.name || null;
      let creatorId = user?.sub || null;

      if (!creatorName) {
        const whRes = await client.query('SELECT pic_name FROM warehouses WHERE id = $1', [warehouseId]);
        if (whRes.rowCount && whRes.rows[0].pic_name) {
          creatorName = whRes.rows[0].pic_name;
        } else {
          creatorName = 'Admin';
        }
      }

      for (const item of items) {
        const { materialId, quantity, notes } = item;

        if (!materialId || quantity === undefined || quantity <= 0) {
          throw new Error('Invalid materialId or quantity in items');
        }

        // 1. Upsert into inventory_stocks
        const stockId = generateId();
        await client.query(`
          INSERT INTO inventory_stocks (id, warehouse_id, material_id, quantity)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (warehouse_id, material_id)
          DO UPDATE SET 
            quantity = inventory_stocks.quantity + EXCLUDED.quantity,
            last_updated = CURRENT_TIMESTAMP
        `, [stockId, warehouseId, materialId, quantity]);

        // 2. Insert into inventory_transactions
        const txId = generateId();
        await client.query(`
          INSERT INTO inventory_transactions (id, warehouse_id, material_id, transaction_type, quantity, notes, created_by, created_by_name)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [txId, warehouseId, materialId, 'IN_MANUAL_ENTRY', quantity, notes || 'Manual Stock Adjustment', creatorId, creatorName]);
      }

      await client.query('COMMIT');
      return NextResponse.json({ message: 'Stock added successfully' }, { status: 200 });
    } catch (txError: any) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Manual stock entry error:', error);
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 });
  }
}
