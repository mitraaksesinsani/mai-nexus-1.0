import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status') || 'ALL';
  const search = searchParams.get('search') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const limit = parseInt(searchParams.get('limit') || '200', 10);

  try {
    const user = getUserFromRequest(request as any);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userRole = user.role?.toUpperCase() || '';
    const userId = user.sub;

    // ADMIN, SUPER_ADMIN, PROCUREMENT, DIREKTUR, OWNER can view all history
    const canViewAll = ['ADMIN', 'SUPER_ADMIN', 'PROCUREMENT', 'DIREKTUR', 'OWNER'].includes(userRole);

    let queryStr = `
      SELECT 
        cr.id, 
        cr.rfc_number as "rfcNumber", 
        cr.status, 
        cr.notes, 
        cr.created_at as "createdAt",
        cr.approved_at as "approvedAt",
        cr.completed_at as "completedAt",
        cr.taker_name as "takerName",
        cr.taker_date as "takerDate",
        cr.evidence_document as "evidenceDocument",
        cr.requestor_id as "requestorId",
        u.name as "requestorName",
        u.role as "requestorRole",
        a.name as "approverName",
        a.role as "approverRole",
        c.name as "completedByName",
        p.project_name as "projectName",
        w.name as "warehouseName",
        (SELECT COUNT(*) FROM consumption_request_items i WHERE i.consumption_request_id = cr.id) as "itemsCount"
      FROM consumption_requests cr
      LEFT JOIN users u ON cr.requestor_id = u.id
      LEFT JOIN users a ON cr.approver_id = a.id
      LEFT JOIN users c ON cr.completed_by = c.id
      LEFT JOIN projects p ON cr.project_id = p.id
      LEFT JOIN warehouses w ON cr.warehouse_id = w.id
      WHERE 1=1
    `;
    const queryParams: any[] = [];

    // Only past/concluded RFCs (COMPLETED or REJECTED)
    if (statusParam === 'ALL') {
      queryStr += ` AND cr.status IN ('COMPLETED', 'REJECTED')`;
    } else if (['COMPLETED', 'REJECTED'].includes(statusParam)) {
      queryParams.push(statusParam);
      queryStr += ` AND cr.status = $${queryParams.length}`;
    } else {
      queryStr += ` AND cr.status IN ('COMPLETED', 'REJECTED')`;
    }

    // Role-based visibility
    if (!canViewAll) {
      // User can ONLY see their own RFCs (where they are requestor, processor, or approver)
      queryParams.push(userId);
      const uIdx = queryParams.length;
      queryStr += ` AND (
        cr.requestor_id = $${uIdx}
        OR cr.completed_by = $${uIdx}
        OR EXISTS (
          SELECT 1 FROM consumption_request_approvals cra 
          WHERE cra.consumption_request_id = cr.id AND cra.approver_id = $${uIdx}
        )
      )`;
    }

    if (search) {
      queryParams.push(`%${search.toLowerCase()}%`);
      const sIdx = queryParams.length;
      queryStr += ` AND (
        LOWER(cr.rfc_number) LIKE $${sIdx}
        OR LOWER(COALESCE(p.project_name, '')) LIKE $${sIdx}
        OR LOWER(COALESCE(w.name, '')) LIKE $${sIdx}
        OR LOWER(COALESCE(u.name, '')) LIKE $${sIdx}
        OR LOWER(COALESCE(cr.taker_name, '')) LIKE $${sIdx}
      )`;
    }

    if (startDate) {
      queryParams.push(startDate);
      queryStr += ` AND cr.created_at >= $${queryParams.length}::timestamp`;
    }

    if (endDate) {
      queryParams.push(endDate + ' 23:59:59');
      queryStr += ` AND cr.created_at <= $${queryParams.length}::timestamp`;
    }

    queryStr += ` ORDER BY COALESCE(cr.completed_at, cr.created_at) DESC LIMIT $${queryParams.length + 1}`;
    queryParams.push(limit);

    const res = await pool.query(queryStr, queryParams);

    return NextResponse.json({ data: res.rows, canViewAll }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching RFC history log:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
