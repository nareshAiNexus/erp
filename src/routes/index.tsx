/**
 * Index route — role-aware dashboard entry point.
 *
 * - admin → AdminEmployeeDashboard (employee presence grid)
 * - user  → UserCalendarDashboard  (attendance calendar)
 */
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '../lib/AuthContext'
import { UserCalendarDashboard } from '../components/UserCalendarDashboard'
import { AdminEmployeeDashboard } from '../components/AdminEmployeeDashboard'

export const Route = createFileRoute('/')({ component: IndexPage })

function IndexPage() {
  const { user } = useAuth()

  // Should not happen — root layout redirects to /login when no user
  if (!user) return null

  if (user.auth_role === 'admin') {
    return <AdminEmployeeDashboard />
  }

  return <UserCalendarDashboard user={user} />
}
