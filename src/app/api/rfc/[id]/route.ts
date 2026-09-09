import { NextResponse } from 'next/server';
import { pool, generateId } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const rfcQuery = `
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
        cr.current_step_order as "currentStepOrder",
        u.name as "requestorName",
        u.role as "requestorRole",
        a.name as "approverName",
        a.role as "approverRole",
        c.name as "completedByName",
        p.project_name as "projectName",
        w.name as "warehouseName",
        cr.warehouse_id as "warehouseId"
      FROM consumption_requests cr
      LEFT JOIN users u ON cr.requestor_id = u.id
      LEFT JOIN users a ON cr.approver_id = a.id
      LEFT JOIN users c ON cr.completed_by = c.id
      LEFT JOIN projects p ON cr.project_id = p.id
      LEFT JOIN warehouses w ON cr.warehouse_id = w.id
      WHERE cr.id = $1
    `;
    const rfcRes = await pool.query(rfcQuery, [id]);
    
    if (rfcRes.rows.length === 0) {
      return NextResponse.json({ message: 'RFC not found' }, { status: 404 });
    }

    const rfc = rfcRes.rows[0];

    const itemsQuery = `
      SELECT 
        ri.id,
        ri.request_qty as "requestQty",
        ri.notes,
        m.material_name as "materialName",
        m.material_code as "materialCode",
        m.unit,
        m.id as "materialId"
      FROM consumption_request_items ri
      LEFT JOIN material_masters m ON ri.material_id = m.id
      WHERE ri.consumption_request_id = $1
    `;
    const itemsRes = await pool.query(itemsQuery, [id]);

    const approvalsQuery = `
      SELECT 
        cra.id,
        cra.step_order as "stepOrder",
        cra.step_name as "stepName",
        cra.approver_id as "approverId",
        cra.status,
        cra.notes,
        cra.action_at as "actionAt",
        cra.created_at as "createdAt",
        u.name as "approverName",
        u.role as "approverRole",
        u.email as "approverEmail"
      FROM consumption_request_approvals cra
      LEFT JOIN users u ON cra.approver_id = u.id
      WHERE cra.consumption_request_id = $1
      ORDER BY cra.step_order ASC
    `;
    const approvalsRes = await pool.query(approvalsQuery, [id]);

    const formattedRfc = {
      ...rfc,
      project: { projectName: rfc.projectName },
      warehouse: { name: rfc.warehouseName, id: rfc.warehouseId },
      requestor: { name: rfc.requestorName, role: rfc.requestorRole },
      approver: rfc.approverName ? { name: rfc.approverName, role: rfc.approverRole } : null,
      items: itemsRes.rows,
      approvals: approvalsRes.rows
    };

    return NextResponse.json({ data: formattedRfc }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching RFC details:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { status, approverId, notes, stepOrder, takerName, takerDate, evidenceDocument, completedBy } = body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (status === 'APPROVED') {
      const currentRfcRes = await client.query('SELECT current_step_order, status FROM consumption_requests WHERE id = $1', [id]);
      if (currentRfcRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ message: 'RFC not found' }, { status: 404 });
      }

      const currentStep = stepOrder || currentRfcRes.rows[0].current_step_order || 1;

      // Update current step approval record
      await client.query(`
        UPDATE consumption_request_approvals 
        SET status = 'APPROVED', action_at = CURRENT_TIMESTAMP, notes = $1, approver_id = COALESCE($2, approver_id)
        WHERE consumption_request_id = $3 AND step_order = $4
      `, [notes || '', approverId || null, id, currentStep]);

      // Check if there is a next pending step
      const nextStepRes = await client.query(`
        SELECT step_order FROM consumption_request_approvals 
        WHERE consumption_request_id = $1 AND step_order > $2
        ORDER BY step_order ASC LIMIT 1
      `, [id, currentStep]);

      if (nextStepRes.rows.length > 0) {
        // Advance to next step
        const nextStepOrder = nextStepRes.rows[0].step_order;
        await client.query(`
          UPDATE consumption_requests 
          SET current_step_order = $1, updated_at = CURRENT_TIMESTAMP 
          WHERE id = $2
        `, [nextStepOrder, id]);
      } else {
        // All steps approved!
        await client.query(`
          UPDATE consumption_requests 
          SET status = 'APPROVED', approver_id = $1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
          WHERE id = $2
        `, [approverId || null, id]);
      }
    } else if (status === 'REJECTED') {
      const currentRfcRes = await client.query('SELECT current_step_order FROM consumption_requests WHERE id = $1', [id]);
      const currentStep = stepOrder || currentRfcRes.rows[0]?.current_step_order || 1;

      await client.query(`
        UPDATE consumption_request_approvals 
        SET status = 'REJECTED', action_at = CURRENT_TIMESTAMP, notes = $1, approver_id = COALESCE($2, approver_id)
        WHERE consumption_request_id = $3 AND step_order = $4
      `, [notes || '', approverId || null, id, currentStep]);

      await client.query(`
        UPDATE consumption_requests 
        SET status = 'REJECTED', approver_id = $1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [approverId || null, id]);
    } else if (status === 'COMPLETED') {
      // Complete RFC, deduct stock, and record inventory transaction
      const rfcRes = await client.query('SELECT rfc_number, warehouse_id FROM consumption_requests WHERE id = $1', [id]);
      if (rfcRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ message: 'RFC not found' }, { status: 404 });
      }
      
      const warehouseId = rfcRes.rows[0].warehouse_id;
      const rfcNumber = rfcRes.rows[0].rfc_number;

      // Get user name for audit log
      let completedByName = null;
      if (completedBy) {
        const uRes = await client.query('SELECT name FROM users WHERE id = $1', [completedBy]);
        if (uRes.rows.length > 0) completedByName = uRes.rows[0].name;
      }
      
      const itemsRes = await client.query('SELECT material_id, request_qty FROM consumption_request_items WHERE consumption_request_id = $1', [id]);
      
      // Deduct stock for each item & record transaction
      for (const item of itemsRes.rows) {
        await client.query(`
          UPDATE inventory_stocks 
          SET quantity = quantity - $1, last_updated = CURRENT_TIMESTAMP
          WHERE warehouse_id = $2 AND material_id = $3
        `, [item.request_qty, warehouseId, item.material_id]);

        const txId = generateId();
        await client.query(`
          INSERT INTO inventory_transactions 
          (id, warehouse_id, material_id, transaction_type, quantity, reference_id, notes, created_by, created_by_name)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          txId,
          warehouseId,
          item.material_id,
          'RFC_ISSUE',
          -item.request_qty,
          id,
          `Issued for RFC ${rfcNumber || id} (Receiver: ${takerName || '-'})`,
          completedBy || null,
          completedByName || 'Warehouse Staff'
        ]);
      }

      await client.query(`
        UPDATE consumption_requests 
        SET status = $1, taker_name = $2, taker_date = $3, evidence_document = $4, completed_by = $5, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $6 RETURNING *
      `, [status, takerName, takerDate, evidenceDocument, completedBy, id]);
      
    } else {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
    }

    await client.query('COMMIT');
    return NextResponse.json({ message: 'RFC updated successfully' }, { status: 200 });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error updating RFC:', error);
    return NextResponse.json({ message: 'Failed to update RFC', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
