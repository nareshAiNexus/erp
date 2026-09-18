/**
 * AdminEmployeeDashboard
 *
 * Shows all employees as small cards with a present/absent badge
 * based on today's attendance record. Includes a search filter.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Users } from 'lucide-react'
import { dbQuery } from '../lib/dbClient'
import { Link } from '@tanstack/react-router'

// ─── Types ────────────────────────────────────────────────────────────────────

type EmployeePresence = {
  id: string
  first_name: string
  last_name: string
  department: string | null
  role: string | null
  avatar_url: string | null
  // present if there is an attendance row today with status in (present, late, remote)
  present: boolean
  attendance_status: string | null
}

// ─── Status badge styles ──────────────────────────────────────────────────────

function presenceBadge(status: string | null) {
  if (!status) return { label: 'Absent', bg: '#ffebee', color: '#c62828' }
  switch (status) {
    case 'present': return { label: 'Present', bg: '#e6f4ea', color: '#1e7e34' }
    case 'late':    return { label: 'Late',    bg: '#fff3e0', color: '#e65100' }
    case 'remote':  return { label: 'Remote',  bg: '#ede7f6', color: '#4527a0' }
    case 'half_day':return { label: 'Half Day',bg: '#e3f2fd', color: '#1565c0' }
    default:        return { label: 'Absent',  bg: '#ffebee', color: '#c62828' }
  }
}

/** Generate a simple avatar initials from first + last name. */
function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

/** Deterministic bg color based on name. */
const AVATAR_COLORS = ['#d0e4f7', '#d4edda', '#f5e6d3', '#e8d5f5', '#fde8e8', '#d5f0f0']
function avatarBg(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + (hash << 5) - hash
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ─── Employee Card ────────────────────────────────────────────────────────────

function EmployeeCard({ emp }: { emp: EmployeePresence }) {
  const badge = presenceBadge(emp.attendance_status)

  return (
    <div
      className="p-4 rounded-xl border flex flex-col gap-3 slide-up"
      style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
    >
      {/* Avatar + presence badge */}
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
          style={{ background: avatarBg(emp.id), color: '#444' }}
        >
          {initials(emp.first_name, emp.last_name)}
        </div>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{ background: badge.bg, color: badge.color }}
        >
          {badge.label}
        </span>
      </div>

      {/* Name + role */}
      <div>
        <p className="text-sm font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
          {emp.first_name} {emp.last_name}
        </p>
        {emp.role && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {emp.role}
          </p>
        )}
        {emp.department && (
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {emp.department}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminEmployeeDashboard() {
  const [search, setSearch] = useState('')
  const today = new Date().toISOString().split('T')[0]

  // Fetch all active employees + today's attendance in one query via LEFT JOIN
  const { data: employees = [], isLoading } = useQuery<EmployeePresence[]>({
    queryKey: ['admin-presence', today],
    queryFn: async () => {
      const rows = await dbQuery(
        `SELECT
           e.id, e.first_name, e.last_name, e.department, e.role, e.avatar_url,
           a.status AS attendance_status
         FROM employees e
         LEFT JOIN attendance a
           ON a.employee_id = e.id AND a.date = $1
         WHERE e.status = 'active'
         ORDER BY e.first_name, e.last_name`,
        [today]
      )
      return rows.map((r: any) => ({
        ...r,
        present: ['present', 'late', 'remote', 'half_day'].includes(r.attendance_status),
      }))
    },
  })

  // Stats
  const presentCount = employees.filter(e => e.present).length
  const absentCount = employees.length - presentCount

  const filtered = search.trim()
    ? employees.filter(e =>
        `${e.first_name} ${e.last_name} ${e.department ?? ''} ${e.role ?? ''}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    : employees

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Employees
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Today's attendance — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Link
          to="/employees"
          className="text-xs px-3 py-1.5 rounded-md border"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          Manage
        </Link>
      </div>

      {/* Summary stats */}
      <div className="flex gap-4 mb-6">
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border"
          style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
        >
          <Users size={14} style={{ color: 'var(--text-secondary)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{employees.length}</span>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total</span>
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border"
          style={{ borderColor: '#c8e6c9', background: '#e8f5e9' }}
        >
          <span className="text-sm font-semibold" style={{ color: '#2e7d32' }}>{presentCount}</span>
          <span className="text-xs" style={{ color: '#2e7d32' }}>Present</span>
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border"
          style={{ borderColor: '#ffcdd2', background: '#ffebee' }}
        >
          <span className="text-sm font-semibold" style={{ color: '#c62828' }}>{absentCount}</span>
          <span className="text-xs" style={{ color: '#c62828' }}>Absent</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-xs">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
        <input
          id="admin-employee-search"
          type="text"
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-2 rounded-md border text-sm"
          style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text-primary)' }}
        />
      </div>

      {/* Employee cards grid */}
      {isLoading ? (
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          {search ? 'No employees match your search' : 'No active employees found'}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map(emp => (
            <EmployeeCard key={emp.id} emp={emp} />
          ))}
        </div>
      )}
    </div>
  )
}
