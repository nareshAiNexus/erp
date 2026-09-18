import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/AuthContext'

export const Route = createFileRoute('/login')({ component: LoginPage })

function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Login failed')
        return
      }
      login(data)
      router.navigate({ to: '/' })
    } catch {
      setError('Network error — please try again')
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
          <div
            className="w-8 h-8 rounded flex items-center justify-center"
            style={{ background: 'var(--text-primary)' }}
          >
            <span className="text-white font-bold text-sm">E</span>
          </div>
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
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md border text-sm"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--bg)',
                color: 'var(--text-primary)',
              }}
              placeholder="••••••••"
            />
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
