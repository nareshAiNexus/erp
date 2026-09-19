import { defineEventHandler, readBody } from 'h3'
import { db } from '../../../src/lib/db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { 
      category, asset_type, model_name, operating_system, ram, 
      storage_raw, storage_total_gb, storage_available_gb, processor, 
      working_condition, other_product_name_id, quantity, 
      purchase_date, price, department_id, allotted_employee_id, status, asset_tag 
    } = body

    // Validation
    if (!category || !asset_type) {
      return { error: 'Category and Asset Type are required' }
    }

    if (category === 'system') {
      if (!ram || !operating_system || !processor) {
        return { error: 'System assets must include RAM, OS, and Processor' }
      }
    } else if (category === 'electronics') {
      if (!working_condition) {
        return { error: 'Electronics assets must include Working Condition' }
      }
    } else if (category === 'other') {
      if (!other_product_name_id || !quantity) {
        return { error: 'Other assets must include a Product Name and Quantity' }
      }
    }

    // Insertion
    const result = await db.query(
      `INSERT INTO assets (
        asset_tag, category, asset_type, model_name, operating_system, ram,
        storage_raw, storage_total_gb, storage_available_gb, processor,
        working_condition, other_product_name_id, quantity,
        purchase_date, price, department_id, allotted_employee_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING id`,
      [
        asset_tag || null, category, asset_type, model_name || null, operating_system || null, ram || null,
        storage_raw || null, storage_total_gb || null, storage_available_gb || null, processor || null,
        working_condition || null, other_product_name_id || null, quantity || null,
        purchase_date || null, price || null, department_id || null, allotted_employee_id || null, status || 'active'
      ]
    )

    return { data: result.rows[0] }
  } catch (error: any) {
    console.error('Asset insertion error:', error)
    return { error: error.message || 'Unknown server error' }
  }
})
