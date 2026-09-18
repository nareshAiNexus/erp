/**
 * UserCalendarDashboard — full-viewport calendar
 *
 * The grid occupies the ENTIRE remaining viewport height (100vh minus
 * the sidebar header + toolbar). Each cell equally shares the height.
 * Uses CSS `gridAutoRows: 1fr` inside a fixed-height container.
 *
 * Leave / permission requests also raise a support ticket + notify admins.
 * Policies are shown in a separate scrollable section below.
 */
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, X, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { dbQuery } from '../lib/dbClient'
import type { AuthUser } from '../lib/auth'
import { Link } from '@tanstack/react-router'
import { notifyAdmins, createNotification } from '../lib/notifications'
import { TimePicker } from './TimePicker'

// ─── Types ────────────────────────────────────────────────────────────────────

type AttendanceRow = { date: string; status: string }
type LeaveRow = { id: string; start_date: string; end_date: string; leave_type: string; status: string }
type PolicyRow = { id: string; title: string; category: string; version: string; effective_date: string | null }

type CalEvent = {
  key: string
  label: string
  dot: string
  bar: string
  text: string
  onClick?: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay   = new Date(year, month, 1)
  const startOff   = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < startOff; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']
const DAY_HEADERS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

// ─── Event colours ────────────────────────────────────────────────────────────

const ATTENDANCE_EVENTS: Record<string, CalEvent> = {
  present:  { key:'present',  label:'Present',   dot:'#16a34a', bar:'#dcfce7', text:'#15803d' },
  late:     { key:'late',     label:'Late',       dot:'#d97706', bar:'#fef3c7', text:'#92400e' },
  remote:   { key:'remote',   label:'Remote',     dot:'#7c3aed', bar:'#ede9fe', text:'#5b21b6' },
  half_day: { key:'half_day', label:'Half Day',   dot:'#2563eb', bar:'#dbeafe', text:'#1d4ed8' },
  absent:   { key:'absent',   label:'Absent',     dot:'#dc2626', bar:'#fee2e2', text:'#991b1b' },
}

const LEAVE_BAR: Record<string, { bar: string; text: string; dot: string }> = {
  annual:    { bar:'#dbeafe', text:'#1d4ed8', dot:'#3b82f6' },
  sick:      { bar:'#fee2e2', text:'#991b1b', dot:'#ef4444' },
  personal:  { bar:'#ede9fe', text:'#5b21b6', dot:'#8b5cf6' },
  unpaid:    { bar:'#f3f4f6', text:'#374151', dot:'#9ca3af' },
  maternity: { bar:'#fce7f3', text:'#9d174d', dot:'#ec4899' },
  paternity: { bar:'#ecfdf5', text:'#065f46', dot:'#10b981' },
}

function leaveEvent(leave: LeaveRow): CalEvent {
  const c = LEAVE_BAR[leave.leave_type] ?? { bar:'#fef9c3', text:'#713f12', dot:'#f59e0b' }
  const approved = leave.status === 'approved'
  return {
    key: leave.id,
    label: `${leave.leave_type.charAt(0).toUpperCase()+leave.leave_type.slice(1)} leave${approved ? '' : ` (${leave.status})`}`,
    dot:  approved ? '#16a34a' : c.dot,
    bar:  approved ? '#dcfce7' : c.bar,
    text: approved ? '#15803d' : c.text,
  }
}

const CAT_CFG: Record<string, { label: string; bg: string; text: string }> = {
  hr:         { label:'HR',         bg:'#dbeafe', text:'#1e40af' },
  it:         { label:'IT',         bg:'#f3e8ff', text:'#7e22ce' },
  finance:    { label:'Finance',    bg:'#dcfce7', text:'#166534' },
  operations: { label:'Operations', bg:'#fff7ed', text:'#9a3412' },
  security:   { label:'Security',   bg:'#fee2e2', text:'#991b1b' },
  general:    { label:'General',    bg:'#f3f4f6', text:'#374151' },
}

// ─── Leave / Permission Modal ─────────────────────────────────────────────────

function LeaveModal({ date, employee, onClose, onSaved }: { date: Date, employee: AuthUser, onClose: () => void, onSaved: () => void }) {
  const [type, setType]         = useState<'leave'|'permission'|'task'>('leave')
  const [leaveType, setLeaveType] = useState('annual')
  
  const startISO = toISO(date)
  const [endDate, setEndDate]   = useState(startISO)
  const [startTime, setStartTime] = useState('09:00 AM')
  const [endTime, setEndTime]     = useState('11:00 AM')
  const [reason, setReason]     = useState('')
  
  const [taskTitle, setTaskTitle] = useState('')
  const [taskTime, setTaskTime] = useState('09:00 AM')
  const [taggedEmployeeIds, setTaggedEmployeeIds] = useState<string[]>([])
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string|null>(null)

  const { data: employees = [] } = useQuery({
    queryKey: ['active-employees-tagging'],
    queryFn: () => dbQuery("SELECT id, first_name, last_name FROM employees WHERE status = 'active' ORDER BY first_name")
  })

  const submit = async () => {
    setSaving(true); setError(null)
    try {
      if (type === 'task') {
        if (!taskTitle.trim()) throw new Error('Task title is required')
        // convert taskTime '09:00 AM' to time '09:00:00'
        const match = taskTime.match(/(\d+):(\d+)\s+(AM|PM)/i)
        let timeStr = '00:00:00'
        if (match) {
          let h = parseInt(match[1])
          const m = match[2]
          const isPm = match[3].toUpperCase() === 'PM'
          if (isPm && h < 12) h += 12
          if (!isPm && h === 12) h = 0
          timeStr = `${String(h).padStart(2, '0')}:${m}:00`
        }

        await dbQuery(
          `INSERT INTO tasks (employee_id, title, description, due_date, due_time)
           VALUES ($1, $2, $3, $4, $5)`,
          [employee.id, taskTitle, reason || null, startISO, timeStr]
        )

        // Tagged employees
        for (const tagId of taggedEmployeeIds) {
          await dbQuery(
            `INSERT INTO tasks (employee_id, title, description, due_date, due_time)
             VALUES ($1, $2, $3, $4, $5)`,
            [tagId, taskTitle, reason || null, startISO, timeStr]
          )
          await createNotification(
            tagId, 
            'task', 
            `${employee.first_name} ${employee.last_name} assigned you a task: ${taskTitle}`
          )
        }
      } else {
        const lt  = type === 'permission' ? 'permission' : leaveType
        const end = type === 'permission' ? startISO : endDate
        const days = type === 'permission' ? 0 : Math.max(1, Math.round((new Date(end).getTime() - new Date(startISO).getTime()) / 86400000) + 1)
        
        const finalReason = type === 'permission' 
          ? `[${startTime} - ${endTime}] ${reason}`.trim()
          : reason || null

        // 1. Insert leave request
        await dbQuery(
          `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, days, reason, status)
           VALUES ($1,$2,$3,$4,$5,$6,'pending')`,
          [employee.id, lt, startISO, end, days, finalReason]
        )

        // 2. Also raise as a support ticket so admins see it in the ticket board
        const ticketTitle = type === 'permission'
          ? `Day-off Permission: ${startISO} (${startTime} - ${endTime})`
          : `${lt.charAt(0).toUpperCase()+lt.slice(1)} Leave: ${startISO} → ${end} (${days}d)`
        const rows: { id: string }[] = await dbQuery(
          `INSERT INTO support_tickets (employee_id, title, description, category, priority)
           VALUES ($1,$2,$3,'leave','medium') RETURNING id`,
          [employee.id, ticketTitle, reason || null]
        )
        const ticketId = rows[0]?.id

        // 3. Notify all admins
        const name = `${employee.first_name} ${employee.last_name}`
        await notifyAdmins(
          'leave_request',
          `${name} requested ${type === 'permission' ? `permission from ${startTime} to ${endTime}` : `${lt} leave`} on ${startISO}.`,
          ticketId
        )
      }

      onSaved()
    } catch(e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const inp  = 'w-full px-3 py-2 rounded-lg border text-sm'
  const inpS = { borderColor:'#e5e7eb', background:'white', color:'#111827' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:'rgba(0,0,0,0.4)' }}
      onMouseDown={(e)=>{ if(e.target===e.currentTarget) onClose() }}>
      <div className="w-full max-w-sm rounded-2xl border shadow-2xl bg-white" style={{ borderColor:'#e5e7eb' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor:'#e5e7eb' }}>
          <div>
            <p className="text-[11px] font-medium mb-0.5" style={{ color:'#9ca3af' }}>
              {date.toLocaleDateString('en-IN',{weekday:'long'})}
            </p>
            <h2 className="text-sm font-semibold" style={{ color:'#111827' }}>
              {date.toLocaleDateString('en-IN',{day:'numeric', month:'long', year:'numeric'})}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={14} style={{ color:'#6b7280' }} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="px-3 py-2 rounded-lg text-xs bg-red-50 text-red-700">{error}</div>}

          <div className="flex gap-1 p-1 rounded-lg bg-gray-100">
            {(['leave','permission','task'] as const).map(t=>(
              <button key={t} onClick={()=>setType(t)}
                className="flex-1 py-1.5 rounded-md text-xs font-medium transition-all"
                style={{
                  background: type===t ? 'white' : 'transparent',
                  color: type===t ? '#111827' : '#6b7280',
                  boxShadow: type===t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}>
                {t==='leave' ? 'Apply Leave' : t==='permission' ? 'Permission' : 'Add Task'}
              </button>
            ))}
          </div>

          {type==='leave' && <>
            <div>
              <label className="text-xs font-medium mb-1.5 block text-gray-500">Leave Type</label>
              <select className={inp} style={inpS} value={leaveType} onChange={e=>setLeaveType(e.target.value)}>
                <option value="annual">Annual</option>
                <option value="sick">Sick</option>
                <option value="personal">Personal</option>
                <option value="unpaid">Unpaid</option>
                <option value="maternity">Maternity</option>
                <option value="paternity">Paternity</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block text-gray-500">End Date</label>
              <input type="date" className={inp} style={inpS} value={endDate} min={startISO}
                onChange={e=>setEndDate(e.target.value)} />
            </div>
          </>}

          {type==='permission' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">
                A personal day-off / permission will be requested for this day.
                This will also appear as a ticket for admin review.
              </p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <TimePicker
                    label="Start Time"
                    value={startTime}
                    onChange={setStartTime}
                  />
                </div>
                <div className="flex-1">
                  <TimePicker
                    label="End Time"
                    value={endTime}
                    onChange={setEndTime}
                  />
                </div>
              </div>
            </div>
          )}

          {type==='task' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block text-gray-500">Task Title</label>
                <input type="text" className={inp} style={inpS} value={taskTitle}
                  onChange={e=>setTaskTitle(e.target.value)} placeholder="e.g. Weekly Report" />
              </div>
              
              <div>
                <label className="text-xs font-medium mb-1.5 block text-gray-500">Tag Employees</label>
                <div className="max-h-24 overflow-y-auto border rounded-lg p-2 space-y-1" style={inpS}>
                  {employees.filter((e: any) => e.id !== employee.id).map((emp: any) => (
                    <label key={emp.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer p-1 hover:bg-gray-50 rounded">
                      <input type="checkbox" checked={taggedEmployeeIds.includes(emp.id)}
                        onChange={(e) => {
                          if (e.target.checked) setTaggedEmployeeIds([...taggedEmployeeIds, emp.id])
                          else setTaggedEmployeeIds(taggedEmployeeIds.filter(id => id !== emp.id))
                        }}
                        className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      />
                      {emp.first_name} {emp.last_name}
                    </label>
                  ))}
                  {employees.length <= 1 && (
                    <span className="text-xs text-gray-400">No other employees found.</span>
                  )}
                </div>
              </div>

              <div className="w-1/2">
                <TimePicker
                  label="Reminder Time"
                  value={taskTime}
                  onChange={setTaskTime}
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium mb-1.5 block text-gray-500">Reason (optional)</label>
            <textarea className={inp} style={inpS} rows={2} value={reason}
              onChange={e=>setReason(e.target.value)} placeholder="Brief reason..." />
          </div>

          <p className="text-[10px] text-gray-400">
            {type === 'task' ? 'You will receive a notification when the reminder is due.' : 'This request will also be raised as a support ticket for admin review.'}
          </p>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600">
              Cancel
            </button>
            <button onClick={submit} disabled={saving} id="leave-modal-submit"
              className="flex-1 py-2 rounded-lg text-xs font-medium text-white bg-gray-900 hover:bg-gray-700 transition-colors">
              {saving ? 'Submitting...' : type === 'task' ? 'Save Task' : 'Submit Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Event Bar ────────────────────────────────────────────────────────────────

function EventBar({ event }: { event: CalEvent }) {
  return (
    <div 
      onClick={(e) => {
        if (event.onClick) {
          e.stopPropagation()
          event.onClick()
        }
      }}
      className={`flex items-center gap-1.5 px-2 py-2.5 rounded-md text-[11px] font-medium truncate w-full ${event.onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
      style={{ background: event.bar, color: event.text }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: event.dot }} />
      <span className="truncate leading-tight">{event.label}</span>
    </div>
  )
}

// ─── Calendar Cell ────────────────────────────────────────────────────────────

function CalendarCell({ date, today, events, canApply, onApply }: {
  date: Date; today: string; events: CalEvent[]; canApply: boolean; onApply: () => void
}) {
  const iso       = toISO(date)
  const isToday   = iso === today
  const isWeekend = date.getDay() === 0 || date.getDay() === 6

  return (
    <div
      className="relative flex flex-col border-r border-b group overflow-hidden"
      style={{
        borderColor: '#e5e7eb',
        background: isWeekend ? '#fafafa' : 'white',
      }}
    >
      {/* Date row */}
      <div className="flex items-center justify-between px-2 pt-2 pb-1 shrink-0">
        <div
          className="w-6 h-6 flex items-center justify-center rounded-full text-[12px] font-semibold leading-none"
          style={{
            background: isToday ? '#111827' : 'transparent',
            color: isToday ? '#fff' : isWeekend ? '#9ca3af' : '#374151',
          }}
        >
          {date.getDate()}
        </div>

        {canApply && !isWeekend && (
          <button
            onClick={onApply}
            className="w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:scale-110"
            style={{ background: '#111827' }}
            title="Apply leave / permission"
          >
            <Plus size={9} color="#fff" strokeWidth={3} />
          </button>
        )}
      </div>

      {/* Events */}
      <div className="flex-1 flex flex-col gap-[3px] px-1.5 pb-1.5 min-h-0 overflow-y-auto custom-scrollbar">
        {events.map(ev => <EventBar key={ev.key} event={ev} />)}
      </div>
    </div>
  )
}

// ─── Task List Modal ──────────────────────────────────────────────────────────

function TaskListModal({ date, tasks, onClose, onChanged }: {
  date: Date
  tasks: any[]
  onClose: () => void
  onChanged: () => void
}) {
  const toggleTask = async (id: string, is_completed: boolean) => {
    await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'UPDATE tasks SET is_completed = $1 WHERE id = $2',
        values: [!is_completed, id]
      })
    })
    onChanged()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:'rgba(0,0,0,0.4)' }}
      onMouseDown={(e)=>{ if(e.target===e.currentTarget) onClose() }}>
      <div className="w-full max-w-sm rounded-2xl border shadow-2xl bg-white">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor:'#e5e7eb' }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color:'#111827' }}>
              Tasks for {date.toLocaleDateString('en-IN',{day:'numeric', month:'long'})}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={14} style={{ color:'#6b7280' }} />
          </button>
        </div>

        <div className="p-2 max-h-[60vh] overflow-y-auto">
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No tasks for this day.</p>
          ) : (
            <ul className="space-y-1">
              {tasks.map(t => (
                <li key={t.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                    onClick={() => toggleTask(t.id, t.is_completed)}>
                  <div className="mt-0.5 shrink-0">
                    <input type="checkbox" checked={t.is_completed} readOnly 
                           className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer" />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${t.is_completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {t.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {t.due_time.substring(0,5)}
                      </span>
                      {t.description && (
                        <span className="text-xs text-gray-400 truncate max-w-[200px]">
                          {t.description}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Correction Modal ─────────────────────────────────────────────────────────

function CorrectionModal({ date, employee, onClose, onSaved }: {
  date: Date
  employee: Employee
  onClose: () => void
  onSaved: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const dStr = date.toLocaleDateString()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        employee_id: employee.id,
        category: 'attendance',
        subject: `Attendance Correction for ${dStr}`,
        description: `I was present on ${dStr}. Please correct my attendance record.`,
        priority: 'medium'
      }
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `INSERT INTO support_tickets (employee_id, category, subject, description, priority, status) 
                 VALUES ($1, $2, $3, $4, $5, 'open')`,
          values: [payload.employee_id, payload.category, payload.subject, payload.description, payload.priority]
        })
      })
      if (!res.ok) throw new Error('Failed to create request')
      onSaved()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-md rounded-2xl border shadow-2xl bg-white p-5">
        <h3 className="text-lg font-semibold mb-2">Request Attendance Correction</h3>
        <p className="text-sm text-gray-500 mb-5">
          Submit a request to HR to mark your attendance as Present for <strong>{dStr}</strong>.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="flex gap-3 justify-end mt-6">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Policies Section ─────────────────────────────────────────────────────────

function PoliciesSection() {
  const { data: policies = [] } = useQuery<PolicyRow[]>({
    queryKey: ['policies-user'],
    queryFn: () => dbQuery(
      'SELECT id, title, category, version, effective_date::text FROM policies ORDER BY category, title'
    ),
  })
  if (!policies.length) return null

  return (
    <div className="px-8 py-6 border-t" style={{ borderColor:'#e5e7eb' }}>
      <h2 className="text-sm font-semibold mb-3 text-gray-700">Company Policies</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
        {policies.map(p => {
          const cfg = CAT_CFG[p.category] ?? CAT_CFG.general
          return (
            <Link key={p.id} to="/policies/$policyId" params={{ policyId:p.id }}
              className="flex items-start gap-2.5 p-3 rounded-xl border hover:bg-gray-50 transition-colors"
              style={{ borderColor:'#e5e7eb', background:'white' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background:cfg.bg }}>
                <FileText size={13} style={{ color:cfg.text }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate text-gray-800">{p.title}</p>
                <span className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded mt-0.5"
                  style={{ background:cfg.bg, color:cfg.text }}>{cfg.label}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Props = { user: AuthUser }

export function UserCalendarDashboard({ user }: Props) {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [applyDate, setApplyDate] = useState<Date | null>(null)
  const [revokeLeave, setRevokeLeave] = useState<LeaveRow | null>(null)
  const [correctionDate, setCorrectionDate] = useState<Date | null>(null)
  const [taskListDate, setTaskListDate] = useState<Date | null>(null)
  const [revoking, setRevoking] = useState(false)
  const qc = useQueryClient()

  const today      = toISO(now)
  const monthStart = `${year}-${String(month+1).padStart(2,'0')}-01`
  const monthEnd   = `${year}-${String(month+1).padStart(2,'0')}-${new Date(year, month+1, 0).getDate()}`

  const { data: attendance = [] } = useQuery<AttendanceRow[]>({
    queryKey: ['user-attendance', user.id, year, month],
    queryFn: () => dbQuery(`
      SELECT date::text as date, status FROM attendance 
      WHERE employee_id = $1 AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = $3
    `, [user.id, year, month + 1])
  })

  type TaskRow = {
    id: string
    title: string
    description: string
    due_date: string
    due_time: string
    is_completed: boolean
  }

  const { data: tasks = [] } = useQuery<TaskRow[]>({
    queryKey: ['user-tasks', user.id, year, month],
    queryFn: () => dbQuery(`
      SELECT id, title, description, due_date::text as due_date, due_time, is_completed FROM tasks 
      WHERE employee_id = $1 AND EXTRACT(YEAR FROM due_date) = $2 AND EXTRACT(MONTH FROM due_date) = $3
    `, [user.id, year, month + 1])
  })

  const { data: leaves = [] } = useQuery<LeaveRow[]>({
    queryKey: ['user-leaves', user.id, year, month],
    queryFn: () => dbQuery(
      `SELECT id, start_date::text, end_date::text, leave_type, status
       FROM leave_requests
       WHERE employee_id=$1 AND start_date<=$2 AND end_date>=$3 AND status!='cancelled'`,
      [user.id, monthEnd, monthStart]
    ),
  })

  // Build lookup maps
  const attendanceMap: Record<string, string> = {}
  for (const row of attendance) {
    const dStr = typeof row.date === 'string' ? row.date.split('T')[0] : toISO(new Date(row.date))
    attendanceMap[dStr] = row.status
  }

  const leaveMap: Record<string, LeaveRow[]> = {}
  for (const leave of leaves) {
    const s = new Date(leave.start_date + 'T00:00:00')
    const e = new Date(leave.end_date   + 'T00:00:00')
    for (const d = new Date(s); d <= e; d.setDate(d.getDate()+1)) {
      const k = toISO(new Date(d))
      if (!leaveMap[k]) leaveMap[k] = []
      leaveMap[k].push(leave)
    }
  }

  function eventsForDate(date: Date): CalEvent[] {
    const iso = toISO(date)
    const events: CalEvent[] = []
    const att = attendanceMap[iso]
    const isPast = iso < today
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const hasLeave = leaveMap[iso]?.length > 0

    if (!att && isPast && !isWeekend && !hasLeave) {
      events.push({
        key: `att-missing-${iso}`,
        label: 'Absent',
        dot: '#c62828',
        bar: '#ffebee',
        text: '#c62828',
        onClick: () => setCorrectionDate(date)
      })
    } else if (att && ATTENDANCE_EVENTS[att]) {
      events.push({
        ...ATTENDANCE_EVENTS[att],
        onClick: att === 'absent' && isPast ? () => setCorrectionDate(date) : undefined
      })
    }
    for (const leave of (leaveMap[iso] ?? [])) {
      events.push({
        ...leaveEvent(leave),
        onClick: leave.status === 'pending' ? () => setRevokeLeave(leave) : undefined
      })
    }

    const dateTasks = tasks?.filter(t => t.due_date.split('T')[0] === iso) || []
    if (dateTasks.length > 0) {
      events.push({
        key: `tasks-${iso}`,
        label: `Tasks (${dateTasks.length})`,
        dot: '#6b7280',
        bar: '#f3f4f6',
        text: '#111827',
        onClick: () => setTaskListDate(date)
      })
    }

    return events
  }

  const cells = buildCalendarDays(year, month)
  const weeks: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i+7))

  const prevMonth = () => { if (month===0) { setMonth(11); setYear(y=>y-1) } else setMonth(m=>m-1) }
  const nextMonth = () => { if (month===11) { setMonth(0); setYear(y=>y+1) } else setMonth(m=>m+1) }
  const goToday   = () => { setYear(now.getFullYear()); setMonth(now.getMonth()) }

  // ── The trick: escape the px-8 py-8 container and fill the viewport ──
  // The root layout wraps us in a div with px-8 py-8 (32px each side).
  // We use -mx-8 -my-8 to cancel that padding and fill edge-to-edge.
  return (
    <div className="-mx-8 -my-8 flex flex-col" style={{ height: '100vh', background: '#f9fafb' }}>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b shrink-0"
        style={{ borderColor:'#e5e7eb' }}>

        {/* Left: title */}
        <div className="flex items-center gap-3">
          <div className="text-center px-2.5 py-1.5 rounded-lg border" style={{ borderColor:'#e5e7eb' }}>
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month]}
            </p>
            <p className="text-xl font-bold leading-none text-gray-900">
              {now.getMonth()===month && now.getFullYear()===year ? now.getDate() : '—'}
            </p>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              {MONTH_NAMES[month]} {year}
            </h1>
            <p className="text-[11px] text-gray-400">{monthStart} – {monthEnd}</p>
          </div>
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="hidden lg:flex items-center gap-2.5 mr-3">
            {Object.values(ATTENDANCE_EVENTS).map(e=>(
              <span key={e.key} className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color:e.text }}>
                <span className="w-2 h-2 rounded-full" style={{ background:e.dot }} />
                {e.label}
              </span>
            ))}
          </div>

          <button onClick={prevMonth}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
            <ChevronLeft size={14} className="text-gray-500" />
          </button>
          <button onClick={goToday}
            className="px-3 h-8 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Today
          </button>
          <button onClick={nextMonth}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
            <ChevronRight size={14} className="text-gray-500" />
          </button>

          <button
            onClick={() => setApplyDate(now)}
            className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold text-white ml-1 hover:opacity-90 transition-opacity"
            style={{ background: '#111827' }}
          >
            <Plus size={13} strokeWidth={2.5} />
            Apply Leave
          </button>
        </div>
      </div>

      {/* ── Day headers ── */}
      <div className="grid grid-cols-7 bg-white border-b shrink-0" style={{ borderColor:'#e5e7eb' }}>
        {DAY_HEADERS.map((d, i) => (
          <div key={d}
            className="py-2.5 text-center text-[11px] font-semibold tracking-wide uppercase border-r last:border-r-0"
            style={{ borderColor:'#e5e7eb', color: i >= 5 ? '#d1d5db' : '#9ca3af' }}>
            {d}
          </div>
        ))}
      </div>

      {/* ── Calendar grid — fills all remaining space ── */}
      <div
        className="flex-1 min-h-0"
        style={{
          display: 'grid',
          gridTemplateRows: `repeat(${weeks.length}, 1fr)`,
        }}
      >
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 min-h-0">
            {week.map((date, di) => {
              if (!date) {
                return (
                  <div key={di} className="border-r border-b min-h-0"
                    style={{ borderColor:'#e5e7eb', background:'#fafafa' }} />
                )
              }
              const iso      = toISO(date)
              const isFuture = iso >= today
              return (
                <CalendarCell
                  key={di}
                  date={date}
                  today={today}
                  events={eventsForDate(date)}
                  canApply={isFuture}
                  onApply={() => setApplyDate(date)}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* ── Policies (scrollable, below the fold) ── */}
      <PoliciesSection />

      {/* ── Leave modal ── */}
      {applyDate && (
        <LeaveModal
          date={applyDate}
          employee={user}
          onClose={() => setApplyDate(null)}
          onSaved={() => {
            setApplyDate(null)
            qc.invalidateQueries({ queryKey: ['user-leaves', user.id, year, month] })
          }}
        />
      )}

      {/* ── Correction modal ── */}
      {correctionDate && (
        <CorrectionModal
          date={correctionDate}
          employee={user}
          onClose={() => setCorrectionDate(null)}
          onSaved={() => {
            setCorrectionDate(null)
            qc.invalidateQueries({ queryKey: ['user-attendance', user.id, year, month] })
          }}
        />
      )}

      {/* ── Task List Modal ── */}
      {taskListDate && (
        <TaskListModal
          date={taskListDate}
          tasks={tasks.filter(t => t.due_date.split('T')[0] === toISO(taskListDate))}
          onClose={() => setTaskListDate(null)}
          onChanged={() => {
            qc.invalidateQueries({ queryKey: ['user-tasks', user.id, year, month] })
            qc.invalidateQueries({ queryKey: ['due-tasks', user.id] })
          }}
        />
      )}

      {/* ── Revoke Leave modal ── */}
      {revokeLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background:'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-sm rounded-2xl border shadow-2xl bg-white p-5 text-center">
            <h3 className="text-sm font-semibold mb-2">Revoke Leave Request</h3>
            <p className="text-xs text-gray-500 mb-5">
              Are you sure you want to cancel this pending {revokeLeave.leave_type} leave request?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setRevokeLeave(null)}
                className="flex-1 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600">
                Keep Request
              </button>
              <button 
                onClick={async () => {
                  setRevoking(true)
                  try {
                    await dbQuery(`UPDATE leave_requests SET status = 'cancelled' WHERE id = $1`, [revokeLeave.id])
                    // Also close the related support ticket
                    await dbQuery(
                      `UPDATE support_tickets 
                       SET status = 'closed', admin_notes = 'Request was cancelled by the employee.' 
                       WHERE employee_id = $1 AND category = 'leave' AND status IN ('new', 'open', 'pending')`,
                      [user.id]
                    )
                    qc.invalidateQueries({ queryKey: ['user-leaves', user.id, year, month] })
                    setRevokeLeave(null)
                  } finally {
                    setRevoking(false)
                  }
                }}
                disabled={revoking}
                className="flex-1 py-2 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition-colors">
                {revoking ? 'Cancelling...' : 'Cancel Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
