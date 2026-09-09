import { Link, useRouterState } from '@tanstack/react-router'
import { LayoutDashboard, Users, CalendarCheck, Package, Wallet, CalendarOff, FileText } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/employees', label: 'Employees', icon: Users },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/payroll', label: 'Payroll', icon: Wallet },
  { to: '/leave', label: 'Leave Tracking', icon: CalendarOff },
  { to: '/policies', label: 'Policies', icon: FileText },
]

export function Sidebar() {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  return (
    <aside
      className="w-60 shrink-0 border-r flex flex-col"
      style={{ borderColor: 'var(--sidebar-border)', background: 'var(--sidebar-bg)' }}
    >
      <div className="px-5 py-6">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded flex items-center justify-center"
            style={{ background: 'var(--text-primary)' }}
          >
            <span className="text-white font-bold text-sm">E</span>
          </div>
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
              className="flex items-center gap-3 px-3 py-2 rounded-md mb-0.5 text-sm"
              style={{
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive ? 'var(--bg-hover)' : 'transparent',
                fontWeight: isActive ? 600 : 400,
              }}
            >
              <Icon size={16} strokeWidth={1.75} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
        <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          Local deployment
        </p>
        <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          v1.0.0
        </p>
      </div>
    </aside>
  )
}
