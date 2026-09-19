import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'

export const Route = createFileRoute('/login')({ component: LoginPage })

function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      let data: any = {}
      const text = await res.text()
      try { data = JSON.parse(text) } catch {
        // Server returned non-JSON (e.g. HTML error page)
        setError(`Server error (${res.status}): ${text.slice(0, 120)}`)
        return
      }

      if (!res.ok) {
        setError(data.error ?? `Login failed (${res.status})`)
        return
      }
      login(data)
      router.navigate({ to: '/' })
    } catch (err: any) {
      // fetch() itself threw — true network error
      setError(`Network error: ${err?.message ?? 'Cannot connect to server'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg-subtle)' }}
    >
      <div
        className="w-full max-w-sm rounded-xl border p-8 fade-in"
        style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
      >
        {/* Logo / brand */}
        <div className="flex items-center gap-2.5 mb-8">
          <img src="/logo.png" alt="Logo" className="w-9 h-9 rounded-lg object-cover shadow-sm" />
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              ERP System
            </p>
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              Sign in to your account
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              className="px-3 py-2 rounded-md text-xs"
              style={{ background: '#ffebee', color: '#c62828' }}
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="login-email"
              className="text-xs font-medium mb-1.5 block"
              style={{ color: 'var(--text-secondary)' }}
            >
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-md border text-sm"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--bg)',
                color: 'var(--text-primary)',
              }}
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="text-xs font-medium mb-1.5 block"
              style={{ color: 'var(--text-secondary)' }}
            >
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-9 rounded-md border text-sm"
                style={{
                  borderColor: 'var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text-primary)',
                }}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded"
                style={{ color: 'var(--text-tertiary)' }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="login-submit"
            disabled={loading}
            className="w-full py-2 rounded-md text-sm font-medium text-white mt-2"
            style={{ background: 'var(--text-primary)' }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-[11px] mt-6 text-center" style={{ color: 'var(--text-tertiary)' }}>
          Contact your admin to get access
        </p>
      </div>
    </div>
  )
}
