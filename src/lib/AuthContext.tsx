import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { getSession, setSession, clearSession, type AuthUser } from './auth'

// ─── Context shape ────────────────────────────────────────────────────────────

type AuthContextValue = {
  user: AuthUser | null
  login: (user: AuthUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialise from localStorage so the session survives page refreshes
  const [user, setUser] = useState<AuthUser | null>(() => getSession())

  const login = useCallback((u: AuthUser) => {
    setSession(u)
    setUser(u)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/** Access the auth context from any component. Must be inside <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
