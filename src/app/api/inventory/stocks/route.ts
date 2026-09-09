import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request as any);
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');
    const search = (searchParams.get('search') || '').toLowerCase();

    let queryStr = `
      SELECT 
        MAX(s.id::text) as id, 
        m.id as "materialId",
        SUM(s.quantity) as quantity, 
        MAX(s.last_updated) as "lastUpdated",
        w.name as "warehouseName",
        w.code as "warehouseCode",
        m.material_code as "materialCode",
        m.material_name as "materialName",
        m.category,
        m.unit,
        COALESCE(m.unit_price, 0) as "unitPrice",
        SUM(s.quantity * COALESCE(m.unit_price, 0)) as "totalValue"
      FROM inventory_stocks s
      JOIN warehouses w ON s.warehouse_id = w.id
      JOIN material_masters m ON s.material_id = m.id
      WHERE 1=1
    `;
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (warehouseId) {
      queryStr += ` AND s.warehouse_id = $${paramIndex}`;
      queryParams.push(warehouseId);
      paramIndex++;
    }

    if (search) {
      queryStr += ` AND (LOWER(m.material_name) LIKE $${paramIndex} OR LOWER(m.material_code) LIKE $${paramIndex} OR LOWER(w.name) LIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (user?.role === 'SITE_MANAGER') {
      const userId = user.sub || user.id;
      const userName = user.name || '';
      queryStr += ` AND (w.pic_id = $${paramIndex} OR (w.pic_id IS NULL AND LOWER(w.pic_name) = LOWER($${paramIndex + 1})))`;
      queryParams.push(userId, userName);
      paramIndex += 2;
    }

    queryStr += ' GROUP BY m.id, w.name, w.code, m.material_code, m.material_name, m.category, m.unit, m.unit_price';
    queryStr += ' ORDER BY w.name ASC, m.material_name ASC';

    const res = await pool.query(queryStr, queryParams);

    const stocks = res.rows.map((row: any) => ({
      ...row,
      quantity: parseInt(row.quantity, 10) || 0,
      unitPrice: parseFloat(row.unitPrice) || 0,
      totalValue: parseFloat(row.totalValue) || 0,
      material: {
        id: row.materialId,
        materialCode: row.materialCode,
        materialName: row.materialName,
        category: row.category,
        unit: row.unit,
        unitPrice: parseFloat(row.unitPrice) || 0,
      }
    }));

    return NextResponse.json({ data: stocks }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching stocks:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
