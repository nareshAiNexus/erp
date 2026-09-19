// Auth session helpers — browser-only (localStorage).
// No Node.js imports. Safe to import from any client/route file.

export type AuthUser = {
  id: string
  email: string
  first_name: string
  last_name: string
  auth_role: 'user' | 'admin'
  avatar_url?: string | null
}

const SESSION_KEY = 'erp_session'

/** Read the current session from localStorage. Returns null if not logged in. */
export function getSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

/** Persist a session to localStorage after successful login. */
export function setSession(user: AuthUser): void {
  try {
    const { avatar_url, ...safeUser } = user
    localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser))
  } catch (err) {
    console.warn('Failed to save session to localStorage (quota exceeded?)', err)
  }
}

/** Remove the session (logout). */
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}
