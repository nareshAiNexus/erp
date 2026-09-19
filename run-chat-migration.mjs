import pg from './node_modules/pg/lib/index.js'
import { readFileSync } from 'fs'
import { config } from 'dotenv'

config()

const { Pool } = pg
const db = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: false
})

const sql = readFileSync('./supabase/migrations/20260919_chat_schema.sql', 'utf8')

try {
  await db.query(sql)
  console.log('Migration applied successfully!')
} catch(e) {
  console.error('Error:', e.message)
} finally {
  await db.end()
}
