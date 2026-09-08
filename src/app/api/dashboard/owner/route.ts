import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Total Warehouses
    const warehouseRes = await pool.query(`SELECT COUNT(*) FROM warehouses`);
    const totalWarehouses = parseInt(warehouseRes.rows[0].count, 10) || 0;

    // 2. Total Material Types (SKU)
    const materialTypesRes = await pool.query(`SELECT COUNT(*) FROM material_masters`);
    const totalMaterialTypes = parseInt(materialTypesRes.rows[0].count, 10) || 0;

    // 3. Load UOM Conversion Terms from settings
    const settingsRes = await pool.query(`
      SELECT key, value FROM settings 
      WHERE key IN ('uom_hdpe_roll', 'uom_kabel_tanah_haspel', 'uom_kabel_udara_haspel')
    `);
    const settingsMap = settingsRes.rows.reduce((acc: any, row: any) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    const hdpeRoll = Number(settingsMap.uom_hdpe_roll) || 200;
    const kabelTanahHaspel = Number(settingsMap.uom_kabel_tanah_haspel) || 3000;
    const kabelUdaraHaspel = Number(settingsMap.uom_kabel_udara_haspel) || 4000;

    // 4. Total Material Stock (Physical packaging count with UOM terms) & Total Cable Length
    const stockRes = await pool.query(`
      SELECT 
        COALESCE(SUM(
          CASE 
            WHEN LOWER(TRIM(m.unit)) IN ('meter', 'mtr', 'm') THEN
              CASE 
                WHEN s.quantity <= 0 THEN 0
                WHEN m.packaging_type = 'HDPE_SUBDUCT' THEN GREATEST(1, ROUND(s.quantity::numeric / $1))
                WHEN m.packaging_type = 'KABEL_TANAH' THEN GREATEST(1, ROUND(s.quantity::numeric / $2))
                WHEN m.packaging_type = 'KABEL_UDARA' THEN GREATEST(1, ROUND(s.quantity::numeric / $3))
                ELSE 1
              END
            ELSE GREATEST(0, s.quantity)
          END
        ), 0) as total_material_stock,
        COALESCE(SUM(
          CASE 
            WHEN LOWER(TRIM(m.unit)) IN ('meter', 'mtr', 'm') 
            THEN s.quantity 
            ELSE 0 
          END
        ), 0) as total_cable_length
      FROM inventory_stocks s
      JOIN material_masters m ON s.material_id = m.id
    `, [hdpeRoll, kabelTanahHaspel, kabelUdaraHaspel]);
    const totalMaterialStock = Math.round(Number(stockRes.rows[0]?.total_material_stock)) || 0;
    const totalCableLength = Number(stockRes.rows[0]?.total_cable_length) || 0;

    // 4. Recent Warehouses with Activity
    const recentWarehousesRes = await pool.query(`
      SELECT w.id, w.name, w.code, w.location, MAX(t.created_at) as last_activity
      FROM inventory_transactions t
      JOIN warehouses w ON t.warehouse_id = w.id
      GROUP BY w.id, w.name, w.code, w.location
      ORDER BY last_activity DESC
      LIMIT 5
    `);

    // 5. Recent Materials with Activity
    const recentMaterialsRes = await pool.query(`
      SELECT m.id, m.material_code, m.material_name, m.category, MAX(t.created_at) as last_activity
      FROM inventory_transactions t
      JOIN material_masters m ON t.material_id = m.id
      GROUP BY m.id, m.material_code, m.material_name, m.category
      ORDER BY last_activity DESC
      LIMIT 5
    `);

    return NextResponse.json({
      data: {
        totalWarehouses,
        totalMaterialTypes,
        totalMaterialStock,
        totalCableLength,
        recentWarehouses: recentWarehousesRes.rows.map(row => ({
          id: row.id,
          name: row.name,
          code: row.code,
          location: row.location,
          lastActivity: row.last_activity
        })),
        recentMaterials: recentMaterialsRes.rows.map(row => ({
          id: row.id,
          code: row.material_code,
          name: row.material_name,
          category: row.category,
          lastActivity: row.last_activity
        }))
      }
    });
  } catch (error: any) {
    console.error('Failed to fetch owner dashboard data:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
