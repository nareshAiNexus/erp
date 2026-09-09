import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Minimal Vite plugin to serve our SQL endpoint (server-side only)
function apiPlugin() {
  return {
    name: 'api-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/query', (req: any, res: any, next: any) => {
        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: any) => body += chunk.toString())
          req.on('end', async () => {
            try {
              const { db } = await import('./src/lib/db.js')
              const { text, values } = JSON.parse(body)
              const result = await db.query(text, values)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(result.rows))
            } catch (err: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
            }
          })
          return
        }
        next()
      })
    }
  }
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [devtools(), tailwindcss(), viteReact(), apiPlugin()],
  // Prevent Node.js-only packages from being bundled for the browser
  optimizeDeps: {
    exclude: ['pg', 'dotenv', 'pg-native'],
  },
  build: {
    rollupOptions: {
      external: ['pg', 'dotenv/config', 'pg-native'],
    },
  },
  server: {
    // Make sure /api/query is never passed to the SPA fallback
    fs: { strict: false },
  },
})

export default config
