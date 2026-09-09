import { defineEventHandler } from 'h3'
import { db } from '../../../src/lib/db'

export default defineEventHandler(async (event) => {
  const { rows } = await db.query('SELECT count(*) FROM employees')
  return parseInt(rows[0].count, 10)
})
