import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { CalendarOff, Check, X } from 'lucide-react'
import type { LeaveRequest, Employee } from '../../lib/types'
import { dbQuery } from '../../lib/dbClient'

export const getLeaveRequestsFn = async () => {
  const rows = await dbQuery(`
    SELECT l.*, e.first_name, e.last_name, e.department 
    FROM leave_requests l 
    JOIN employees e ON l.employee_id = e.id 
    ORDER BY l.created_at DESC
  `)
  return rows.map((r: any) => ({
    ...r,
    employees: { first_name: r.first_name, last_name: r.last_name, department: r.department }
  })) as (LeaveRequest & { employees: { first_name: string; last_name: string; department: string } })[]
}

export const getEmployeesFn = async () => {
  const rows = await dbQuery('SELECT * FROM employees ORDER BY first_name')
  return rows as Employee[]
}

export const updateLeaveStatusFn = async ({ data: { id, status } }: { data: { id: string; status: string } }) => {
  await dbQuery('UPDATE leave_requests SET status = $1 WHERE id = $2', [status, id])

  if (status === 'approved' || status === 'rejected' || status === 'cancelled') {
    const rows = await dbQuery('SELECT employee_id FROM leave_requests WHERE id = $1', [id])
    if (rows.length > 0) {
      const ticketStatus = status === 'approved' ? 'resolved' : 'closed'
      await dbQuery(
        `UPDATE support_tickets 
         SET status = $1, admin_notes = $2 
         WHERE employee_id = $3 AND category = 'leave' AND status IN ('new', 'open', 'pending')`,
        [ticketStatus, `Leave request was ${status}.`, rows[0].employee_id]
      )
    }
  }
}

export const saveLeaveRequestFn = async ({ data: payload }: { data: any }) => {
  await dbQuery(`
    INSERT INTO leave_requests (
      employee_id, leave_type, start_date, end_date, days, reason, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [
    payload.employee_id, payload.leave_type, payload.start_date, payload.end_date,
    payload.days, payload.reason, payload.status
  ])
}

export const Route = createFileRoute('/leave/')({ component: LeavePage })

const leaveTypeLabels: Record<string, string> = {
  annual: 'Annual Leave',
  sick: 'Sick Leave',
  personal: 'Personal Leave',
  unpaid: 'Unpaid Leave',
  maternity: 'Maternity Leave',
  paternity: 'Paternity Leave',
  permission: 'Permission (Hourly)',
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#e65100', bg: '#fff3e0' },
  approved: { label: 'Approved', color: '#2e7d32', bg: '#e8f5e9' },
  rejected: { label: 'Rejected', color: '#c62828', bg: '#ffebee' },
  cancelled: { label: 'Cancelled', color: '#757575', bg: '#f5f5f5' },
}

function LeavePage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all')

  const { data: requests, isLoading } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: () => getLeaveRequestsFn(),
  })

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => getEmployeesFn(),
  })

  const statusMutation = useMutation({
    mutationFn: (params: { id: string; status: string }) => updateLeaveStatusFn({ data: params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      queryClient.invalidateQueries({ queryKey: ['pending-leaves'] })
    },
  })

  const filtered = (requests ?? []).filter((r) => filter === 'all' || r.status === filter)

  const counts = {
    pending: requests?.filter((r) => r.status === 'pending').length ?? 0,
    approved: requests?.filter((r) => r.status === 'approved').length ?? 0,
    rejected: requests?.filter((r) => r.status === 'rejected').length ?? 0,
    total: requests?.length ?? 0,
  }

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Leave Tracking
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Manage time-off requests
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {['all', 'pending', 'approved', 'rejected'].map((f) => {
          const label = f === 'all' ? 'All' : statusConfig[f]?.label ?? f
          const count = f === 'all' ? counts.total : counts[f as keyof typeof counts]
          const isActive = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-md text-xs font-medium"
              style={{
                background: isActive ? 'var(--text-primary)' : 'var(--bg-subtle)',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
              }}
            >
              {label} ({count})
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div className="py-12 text-center" style={{ color: 'var(--text-tertiary)' }}>
          Loading requests...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg mb-3" style={{ background: 'var(--bg-subtle)' }}>
            <CalendarOff size={20} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            No leave requests found
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const sc = statusConfig[r.status]
            const emp = r.employees
            return (
              <div
                key={r.id}
                className="p-4 rounded-lg border flex items-start justify-between"
                style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                    style={{ background: 'var(--text-primary)' }}
                  >
                    {emp?.first_name?.[0]}{emp?.last_name?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {emp?.first_name} {emp?.last_name}
                    </p>
                    <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
                      {emp?.department} · {leaveTypeLabels[r.leave_type] || r.leave_type}
                    </p>
                    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {r.leave_type === 'permission' ? (
                        <span>{r.start_date?.split('T')[0]}</span>
                      ) : (
                        <span>{r.start_date?.split('T')[0]} → {r.end_date?.split('T')[0]}</span>
                      )}
                      {r.days > 0 && (
                        <>
                          <span>·</span>
                          <span>{r.days} day{r.days > 1 ? 's' : ''}</span>
                        </>
                      )}
                    </div>
                    {r.reason && (
                      <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                        {r.reason}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: sc.bg, color: sc.color }}>
                    {sc.label}
                  </span>
                  {r.status === 'pending' && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => statusMutation.mutate({ id: r.id, status: 'approved' })}
                        className="p-1.5 rounded hover:bg-[var(--bg-hover)]"
                        style={{ color: '#2e7d32' }}
                        title="Approve"
                      >
                        <Check size={15} />
                      </button>
                      <button
                        onClick={() => statusMutation.mutate({ id: r.id, status: 'rejected' })}
                        className="p-1.5 rounded hover:bg-[var(--bg-hover)]"
                        style={{ color: '#c62828' }}
                        title="Reject"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <LeaveForm
          employees={employees ?? []}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
            queryClient.invalidateQueries({ queryKey: ['pending-leaves'] })
          }}
        />
      )}
    </div>
  )
}

type FormProps = {
  employees: Employee[]
  onClose: () => void
  onSaved: () => void
}

function LeaveForm({ employees, onClose, onSaved }: FormProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    employee_id: '',
    leave_type: 'annual',
    start_date: '',
    end_date: '',
    reason: '',
  })

  const set = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const start = new Date(form.start_date)
    const end = new Date(form.end_date)
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)

    try {
      await saveLeaveRequestFn({ data: {
        employee_id: form.employee_id,
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        days,
        reason: form.reason || null,
        status: 'pending',
      }})
      setSaving(false)
      onSaved()
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 rounded-md border text-sm'
  const inputStyle = { borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text-primary)' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay"
      style={{ background: 'rgba(0,0,0,0.3)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-lg border modal-panel"
        style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Request Leave</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-hover)]">
            <X size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-md text-xs" style={{ background: '#ffebee', color: '#c62828' }}>
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Employee</label>
            <select className={inputClass} style={inputStyle} value={form.employee_id} onChange={(e) => set('employee_id', e.target.value)} required>
              <option value="">Select employee...</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Leave Type</label>
            <select className={inputClass} style={inputStyle} value={form.leave_type} onChange={(e) => set('leave_type', e.target.value)}>
              {Object.entries(leaveTypeLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Start Date</label>
              <input type="date" className={inputClass} style={inputStyle} value={form.start_date} onChange={(e) => set('start_date', e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>End Date</label>
              <input type="date" className={inputClass} style={inputStyle} value={form.end_date} onChange={(e) => set('end_date', e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Reason</label>
            <textarea className={inputClass} style={inputStyle} rows={2} value={form.reason} onChange={(e) => set('reason', e.target.value)} />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium border" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-md text-sm font-medium text-white" style={{ background: 'var(--text-primary)' }}>
              {saving ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
