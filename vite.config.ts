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
              `SELECT id, email, first_name, last_name, auth_role, password_hash
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
  },
})

export default config

