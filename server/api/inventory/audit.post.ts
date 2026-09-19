import { defineEventHandler, readBody } from 'h3'
import { db } from '../../../src/lib/db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { 
      asset_id, audit_date, auditor, department_at_audit, allotted_employee_at_audit,
      ram_at_audit, storage_raw_at_audit, processor_at_audit, os_at_audit,
      keyboard_issued, mouse_issued, stand_issued, monitor_issued, charger_issued,
      bag_issued, condition_at_audit, observations, physical_status_at_audit
    } = body

    if (!asset_id || !audit_date || !auditor) {
      return { error: 'Asset ID, Audit Date, and Auditor are required' }
    }

    const result = await db.query(
      `INSERT INTO audits (
        asset_id, audit_date, auditor, department_at_audit, allotted_employee_at_audit,
        ram_at_audit, storage_raw_at_audit, processor_at_audit, os_at_audit,
        keyboard_issued, mouse_issued, stand_issued, monitor_issued, charger_issued,
        bag_issued, condition_at_audit, observations, physical_status_at_audit
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING id`,
      [
        asset_id, audit_date, auditor, department_at_audit || null, allotted_employee_at_audit || null,
        ram_at_audit || null, storage_raw_at_audit || null, processor_at_audit || null, os_at_audit || null,
        keyboard_issued || false, mouse_issued || false, stand_issued || false, monitor_issued || false, charger_issued || false,
        bag_issued || false, condition_at_audit || null, observations || null, physical_status_at_audit || null
      ]
    )

    // Optional: Update asset condition/status if changed, though typically an audit just logs it.
    // If the audit is meant to *update* the asset's active fields, we would do a subsequent UPDATE to assets here.

    return { data: result.rows[0] }
  } catch (error: any) {
    console.error('Audit insertion error:', error)
    return { error: error.message || 'Unknown server error' }
  }
})
