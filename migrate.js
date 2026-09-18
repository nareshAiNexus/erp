import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    await pool.query(`
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'todo';
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignees UUID[] DEFAULT '{}';
      
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS dob DATE;
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS bio TEXT;
    `);
    console.log("Migration successful");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
