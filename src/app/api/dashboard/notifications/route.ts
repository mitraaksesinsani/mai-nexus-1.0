import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const role = user.role?.toUpperCase();
    const userId = user.sub || user.id;

    const dynamicNotifications: any[] = [];

    // 1. RFC Approvals
    if (['PROCUREMENT', 'OWNER', 'DIREKTUR', 'SITE_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      try {
        const rfcRes = await pool.query(`
          SELECT cr.id, cr.rfc_number, cr.created_at 
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
          ORDER BY cr.created_at DESC LIMIT 5
        `, [userId, role]);

        rfcRes.rows.forEach(r => {
          dynamicNotifications.push({
            id: `rfc-${r.id}`,
            title: 'RFC Approval Required',
            message: `Request for Consumption ${r.rfc_number} is waiting for your approval.`,
            link: `/rfc/approval`,
            createdAt: r.created_at,
            isRead: false,
            type: 'RFC_APPROVAL'
          });
        });
      } catch {
        const rfcRes = await pool.query(`
          SELECT id, rfc_number, created_at 
          FROM rfcs 
          WHERE status = 'WAITING_APPROVAL' 
          AND (site_approver_id IS NULL OR site_approver_id = $1)
          ORDER BY created_at DESC LIMIT 5
        `, [userId]);
        
        rfcRes.rows.forEach(r => {
          dynamicNotifications.push({
            id: `rfc-${r.id}`,
            title: 'RFC Approval Required',
            message: `Request For Certificate ${r.rfc_number} is waiting for your approval.`,
            link: `/rfc/approval?actionId=${r.id}`,
            createdAt: r.created_at,
            isRead: false,
            type: 'RFC_APPROVAL'
          });
        });
      }
    }

    // 2. PO Approvals
    let targetPoStatuses: string[] = [];
    if (['PROJECT_MANAGER'].includes(role)) {
      targetPoStatuses = ['WAITING_OPERATION_APPROVAL'];
    } else if (['ADMIN'].includes(role)) {
      targetPoStatuses = ['WAITING_ADMIN_APPROVAL'];
    } else if (['OWNER', 'DIREKTUR', 'PROCUREMENT', 'SUPER_ADMIN'].includes(role)) {
      targetPoStatuses = ['WAITING_OWNER_APPROVAL'];
    }

    if (targetPoStatuses.length > 0) {
      const statusPlaceholders = targetPoStatuses.map((_, i) => `$${i + 1}`).join(',');
      const poRes = await pool.query(`
        SELECT id, po_number, created_at 
        FROM purchase_orders 
        WHERE status IN (${statusPlaceholders})
        ORDER BY created_at DESC LIMIT 5
      `, targetPoStatuses);
      
      poRes.rows.forEach(p => {
        dynamicNotifications.push({
          id: `po-${p.id}`,
          title: 'PO Approval Required',
          message: `Purchase Order ${p.po_number} is waiting for your approval.`,
          link: `/procurement/${p.id}`,
          createdAt: p.created_at,
          isRead: false,
          type: 'PO_APPROVAL'
        });
      });
    }

    // Sort combined notifications by date descending
    dynamicNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(dynamicNotifications);
  } catch (error) {
    console.error('Error fetching dynamic notifications:', error);
    return NextResponse.json([], { status: 200 });
  }
}
