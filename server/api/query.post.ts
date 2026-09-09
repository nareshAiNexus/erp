import { defineEventHandler, readBody } from 'h3'
import { db } from '../../../src/lib/db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { text, values } = body
    
    if (!text) {
      return { error: 'Query text is required' }
    }

    const result = await db.query(text, values)
    return result.rows
  } catch (error: any) {
    console.error('Database query error:', error)
    return { error: error.message || 'Unknown database error' }
  }
})
