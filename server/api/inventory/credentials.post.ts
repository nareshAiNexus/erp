import { defineEventHandler, readBody } from 'h3'
import { db } from '../../../src/lib/db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { asset_id, user_id } = body
    
    if (!asset_id || !user_id) {
      return { error: 'Missing required parameters' }
    }

    // 1. Verify user is sysadmin
    const userResult = await db.query('SELECT auth_role FROM employees WHERE id = $1', [user_id])
    if (userResult.rows.length === 0) {
      return { error: 'User not found' }
    }
    
    const role = userResult.rows[0].auth_role
    if (role !== 'admin' && role !== 'sysadmin') {
      return { error: 'Access denied: Sysadmin privileges required to view credentials.' }
    }

    // 2. Fetch credentials
    const credResult = await db.query('SELECT * FROM asset_credentials WHERE asset_id = $1', [asset_id])
    if (credResult.rows.length === 0) {
      return { data: null } // No credentials found
    }

    return { data: credResult.rows[0] }
  } catch (error: any) {
    console.error('Credentials fetch error:', error)
    return { error: error.message || 'Unknown server error' }
  }
})
