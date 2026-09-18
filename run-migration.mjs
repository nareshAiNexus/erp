import { readFileSync } from 'fs'
import pkg from 'pg'
import dotenv from 'dotenv'
const { Pool } = pkg

dotenv.config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

async function run() {
  const sql = readFileSync('database/migration_tasks.sql', 'utf-8')
  await pool.query(sql)
  console.log('Migration completed successfully.')
  process.exit(0)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
