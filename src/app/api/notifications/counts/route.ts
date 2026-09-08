import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const role = user.role?.toUpperCase();
    const userId = user.sub || user.id;

    // 1. Count pending RFC approvals
    let rfcApprovals = 0;
    if (['PROCUREMENT', 'OWNER', 'DIREKTUR', 'SITE_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      try {
        const rfcRes = await pool.query(`
          SELECT COUNT(*) as count 
          FROM consumption_requests cr
          WHERE cr.status = 'WAITING_APPROVAL' 
          AND (
            EXISTS (
              SELECT 1 FROM consumption_request_approvals cra 
              WHERE cra.consumption_request_id = cr.id 
              AND cra.step_order = COALESCE(cr.current_step_order, 1) 
              AND (cra.approver_id = $1 OR $2 IN ('ADMIN', 'SUPER_ADMIN'))
            )
            OR NOT EXISTS (SELECT 1 FROM consumption_request_approvals cra WHERE cra.consumption_request_id = cr.id)
          )
        `, [userId, role]);
        rfcApprovals = parseInt(rfcRes.rows[0]?.count, 10) || 0;
      } catch {
        const rfcRes = await pool.query(`
          SELECT COUNT(*) as count 
          FROM rfcs 
          WHERE status = 'WAITING_APPROVAL' 
          AND (site_approver_id IS NULL OR site_approver_id = $1)
        `, [userId]);
        rfcApprovals = parseInt(rfcRes.rows[0]?.count, 10) || 0;
      }
    }

    // 2. Count pending POs
    let poApprovals = 0;
    if (['PROCUREMENT', 'OWNER', 'DIREKTUR', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      const poRes = await pool.query(`
        SELECT COUNT(*) as count 
        FROM purchase_orders 
        WHERE status = 'WAITING_APPROVAL' 
        AND (approver_id IS NULL OR approver_id = $1)
      `, [userId]);
      poApprovals = parseInt(poRes.rows[0].count, 10) || 0;
    }

    // 3. Count ready Material Receives (DOs that are shipping or waiting to be received)
    let materialReceives = 0;
    if (['PROCUREMENT', 'OWNER', 'DIREKTUR', 'SITE_MANAGER', 'PROJECT_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      const doRes = await pool.query(`
        SELECT COUNT(*) as count 
        FROM delivery_orders 
        WHERE status IN ('SHIPPING', 'WAITING')
      `);
      materialReceives = parseInt(doRes.rows[0].count, 10) || 0;
    }

    // 4. Count pending Logistics (Approved/Processed POs waiting to be made into DOs)
    let pendingLogistics = 0;
    const pendingLogisticsRes = await pool.query(`
      SELECT COUNT(*) as count
      FROM delivery_orders
      WHERE status = 'WAITING'
    `);
    pendingLogistics = parseInt(pendingLogisticsRes.rows[0].count, 10) || 0;

    return NextResponse.json({
      data: {
        rfcApprovals,
        poApprovals,
        materialReceives,
        pendingLogistics
      }
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching notification counts:', error);
    // Return empty counts gracefully so UI sidebar doesn't throw 500 on temporary network hiccup
    return NextResponse.json({
      data: {
        rfcApprovals: 0,
        poApprovals: 0,
        materialReceives: 0,
        pendingLogistics: 0
      }
    }, { status: 200 });
  }
}
