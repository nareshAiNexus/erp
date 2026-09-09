import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Users, CalendarCheck, Package, Wallet, ArrowRight } from 'lucide-react'
import { dbQuery } from '../lib/dbClient'

export const getEmployeeCountFn = async () => {
  const rows = await dbQuery('SELECT count(*) FROM employees')
  return parseInt(rows[0].count, 10)
}

export const getPresentTodayFn = async () => {
  const today = new Date().toISOString().split('T')[0]
  const rows = await dbQuery(
    `SELECT count(*) FROM attendance WHERE date = $1 AND status IN ('present', 'late', 'remote')`, 
    [today]
  )
  return parseInt(rows[0].count, 10)
}

export const getLowStockCountFn = async () => {
  const rows = await dbQuery('SELECT count(*) FROM inventory_items WHERE quantity <= reorder_level')
  return parseInt(rows[0].count, 10)
}

export const getPendingPayrollFn = async () => {
  const rows = await dbQuery(`SELECT count(*) FROM payroll_records WHERE status = 'pending'`)
  return parseInt(rows[0].count, 10)
}

export const getPendingLeavesFn = async () => {
  const rows = await dbQuery(`
    SELECT l.*, e.first_name, e.last_name 
    FROM leave_requests l 
    JOIN employees e ON l.employee_id = e.id 
    WHERE l.status = 'pending' 
    ORDER BY l.created_at DESC 
    LIMIT 5
  `)
  return rows.map((r: any) => ({
    ...r,
    employees: { first_name: r.first_name, last_name: r.last_name }
  }))
}

export const Route = createFileRoute('/')({ component: Dashboard })

function Dashboard() {
  const { data: employeeCount } = useQuery({
    queryKey: ['employee-count'],
    queryFn: () => getEmployeeCountFn(),
  })

  const { data: presentToday } = useQuery({
    queryKey: ['present-today'],
    queryFn: () => getPresentTodayFn(),
  })

  const { data: lowStockCount } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => getLowStockCountFn(),
  })

  const { data: pendingPayroll } = useQuery({
    queryKey: ['pending-payroll'],
    queryFn: () => getPendingPayrollFn(),
  })

  const { data: pendingLeaves } = useQuery({
    queryKey: ['pending-leaves'],
    queryFn: () => getPendingLeavesFn(),
  })

  const stats = [
    { label: 'Total Employees', value: employeeCount ?? '—', icon: Users, link: '/employees' },
    { label: 'Present Today', value: presentToday ?? '—', icon: CalendarCheck, link: '/attendance' },
    { label: 'Low Stock Items', value: lowStockCount ?? '—', icon: Package, link: '/inventory' },
    { label: 'Pending Payroll', value: pendingPayroll ?? '—', icon: Wallet, link: '/payroll' },
  ]

  return (
    <div className="fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Overview of your organization's key metrics
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.label}
              to={stat.link}
              className="block p-5 rounded-lg border slide-up"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--bg)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-md flex items-center justify-center"
                  style={{ background: 'var(--bg-subtle)' }}
                >
                  <Icon size={18} strokeWidth={1.75} style={{ color: 'var(--text-primary)' }} />
                </div>
              </div>
              <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {stat.value}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                {stat.label}
              </p>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          className="p-6 rounded-lg border"
          style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Pending Leave Requests
            </h2>
            <Link
              to="/leave"
              className="flex items-center gap-1 text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {(pendingLeaves ?? []).length === 0 ? (
            <p className="text-sm py-4" style={{ color: 'var(--text-tertiary)' }}>
              No pending leave requests
            </p>
          ) : (
            <div className="space-y-2">
              {(pendingLeaves ?? []).map((leave) => {
                const emp = leave.employees as unknown as { first_name: string; last_name: string }
                return (
                  <div
                    key={leave.id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-md"
                    style={{ background: 'var(--bg-subtle)' }}
                  >
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {emp?.first_name} {emp?.last_name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {leave.leave_type} · {leave.days} day{leave.days > 1 ? 's' : ''}
                      </p>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                    >
                      {leave.start_date}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div
          className="p-6 rounded-lg border"
          style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Quick Actions
            </h2>
          </div>
          <div className="space-y-2">
            <Link
              to="/employees"
              className="flex items-center justify-between py-3 px-3 rounded-md hover:bg-[var(--bg-subtle)]"
            >
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                Manage Employees
              </span>
              <ArrowRight size={14} style={{ color: 'var(--text-tertiary)' }} />
            </Link>
            <Link
              to="/attendance"
              className="flex items-center justify-between py-3 px-3 rounded-md hover:bg-[var(--bg-subtle)]"
            >
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                View Attendance
              </span>
              <ArrowRight size={14} style={{ color: 'var(--text-tertiary)' }} />
            </Link>
            <Link
              to="/payroll"
              className="flex items-center justify-between py-3 px-3 rounded-md hover:bg-[var(--bg-subtle)]"
            >
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                Process Payroll
              </span>
              <ArrowRight size={14} style={{ color: 'var(--text-tertiary)' }} />
            </Link>
            <Link
              to="/policies"
              className="flex items-center justify-between py-3 px-3 rounded-md hover:bg-[var(--bg-subtle)]"
            >
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                Review Policies
              </span>
              <ArrowRight size={14} style={{ color: 'var(--text-tertiary)' }} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
