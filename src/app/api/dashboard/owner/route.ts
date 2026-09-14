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

    // 5. Recent Warehouses with Latest Activity Details
    const recentWarehousesRes = await pool.query(`
      WITH ranked_tx AS (
        SELECT 
          t.warehouse_id,
          t.created_at as last_activity,
          t.quantity,
          t.transaction_type,
          m.material_name,
          m.unit,
          ROW_NUMBER() OVER (PARTITION BY t.warehouse_id ORDER BY t.created_at DESC) as rn
        FROM inventory_transactions t
        JOIN material_masters m ON t.material_id = m.id
      )
      SELECT 
        w.id, 
        w.name, 
        w.code, 
        w.location, 
        r.last_activity,
        r.quantity,
        r.transaction_type,
        r.material_name,
        r.unit
      FROM ranked_tx r
      JOIN warehouses w ON r.warehouse_id = w.id
      WHERE r.rn = 1
      ORDER BY r.last_activity DESC
      LIMIT 5
    `);

    // 6. Recent Materials with Latest Activity Details
    const recentMaterialsRes = await pool.query(`
      WITH ranked_mat AS (
        SELECT 
          t.material_id,
          t.created_at as last_activity,
          t.quantity,
          t.transaction_type,
          ROW_NUMBER() OVER (PARTITION BY t.material_id ORDER BY t.created_at DESC) as rn
        FROM inventory_transactions t
      )
      SELECT 
        m.id, 
        m.material_code, 
        m.material_name, 
        m.category, 
        m.unit,
        r.last_activity,
        r.quantity,
        r.transaction_type
      FROM ranked_mat r
      JOIN material_masters m ON r.material_id = m.id
      WHERE r.rn = 1
      ORDER BY r.last_activity DESC
      LIMIT 5
    `);

    return NextResponse.json({
      data: {
        totalWarehouses,
        totalMaterialTypes,
        totalMaterialStock,
        totalCableLength,
        recentWarehouses: recentWarehousesRes.rows.map(row => {
          const isOut = (row.transaction_type || '').toUpperCase().includes('OUT') || 
                        (row.transaction_type || '').toUpperCase().includes('ISSUE') || 
                        Number(row.quantity) < 0;
          const absQty = Math.abs(Number(row.quantity) || 0);
          const changeQty = isOut ? -absQty : absQty;
          const changeText = `${changeQty > 0 ? '+' : ''}${changeQty.toLocaleString('id-ID')} ${row.unit || ''}`.trim();
          return {
            id: row.id,
            name: row.name,
            code: row.code,
            location: row.location,
            lastActivity: row.last_activity,
            changeQty,
            changeText,
            materialName: row.material_name,
            transactionType: row.transaction_type
          };
        }),
        recentMaterials: recentMaterialsRes.rows.map(row => {
          const isOut = (row.transaction_type || '').toUpperCase().includes('OUT') || 
                        (row.transaction_type || '').toUpperCase().includes('ISSUE') || 
                        Number(row.quantity) < 0;
          const absQty = Math.abs(Number(row.quantity) || 0);
          const changeQty = isOut ? -absQty : absQty;
          const changeText = `${changeQty > 0 ? '+' : ''}${changeQty.toLocaleString('id-ID')} ${row.unit || ''}`.trim();
          return {
            id: row.id,
            code: row.material_code,
            name: row.material_name,
            category: row.category,
            unit: row.unit,
            lastActivity: row.last_activity,
            changeQty,
            changeText,
            transactionType: row.transaction_type
          };
        })
      }
    });
  } catch (error: any) {
    console.error('Failed to fetch owner dashboard data:', error);
    return NextResponse.json({
      data: {
        totalWarehouses: 0,
        totalMaterialTypes: 0,
        totalMaterialStock: 0,
        totalCableLength: 0,
        recentWarehouses: [],
        recentMaterials: []
      }
    }, { status: 200 });
  }
}
