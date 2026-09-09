import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request as any);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.sub || user.id;
    const userRole = (user.role || '').toUpperCase();
    const userName = user.name || '';
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

    const { searchParams } = new URL(request.url);
    const requestedWarehouseId = searchParams.get('warehouseId');
    const search = (searchParams.get('search') || '').toLowerCase();

    // 1. Fetch Warehouses for this PIC (or all warehouses if Admin)
    let warehouseQuery = `
      SELECT 
        w.id,
        w.code,
        w.name,
        w.location,
        w.type,
        w.status,
        w.pic_id,
        w.pic_name,
        u.name as pic_user_name,
        u.email as pic_user_email,
        u.role as pic_user_role,
        COUNT(DISTINCT s.material_id) as total_materials,
        COALESCE(SUM(s.quantity), 0) as total_stock
      FROM warehouses w
      LEFT JOIN users u ON w.pic_id = u.id
      LEFT JOIN inventory_stocks s ON w.id = s.warehouse_id
    `;
    const warehouseParams: any[] = [];

    if (!isAdmin) {
      warehouseQuery += ` WHERE w.pic_id = $1 OR (w.pic_id IS NULL AND LOWER(w.pic_name) = LOWER($2))`;
      warehouseParams.push(userId, userName);
    }

    warehouseQuery += `
      GROUP BY w.id, w.code, w.name, w.location, w.type, w.status, w.pic_id, w.pic_name, u.name, u.email, u.role
      ORDER BY w.name ASC
    `;

    const whRes = await pool.query(warehouseQuery, warehouseParams);
    const assignedWarehouses = whRes.rows.map((row: any) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      location: row.location,
      type: row.type,
      status: row.status,
      picId: row.pic_id,
      picName: row.pic_user_name || row.pic_name || 'Unassigned',
      picUser: row.pic_user_name ? {
        name: row.pic_user_name,
        email: row.pic_user_email,
        role: row.pic_user_role
      } : null,
      totalMaterials: parseInt(row.total_materials, 10) || 0,
      totalStock: parseInt(row.total_stock, 10) || 0
    }));

    // If user is not admin and has no assigned warehouse
    if (!isAdmin && assignedWarehouses.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          isAdmin: false,
          assignedWarehouses: [],
          selectedWarehouse: null,
          metrics: {
            totalWarehouses: 0,
            totalStock: 0,
            totalSkus: 0,
            lowStockCount: 0,
            recentMovementsCount: 0
          },
          stocks: [],
          recentTransactions: []
        }
      });
    }

    // Determine target warehouse IDs
    let targetWarehouseIds: string[] = [];
    let selectedWarehouse: any = null;

    if (requestedWarehouseId && requestedWarehouseId !== 'ALL') {
      const found = assignedWarehouses.find((w: any) => w.id === requestedWarehouseId);
      if (found) {
        selectedWarehouse = found;
        targetWarehouseIds = [found.id];
      } else if (isAdmin) {
        // Fetch specific warehouse if admin
        const singleRes = await pool.query('SELECT * FROM warehouses WHERE id = $1', [requestedWarehouseId]);
        if (singleRes.rows.length > 0) {
          selectedWarehouse = singleRes.rows[0];
          targetWarehouseIds = [requestedWarehouseId];
        }
      }
    }

    if (targetWarehouseIds.length === 0) {
      if (requestedWarehouseId === 'ALL') {
        selectedWarehouse = { id: 'ALL', name: 'Semua Gudang Terkait' };
        targetWarehouseIds = assignedWarehouses.map((w: any) => w.id);
      } else if (assignedWarehouses.length > 0) {
        selectedWarehouse = assignedWarehouses[0];
        targetWarehouseIds = [assignedWarehouses[0].id];
      }
    }

    // 2. Fetch Stocks for target warehouses
    let stocks: any[] = [];
    if (targetWarehouseIds.length > 0) {
      let stockQuery = `
        SELECT 
          s.id,
          s.warehouse_id,
          w.name as warehouse_name,
          w.code as warehouse_code,
          s.material_id,
          m.material_code,
          m.material_name,
          m.category,
          m.unit,
          s.quantity,
          s.last_updated
        FROM inventory_stocks s
        JOIN warehouses w ON s.warehouse_id = w.id
        JOIN material_masters m ON s.material_id = m.id
        WHERE s.warehouse_id = ANY($1::uuid[])
      `;
      const stockParams: any[] = [targetWarehouseIds];

      if (search) {
        stockQuery += ` AND (LOWER(m.material_name) LIKE $2 OR LOWER(m.material_code) LIKE $2 OR LOWER(m.category) LIKE $2)`;
        stockParams.push(`%${search}%`);
      }

      stockQuery += ` ORDER BY s.quantity ASC, m.material_name ASC`;

      const stockRes = await pool.query(stockQuery, stockParams);
      stocks = stockRes.rows.map((r: any) => ({
        id: r.id,
        warehouseId: r.warehouse_id,
        warehouseName: r.warehouse_name,
        warehouseCode: r.warehouse_code,
        materialId: r.material_id,
        materialCode: r.material_code,
        materialName: r.material_name,
        category: r.category,
        unit: r.unit,
        quantity: parseInt(r.quantity, 10) || 0,
        lastUpdated: r.last_updated
      }));
    }

    // 3. Fetch Recent Transactions
    let recentTransactions: any[] = [];
    if (targetWarehouseIds.length > 0) {
      const txQuery = `
        SELECT 
          t.id, 
          t.transaction_type, 
          t.quantity, 
          t.reference_id, 
          t.notes, 
          t.created_at,
          t.created_by_name,
          m.material_name, 
          m.material_code, 
          m.unit,
          w.name as warehouse_name
        FROM inventory_transactions t
        JOIN material_masters m ON t.material_id = m.id
        JOIN warehouses w ON t.warehouse_id = w.id
        WHERE t.warehouse_id = ANY($1::uuid[])
        ORDER BY t.created_at DESC
        LIMIT 10
      `;
      const txRes = await pool.query(txQuery, [targetWarehouseIds]);
      recentTransactions = txRes.rows.map((r: any) => ({
        id: r.id,
        transactionType: r.transaction_type,
        quantity: parseInt(r.quantity, 10) || 0,
        referenceId: r.reference_id,
        notes: r.notes,
        createdAt: r.created_at,
        createdByName: r.created_by_name || 'System',
        materialName: r.material_name,
        materialCode: r.material_code,
        unit: r.unit,
        warehouseName: r.warehouse_name
      }));
    }

    // 4. Calculate Aggregate Metrics
    const totalStock = stocks.reduce((acc, curr) => acc + curr.quantity, 0);
    const totalSkus = new Set(stocks.map(s => s.materialId)).size;
    const lowStockCount = stocks.filter(s => s.quantity <= 10).length;

    return NextResponse.json({
      success: true,
      data: {
        isAdmin,
        user: {
          id: userId,
          name: userName,
          role: userRole
        },
        assignedWarehouses,
        selectedWarehouse,
        metrics: {
          totalWarehouses: assignedWarehouses.length,
          totalStock,
          totalSkus,
          lowStockCount,
          recentMovementsCount: recentTransactions.length
        },
        stocks,
        recentTransactions
      }
    });

  } catch (error: any) {
    console.error('Error fetching PIC dashboard data:', error);
    return NextResponse.json(
      { message: 'Gagal mengambil data PIC Dashboard', error: error.message },
      { status: 500 }
    );
  }
}
