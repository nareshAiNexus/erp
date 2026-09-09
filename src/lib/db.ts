// Server-only: PostgreSQL connection pool.
// Do NOT import this in browser/client code.
import { Pool } from 'pg'
import 'dotenv/config'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export const db = pool

// Re-export all types for convenience
export type {
  Employee,
  Attendance,
  InventoryItem,
  PayrollRecord,
  LeaveRequest,
  Policy,
} from './types.ts'
