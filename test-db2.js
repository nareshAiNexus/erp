import 'dotenv/config';
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
pool.query(`
  SELECT l.*, e.first_name, e.last_name 
  FROM leave_requests l 
  JOIN employees e ON l.employee_id = e.id 
  WHERE l.status = 'pending' 
  ORDER BY l.created_at DESC 
  LIMIT 5
`).then(res => {
  console.log('Success:', res.rows);
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
