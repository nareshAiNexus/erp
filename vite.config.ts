import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// ─── Helper: parse request body as JSON ─────────────────────────────────────
function readBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk: any) => (raw += chunk.toString()))
    req.on('end', () => {
      try { resolve(JSON.parse(raw)) } catch { reject(new Error('Invalid JSON')) }
    })
  })
}

// ─── Helper: send JSON response ──────────────────────────────────────────────
function sendJson(res: any, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

// ─── Vite plugin: all /api/* endpoints ──────────────────────────────────────
function apiPlugin() {
  return {
    name: 'api-plugin',
    configureServer(server: any) {

      // POST /api/query — generic pass-through DB query
      server.middlewares.use('/api/query', (req: any, res: any, next: any) => {
        if (req.method !== 'POST') return next()
        readBody(req).then(async ({ text, values }) => {
          try {
            const { db } = await import('./src/lib/db.js')
            const result = await db.query(text, values)
            sendJson(res, 200, result.rows)
          } catch (err: any) {
            sendJson(res, 500, { error: err.message })
          }
        }).catch(() => sendJson(res, 400, { error: 'Invalid request body' }))
      })

      // POST /api/auth/login — verify email + password, return session user
      server.middlewares.use('/api/auth/login', (req: any, res: any, next: any) => {
        if (req.method !== 'POST') return next()
        readBody(req).then(async ({ email, password }) => {
          try {
            if (!email || !password) return sendJson(res, 400, { error: 'Email and password required' })
            const { db } = await import('./src/lib/db.js')
            const result = await db.query(
              `SELECT id, email, first_name, last_name, auth_role, password_hash, avatar_url
               FROM employees WHERE email = $1 AND status != 'terminated' LIMIT 1`,
              [email]
            )
            const row = result.rows[0]
            if (!row || !row.password_hash) return sendJson(res, 401, { error: 'Invalid email or password' })
            const bcrypt = await import('bcryptjs')
            const valid = await bcrypt.compare(password, row.password_hash)
            if (!valid) return sendJson(res, 401, { error: 'Invalid email or password' })
            
            // Auto check-in attendance for today
            await db.query(`
              INSERT INTO attendance (employee_id, date, status, check_in)
              SELECT $1, CURRENT_DATE, 'present', CURRENT_TIME
              WHERE NOT EXISTS (
                SELECT 1 FROM attendance WHERE employee_id = $1 AND date = CURRENT_DATE
              )
            `, [row.id])
            
            sendJson(res, 200, {
              id: row.id,
              email: row.email,
              first_name: row.first_name,
              last_name: row.last_name,
              auth_role: row.auth_role ?? 'user',
              avatar_url: row.avatar_url,
            })
          } catch (err: any) {
            sendJson(res, 500, { error: err.message })
          }
        }).catch(() => sendJson(res, 400, { error: 'Invalid request body' }))
      })

      // POST /api/auth/set-password — hash + store password for an employee
      server.middlewares.use('/api/auth/set-password', (req: any, res: any, next: any) => {
        if (req.method !== 'POST') return next()
        readBody(req).then(async ({ employee_id, password, auth_role }) => {
          try {
            if (!employee_id || !password) return sendJson(res, 400, { error: 'employee_id and password required' })
            const bcrypt = await import('bcryptjs')
            const hash = await bcrypt.hash(password, 10)
            const { db } = await import('./src/lib/db.js')
            await db.query(
              `UPDATE employees SET password_hash = $1, auth_role = $2 WHERE id = $3`,
              [hash, auth_role ?? 'user', employee_id]
            )
            sendJson(res, 200, { ok: true })
          } catch (err: any) {
            sendJson(res, 500, { error: err.message })
          }
        }).catch(() => sendJson(res, 400, { error: 'Invalid request body' }))
      })
      // POST /api/inventory/credentials
      server.middlewares.use('/api/inventory/credentials', (req: any, res: any, next: any) => {
        if (req.method !== 'POST') return next()
        readBody(req).then(async ({ asset_id, user_id }) => {
          try {
            if (!asset_id || !user_id) return sendJson(res, 400, { error: 'Missing required parameters' })
            const { db } = await import('./src/lib/db.js')
            const userResult = await db.query('SELECT auth_role FROM employees WHERE id = $1', [user_id])
            if (userResult.rows.length === 0) return sendJson(res, 404, { error: 'User not found' })
            const role = userResult.rows[0].auth_role
            if (role !== 'admin' && role !== 'sysadmin') return sendJson(res, 403, { error: 'Access denied: Sysadmin privileges required to view credentials.' })
            const credResult = await db.query('SELECT * FROM asset_credentials WHERE asset_id = $1', [asset_id])
            if (credResult.rows.length === 0) return sendJson(res, 200, { data: null })
            sendJson(res, 200, { data: credResult.rows[0] })
          } catch (err: any) {
            sendJson(res, 500, { error: err.message })
          }
        }).catch(() => sendJson(res, 400, { error: 'Invalid request body' }))
      })

      // POST /api/inventory/asset
      server.middlewares.use('/api/inventory/asset', (req: any, res: any, next: any) => {
        if (req.method !== 'POST') return next()
        readBody(req).then(async (body) => {
          try {
            const { category, asset_type, model_name, operating_system, ram, storage_raw, storage_total_gb, storage_available_gb, processor, working_condition, other_product_name_id, quantity, purchase_date, price, department_id, allotted_employee_id, status, asset_tag } = body
            if (!category || !asset_type) return sendJson(res, 400, { error: 'Category and Asset Type are required' })
            if (category === 'system' && (!ram || !operating_system || !processor)) return sendJson(res, 400, { error: 'System assets must include RAM, OS, and Processor' })
            if (category === 'electronics' && !working_condition) return sendJson(res, 400, { error: 'Electronics assets must include Working Condition' })
            if (category === 'other' && (!other_product_name_id || !quantity)) return sendJson(res, 400, { error: 'Other assets must include a Product Name and Quantity' })

            const { db } = await import('./src/lib/db.js')
            const result = await db.query(
              `INSERT INTO assets (asset_tag, category, asset_type, model_name, operating_system, ram, storage_raw, storage_total_gb, storage_available_gb, processor, working_condition, other_product_name_id, quantity, purchase_date, price, department_id, allotted_employee_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING id`,
              [asset_tag || null, category, asset_type, model_name || null, operating_system || null, ram || null, storage_raw || null, storage_total_gb || null, storage_available_gb || null, processor || null, working_condition || null, other_product_name_id || null, quantity || null, purchase_date || null, price || null, department_id || null, allotted_employee_id || null, status || 'active']
            )
            sendJson(res, 200, { data: result.rows[0] })
          } catch (err: any) {
            sendJson(res, 500, { error: err.message })
          }
        }).catch(() => sendJson(res, 400, { error: 'Invalid request body' }))
      })

      // POST /api/inventory/audit
      server.middlewares.use('/api/inventory/audit', (req: any, res: any, next: any) => {
        if (req.method !== 'POST') return next()
        readBody(req).then(async (body) => {
          try {
            const { asset_id, audit_date, auditor, department_at_audit, allotted_employee_at_audit, ram_at_audit, storage_raw_at_audit, processor_at_audit, os_at_audit, keyboard_issued, mouse_issued, stand_issued, monitor_issued, charger_issued, bag_issued, condition_at_audit, observations, physical_status_at_audit } = body
            if (!asset_id || !audit_date || !auditor) return sendJson(res, 400, { error: 'Asset ID, Audit Date, and Auditor are required' })

            const { db } = await import('./src/lib/db.js')
            const result = await db.query(
              `INSERT INTO audits (asset_id, audit_date, auditor, department_at_audit, allotted_employee_at_audit, ram_at_audit, storage_raw_at_audit, processor_at_audit, os_at_audit, keyboard_issued, mouse_issued, stand_issued, monitor_issued, charger_issued, bag_issued, condition_at_audit, observations, physical_status_at_audit) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING id`,
              [asset_id, audit_date, auditor, department_at_audit || null, allotted_employee_at_audit || null, ram_at_audit || null, storage_raw_at_audit || null, processor_at_audit || null, os_at_audit || null, keyboard_issued || false, mouse_issued || false, stand_issued || false, monitor_issued || false, charger_issued || false, bag_issued || false, condition_at_audit || null, observations || null, physical_status_at_audit || null]
            )
            sendJson(res, 200, { data: result.rows[0] })
          } catch (err: any) {
            sendJson(res, 500, { error: err.message })
          }
        }).catch(() => sendJson(res, 400, { error: 'Invalid request body' }))
      })
    }
  }
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [devtools(), tailwindcss(), viteReact(), apiPlugin()],
  // Prevent Node.js-only packages from being bundled for the browser
  optimizeDeps: {
    exclude: ['pg', 'dotenv', 'pg-native', 'bcryptjs'],
  },
  build: {
    rollupOptions: {
      external: ['pg', 'dotenv/config', 'pg-native', 'bcryptjs'],
    },
  },
  server: {
    // Make sure /api/* is never passed to the SPA fallback
    fs: { strict: false },
    proxy: {
      // Forward Socket.IO to the standalone chat server
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
      // Forward chat REST API to the standalone chat server
      '/api/chat': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})

export default config

