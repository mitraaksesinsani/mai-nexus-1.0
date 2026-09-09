import { NextResponse } from 'next/server';
import { pool, generateId } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request as any);
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').toLowerCase();
    
    let queryStr = `
      SELECT 
        id, 
        transfer_number as "transferNumber", 
        from_location as "fromLocation", 
        to_location as "toLocation", 
        transfer_date as "transferDate", 
        reason, 
        status, 
        pic,
        origin_pic_id as "originPicId",
        destination_pic as "destinationPic",
        destination_pic_id as "destinationPicId",
        from_warehouse_id as "fromWarehouseId",
        to_warehouse_id as "toWarehouseId",
        material_id as "materialId",
        material_name as "materialName",
        material_code as "materialCode",
        quantity,
        unit,
        received_at as "receivedAt",
        received_by as "receivedBy",
        created_at as "createdAt", 
        updated_at as "updatedAt"
      FROM transfers
    `;
    const queryParams: any[] = [];
    const conditions: string[] = [];

    if (search) {
      conditions.push(`(
        LOWER(transfer_number) LIKE $${queryParams.length + 1} 
        OR LOWER(from_location) LIKE $${queryParams.length + 1} 
        OR LOWER(to_location) LIKE $${queryParams.length + 1}
        OR LOWER(COALESCE(material_name, '')) LIKE $${queryParams.length + 1}
        OR LOWER(COALESCE(material_code, '')) LIKE $${queryParams.length + 1}
        OR LOWER(COALESCE(pic, '')) LIKE $${queryParams.length + 1}
        OR LOWER(COALESCE(destination_pic, '')) LIKE $${queryParams.length + 1}
      )`);
      queryParams.push(`%${search}%`);
    }

    // Role-based scope: SITE_MANAGER only views transfers where they are sender, receiver, or manager of the warehouses
    if (user?.role === 'SITE_MANAGER') {
      const userId = user.sub || user.id;
      const userName = user.name || '';
      conditions.push(`(
        LOWER(COALESCE(pic, '')) = LOWER($${queryParams.length + 1})
        OR origin_pic_id = $${queryParams.length + 2}
        OR LOWER(COALESCE(destination_pic, '')) = LOWER($${queryParams.length + 1})
        OR destination_pic_id = $${queryParams.length + 2}
        OR from_location IN (SELECT name FROM warehouses WHERE pic_id = $${queryParams.length + 2} OR LOWER(pic_name) = LOWER($${queryParams.length + 1}))
        OR to_location IN (SELECT name FROM warehouses WHERE pic_id = $${queryParams.length + 2} OR LOWER(pic_name) = LOWER($${queryParams.length + 1}))
      )`);
      queryParams.push(userName, userId);
    }

    if (conditions.length > 0) {
      queryStr += ` WHERE ${conditions.join(' AND ')}`;
    }

    queryStr += ' ORDER BY created_at DESC';
    
    const res = await pool.query(queryStr, queryParams);
    
    const transfers = res.rows.map((row: any) => ({
      ...row,
      quantity: row.quantity ? parseFloat(row.quantity) : 0,
    }));

    return NextResponse.json({ data: transfers }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching transfers:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const user = getUserFromRequest(request as any);
    const body = await request.json();
    const { 
      transferNumber, 
      fromLocation, 
      fromWarehouseId: reqFromWhId,
      toLocation, 
      toWarehouseId: reqToWhId,
      transferDate, 
      reason, 
      pic,
      originPicId: reqOriginPicId,
      destinationPic,
      destinationPicId,
      materialId,
      materialName,
      materialCode,
      quantity,
      unit
    } = body;

    if (!transferNumber || !fromLocation || !toLocation) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    await client.query('BEGIN');

    // 1. Resolve origin and destination warehouse IDs
    let fromWhId = reqFromWhId;
    if (!fromWhId) {
      const fromWhRes = await client.query('SELECT id FROM warehouses WHERE name = $1 OR id = $1 LIMIT 1', [fromLocation]);
      fromWhId = fromWhRes.rows[0]?.id || null;
    }

    let toWhId = reqToWhId;
    if (!toWhId) {
      const toWhRes = await client.query('SELECT id FROM warehouses WHERE name = $1 OR id = $1 LIMIT 1', [toLocation]);
      toWhId = toWhRes.rows[0]?.id || null;
    }

    const transferQty = quantity ? parseFloat(quantity) : 0;
    const finalOriginPic = (user?.role === 'SITE_MANAGER' && user?.name) ? user.name : (pic || user?.name || '');
    const finalOriginPicId = (user?.role === 'SITE_MANAGER' && (user?.sub || user?.id)) ? (user.sub || user.id) : (reqOriginPicId || user?.sub || user?.id || null);

    // 2. Validate and deduct stock from origin warehouse if material and quantity are provided
    if (materialId && transferQty > 0 && fromWhId) {
      const stockRes = await client.query(
        'SELECT id, quantity FROM inventory_stocks WHERE warehouse_id = $1 AND material_id = $2',
        [fromWhId, materialId]
      );
      const currentStock = stockRes.rows[0]?.quantity ? parseFloat(stockRes.rows[0].quantity) : 0;

      if (currentStock < transferQty) {
        await client.query('ROLLBACK');
        return NextResponse.json({ 
          message: `Stok tidak mencukupi di gudang pengirim. Tersedia: ${currentStock}, diminta transfer: ${transferQty}` 
        }, { status: 400 });
      }

      // Deduct stock from origin warehouse
      await client.query(
        'UPDATE inventory_stocks SET quantity = quantity - $1, last_updated = CURRENT_TIMESTAMP WHERE warehouse_id = $2 AND material_id = $3',
        [transferQty, fromWhId, materialId]
      );

      // Record OUT_TRANSFER transaction
      await client.query(
        `INSERT INTO inventory_transactions (
          id, warehouse_id, material_id, transaction_type, quantity, reference_id, notes, created_by, created_by_name, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
        [
          generateId(),
          fromWhId,
          materialId,
          'OUT_TRANSFER',
          transferQty,
          transferNumber,
          `Transfer material ke ${toLocation}${destinationPic ? ` (PIC: ${destinationPic})` : ''}`,
          finalOriginPicId,
          finalOriginPic
        ]
      );
    }

    // 3. Create Transfer record
    const id = generateId();
    const status = 'IN_TRANSIT';

    const insertRes = await client.query(`
      INSERT INTO transfers (
        id, transfer_number, from_location, to_location, transfer_date, reason, status, pic,
        origin_pic_id, destination_pic, destination_pic_id, from_warehouse_id, to_warehouse_id,
        material_id, material_name, material_code, quantity, unit, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      id, 
      transferNumber, 
      fromLocation, 
      toLocation, 
      transferDate || null, 
      reason || '', 
      status, 
      finalOriginPic,
      finalOriginPicId,
      destinationPic || null,
      destinationPicId || null,
      fromWhId,
      toWhId,
      materialId || null,
      materialName || null,
      materialCode || null,
      transferQty,
      unit || null
    ]);

    await client.query('COMMIT');

    return NextResponse.json({ 
      data: insertRes.rows[0], 
      message: 'Transfer material berhasil dibuat dan stok gudang asal telah disesuaikan.' 
    }, { status: 201 });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating transfer:', error);
    if (error.code === '23505') {
      return NextResponse.json({ message: 'Nomor transfer sudah terdaftar. Silakan gunakan nomor lain.' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal server error: ' + error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(request: Request) {
  const client = await pool.connect();
  try {
    const user = getUserFromRequest(request as any);
    const body = await request.json();
    const { id, status, action } = body;
    
    if (!id) {
      return NextResponse.json({ message: 'Missing transfer id' }, { status: 400 });
    }

    await client.query('BEGIN');

    // Fetch existing transfer
    const existingRes = await client.query('SELECT * FROM transfers WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Transfer not found' }, { status: 404 });
    }

    const transfer = existingRes.rows[0];

    // Handle "RECEIVE" action
    if (action === 'RECEIVE' || status === 'RECEIVED' || status === 'COMPLETED') {
      if (transfer.status === 'RECEIVED' || transfer.status === 'COMPLETED') {
        await client.query('ROLLBACK');
        return NextResponse.json({ message: 'Transfer ini sudah diterima sebelumnya.' }, { status: 400 });
      }

      // Resolve destination warehouse
      let toWhId = transfer.to_warehouse_id;
      if (!toWhId && transfer.to_location) {
        const whRes = await client.query('SELECT id FROM warehouses WHERE name = $1 OR id = $1 LIMIT 1', [transfer.to_location]);
        toWhId = whRes.rows[0]?.id || null;
      }

      const transferQty = transfer.quantity ? parseFloat(transfer.quantity) : 0;
      const receiverName = user?.name || transfer.destination_pic || 'Site Manager';
      const receiverId = user?.sub || user?.id || transfer.destination_pic_id || null;

      // Add stock to destination warehouse if material & quantity exist
      if (transfer.material_id && transferQty > 0 && toWhId) {
        const stockRes = await client.query(
          'SELECT id, quantity FROM inventory_stocks WHERE warehouse_id = $1 AND material_id = $2',
          [toWhId, transfer.material_id]
        );

        if (stockRes.rows.length > 0) {
          await client.query(
            'UPDATE inventory_stocks SET quantity = quantity + $1, last_updated = CURRENT_TIMESTAMP WHERE id = $2',
            [transferQty, stockRes.rows[0].id]
          );
        } else {
          await client.query(
            'INSERT INTO inventory_stocks (id, warehouse_id, material_id, quantity, last_updated) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
            [generateId(), toWhId, transfer.material_id, transferQty]
          );
        }

        // Record IN_TRANSFER transaction
        await client.query(
          `INSERT INTO inventory_transactions (
            id, warehouse_id, material_id, transaction_type, quantity, reference_id, notes, created_by, created_by_name, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
          [
            generateId(),
            toWhId,
            transfer.material_id,
            'IN_TRANSFER',
            transferQty,
            transfer.transfer_number,
            `Penerimaan transfer material dari ${transfer.from_location} (PIC Pengirim: ${transfer.pic})`,
            receiverId,
            receiverName
          ]
        );
      }

      // Update transfer status
      const updatedRes = await client.query(`
        UPDATE transfers 
        SET status = 'RECEIVED', received_at = CURRENT_TIMESTAMP, received_by = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2 
        RETURNING *
      `, [receiverName, id]);

      await client.query('COMMIT');
      return NextResponse.json({ 
        data: updatedRes.rows[0], 
        message: 'Material transfer berhasil diterima. Stok di gudang tujuan telah bertambah.' 
      }, { status: 200 });
    }

    // Default status update (e.g. APPROVED, REJECTED)
    const newStatus = status || transfer.status;
    const res = await client.query(
      `UPDATE transfers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [newStatus, id]
    );

    await client.query('COMMIT');
    return NextResponse.json({ data: res.rows[0], message: 'Status updated' }, { status: 200 });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error updating transfer:', error);
    return NextResponse.json({ message: 'Internal server error: ' + error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
