import { NextResponse } from 'next/server';
import { pool, generateId } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = getUserFromRequest(request as any);
    const body = await request.json();
    const { warehouseId, items, adjustmentType = 'IN', reason = '' } = body;

    if (!warehouseId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: 'warehouseId dan daftar items wajib diisi' }, { status: 400 });
    }

    const isDeduction = adjustmentType === 'OUT';
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
        const qty = parseFloat(quantity);

        if (!materialId || isNaN(qty) || qty <= 0) {
          throw new Error('Jumlah/kuantitas material harus berupa angka lebih dari 0');
        }

        const formattedNotes = [
          notes?.trim(),
          reason ? `Alasan: ${reason}` : null
        ].filter(Boolean).join(' | ') || (isDeduction ? 'Pengurangan Stok Manual' : 'Penambahan Stok Manual');

        if (isDeduction) {
          // 1. Verify available stock
          const stockRes = await client.query(`
            SELECT s.id, s.quantity, m.material_name, m.material_code
            FROM inventory_stocks s
            JOIN material_masters m ON s.material_id = m.id
            WHERE s.warehouse_id = $1 AND s.material_id = $2
          `, [warehouseId, materialId]);

          const currentStock = stockRes.rows[0];
          const availableQty = currentStock ? parseFloat(currentStock.quantity) : 0;

          if (!currentStock || availableQty < qty) {
            const matLabel = currentStock 
              ? `${currentStock.material_name} (${currentStock.material_code})` 
              : `ID: ${materialId}`;
            throw new Error(`Stok material "${matLabel}" tidak mencukupi untuk dikurangi sejumlah ${qty}. Stok tersedia di gudang ini: ${availableQty}`);
          }

          // 2. Deduct from inventory_stocks
          await client.query(`
            UPDATE inventory_stocks
            SET quantity = quantity - $1,
                last_updated = CURRENT_TIMESTAMP
            WHERE id = $2
          `, [qty, currentStock.id]);

          // 3. Record transaction in inventory_transactions (negative quantity)
          const txId = generateId();
          await client.query(`
            INSERT INTO inventory_transactions (
              id, warehouse_id, material_id, transaction_type, quantity, notes, created_by, created_by_name
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            txId,
            warehouseId,
            materialId,
            'OUT_MANUAL_ADJUSTMENT',
            -qty,
            formattedNotes,
            creatorId,
            creatorName
          ]);
        } else {
          // Addition (IN)
          // 1. Upsert into inventory_stocks
          const stockId = generateId();
          await client.query(`
            INSERT INTO inventory_stocks (id, warehouse_id, material_id, quantity)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (warehouse_id, material_id)
            DO UPDATE SET 
              quantity = inventory_stocks.quantity + EXCLUDED.quantity,
              last_updated = CURRENT_TIMESTAMP
          `, [stockId, warehouseId, materialId, qty]);

          // 2. Record transaction in inventory_transactions (positive quantity)
          const txId = generateId();
          await client.query(`
            INSERT INTO inventory_transactions (
              id, warehouse_id, material_id, transaction_type, quantity, notes, created_by, created_by_name
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            txId,
            warehouseId,
            materialId,
            'IN_MANUAL_ENTRY',
            qty,
            formattedNotes,
            creatorId,
            creatorName
          ]);
        }
      }

      await client.query('COMMIT');
      return NextResponse.json({ 
        message: isDeduction 
          ? 'Pengurangan stok manual berhasil dicatat' 
          : 'Penambahan stok manual berhasil disimpan' 
      }, { status: 200 });
    } catch (txError: any) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Manual stock adjustment error:', error);
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 });
  }
}
