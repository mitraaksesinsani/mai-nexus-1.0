import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request as any);
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').toLowerCase();
    
    let queryStr = `
      SELECT 
        s.id, 
        s.quantity as "availableStock", 
        0 as "reservedStock",
        m.minimum_stock as "minimumStock",
        m.material_name as "materialName",
        m.material_code as "materialCode",
        m.unit,
        w.name as "warehouseName"
      FROM inventory_stocks s
      JOIN material_masters m ON s.material_id = m.id
      JOIN warehouses w ON s.warehouse_id = w.id
    `;
    const queryParams: any[] = [];
    const conditions: string[] = [];
    
    if (search) {
      conditions.push(`(LOWER(m.material_name) LIKE $${queryParams.length + 1} OR LOWER(m.material_code) LIKE $${queryParams.length + 1})`);
      queryParams.push(`%${search}%`);
    }

    if (user?.role === 'SITE_MANAGER') {
      const userId = user.sub || user.id;
      const userName = user.name || '';
      conditions.push(`(w.pic_id::text = $${queryParams.length + 1}::text OR (w.pic_id IS NULL AND LOWER(w.pic_name) = LOWER($${queryParams.length + 2})))`);
      queryParams.push(userId, userName);
    }

    if (conditions.length > 0) {
      queryStr += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    queryStr += ' ORDER BY m.material_name ASC';
    
    const res = await pool.query(queryStr, queryParams);
    
    const data = res.rows.map((row: any) => ({
      id: row.id,
      availableStock: row.availableStock,
      reservedStock: row.reservedStock,
      minimumStock: row.minimumStock || 0,
      material: {
        materialName: row.materialName,
        materialCode: row.materialCode,
        unit: row.unit || 'pcs'
      },
      warehouse: {
        name: row.warehouseName
      }
    }));

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching stock balance:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
