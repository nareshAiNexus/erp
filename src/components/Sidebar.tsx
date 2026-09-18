/**
 * Sidebar — role-aware navigation.
 *
 * - admin: sees all nav items (Dashboard, Employees, Attendance, Inventory, Payroll, Leave, Policies)
 * - user:  sees only Dashboard (their personal calendar)
 * - Both: logout button at the bottom
 */
import { Link, useRouterState, useRouter } from '@tanstack/react-router'
import { LayoutDashboard, Users, CalendarCheck, Package, Wallet, CalendarOff, FileText, LogOut, Ticket, CheckSquare } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../lib/AuthContext'
import { NotificationBell } from './NotificationBell'
import { dbQuery } from '../lib/dbClient'

const ADMIN_NAV = [
  { to: '/',           label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/employees',  label: 'Employees',    icon: Users },
  { to: '/attendance', label: 'Attendance',   icon: CalendarCheck },
  { to: '/inventory',  label: 'Inventory',    icon: Package },
  { to: '/payroll',    label: 'Payroll',      icon: Wallet },
  { to: '/leave',      label: 'Leave',        icon: CalendarOff },
  { to: '/policies',   label: 'Policies',     icon: FileText },
  { to: '/tickets',    label: 'Tickets',      icon: Ticket },
  { to: '/tasks',      label: 'Tasks',        icon: CheckSquare },
]

const USER_NAV = [
  { to: '/',         label: 'My Calendar', icon: LayoutDashboard },
  { to: '/policies', label: 'Policies',    icon: FileText },
  { to: '/tickets',  label: 'My Tickets',  icon: Ticket },
  { to: '/tasks',    label: 'Tasks',       icon: CheckSquare },
]

export function Sidebar() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  const isAdmin = user?.auth_role === 'admin'
  const navItems = isAdmin ? ADMIN_NAV : USER_NAV

  const { data: pendingLeavesCount = 0 } = useQuery({
    queryKey: ['pending-leaves-count'],
    queryFn: async () => {
      const rows = await dbQuery("SELECT count(*) as count FROM leave_requests WHERE status = 'pending'")
      return parseInt(rows[0]?.count || '0', 10)
    },
    enabled: isAdmin,
    refetchInterval: 30000,
  })

  const handleLogout = () => {
    logout()
    router.navigate({ to: '/login' })
  }

  return (
    <aside
      className="w-60 shrink-0 border-r flex flex-col"
      style={{ borderColor: 'var(--sidebar-border)', background: 'var(--sidebar-bg)' }}
    >
      {/* Brand */}
      <div className="px-5 py-6">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded object-cover shadow-sm" />
          <div>
            <h1 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              ERP System
            </h1>
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              Enterprise Resource
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2">
        {navItems.map((item) => {
          const isActive =
            item.to === '/'
              ? currentPath === '/'
              : currentPath.startsWith(item.to)
          const Icon = item.icon

          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center justify-between px-3 py-2 rounded-md mb-0.5 text-sm"
              style={{
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive ? 'var(--bg-hover)' : 'transparent',
                fontWeight: isActive ? 600 : 400,
              }}
            >
              <div className="flex items-center gap-3">
                <Icon size={16} strokeWidth={1.75} />
                <span>{item.label}</span>
              </div>
              {item.to === '/leave' && pendingLeavesCount > 0 && (
                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-md text-[10px] font-bold text-white bg-gray-500">
                  {pendingLeavesCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: user info + logout */}
      <div className="px-4 py-4 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
        {user && (
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>
                {user.first_name} {user.last_name}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                {user.auth_role === 'admin' ? 'Administrator' : 'Employee'}
              </p>
            </div>
            <NotificationBell employeeId={user.id} />
          </div>
        )}
        <button
          id="sidebar-logout"
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs w-full px-2 py-1.5 rounded-md hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
