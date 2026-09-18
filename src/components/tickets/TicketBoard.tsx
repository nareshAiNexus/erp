/**
 * TicketBoard — Admin view
 *
 * - Toggle between Kanban (5 columns) and List (table) views
 * - Shows all tickets with employee name, email, avatar
 * - Admin can: change status, accept (→ open), reject (→ closed), add notes
 * - Search + priority filter
 */
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  LayoutList, Kanban, Search, ChevronDown, X, AlertCircle,
  Clock, CheckCircle2, XCircle, Inbox,
} from 'lucide-react'
import { useRouter } from '@tanstack/react-router'
import { dbQuery } from '../../lib/dbClient'
import type { TicketWithEmployee, TicketStatus, TicketPriority } from '../../lib/types'
import {
  STATUSES, STATUS_CFG, PRIORITY_CFG, CATEGORY_CFG,
  avatarBg, initials, timeAgo,
} from './ticketConfig'
import { createNotification } from '../../lib/notifications'

// ─── Queries ──────────────────────────────────────────────────────────────────

const fetchAllTickets = (): Promise<TicketWithEmployee[]> =>
  dbQuery(`
    SELECT t.*, e.first_name, e.last_name, e.email, e.avatar_url
    FROM support_tickets t
    JOIN employees e ON t.employee_id = e.id
    ORDER BY t.created_at DESC
  `)

// ─── Status Icon ──────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: TicketStatus }) {
  const props = { size: 13, strokeWidth: 2 }
  switch (status) {
    case 'new':      return <Inbox {...props} />
    case 'open':     return <Clock {...props} />
    case 'pending':  return <AlertCircle {...props} />
    case 'resolved': return <CheckCircle2 {...props} />
    case 'closed':   return <XCircle {...props} />
  }
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ ticket }: { ticket: TicketWithEmployee }) {
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
      style={{ background: avatarBg(ticket.employee_id), color: '#1a1a1a' }}
      title={`${ticket.first_name} ${ticket.last_name}`}
    >
      {initials(ticket.first_name, ticket.last_name)}
    </div>
  )
}

// ─── Ticket Detail / Action Modal ─────────────────────────────────────────────

type DetailModalProps = {
  ticket: TicketWithEmployee
  onClose: () => void
  onUpdated: () => void
}

function DetailModal({ ticket, onClose, onUpdated }: DetailModalProps) {
  const [status, setStatus] = useState<TicketStatus>(ticket.status)
  const [notes, setNotes] = useState(ticket.admin_notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await dbQuery(
        `UPDATE support_tickets SET status = $1, admin_notes = $2 WHERE id = $3`,
        [status, notes || null, ticket.id]
      )
      // Notify employee if status changed
      if (status !== ticket.status) {
        const statusLabel = STATUS_CFG[status].label
        const msg = `Your ticket "${ticket.title.slice(0, 50)}" has been moved to ${statusLabel}.`
          + (notes ? ` Admin note: ${notes.slice(0, 80)}` : '')
        await createNotification(ticket.employee_id, 'ticket_update', msg, ticket.id)
      }
      onUpdated()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const pCfg = PRIORITY_CFG[ticket.priority]
  const catCfg = CATEGORY_CFG[ticket.category]
  const inp = 'w-full px-3 py-2 rounded-lg border text-sm'
  const inpS = { borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text-primary)' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border modal-panel shadow-2xl"
        style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                #{String(ticket.ticket_no).padStart(4, '0')}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: catCfg.bg, color: catCfg.text }}>{catCfg.label}</span>
            </div>
            <h2 className="text-sm font-semibold pr-6" style={{ color: 'var(--text-primary)' }}>
              {ticket.title}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--bg-hover)] shrink-0">
            <X size={15} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && <div className="px-3 py-2 rounded-lg text-xs" style={{ background: '#fee2e2', color: '#991b1b' }}>{error}</div>}

          {/* Reporter */}
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: avatarBg(ticket.employee_id), color: '#1a1a1a' }}
            >
              {initials(ticket.first_name, ticket.last_name)}
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {ticket.first_name} {ticket.last_name}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{ticket.email}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                {timeAgo(ticket.created_at)}
              </p>
              <p className="text-[10px] font-medium mt-0.5" style={{ color: pCfg.color }}>
                ● {pCfg.label}
              </p>
            </div>
          </div>

          {/* Description */}
          {ticket.description && (
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Description</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                {ticket.description}
              </p>
            </div>
          )}

          {/* Status */}
          <div>
            <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Status</p>
            <div className="flex gap-1.5 flex-wrap">
              {STATUSES.map(s => {
                const c = STATUS_CFG[s]
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                    style={{
                      background: status === s ? c.bg : 'transparent',
                      color: status === s ? c.text : 'var(--text-tertiary)',
                      borderColor: status === s ? c.border : 'var(--border)',
                    }}
                  >
                    <StatusIcon status={s} />
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setStatus('open')}
              className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{ background: '#d1fae5', color: '#065f46' }}
            >
              Accept (→ Open)
            </button>
            <button
              onClick={() => setStatus('closed')}
              className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{ background: '#fee2e2', color: '#991b1b' }}
            >
              Reject (→ Closed)
            </button>
          </div>

          {/* Admin notes */}
          <div>
            <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Admin Notes (visible to employee)
            </p>
            <textarea
              className={inp}
              style={inpS}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note for the employee..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-xs font-medium border"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-2 rounded-lg text-xs font-medium text-white transition-opacity"
            style={{ background: 'var(--text-primary)' }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────

function KanbanCard({ ticket, onClick }: { ticket: TicketWithEmployee; onClick: () => void }) {
  const pCfg = PRIORITY_CFG[ticket.priority]
  const catCfg = CATEGORY_CFG[ticket.category]
  return (
    <div
      onClick={onClick}
      className="p-3.5 rounded-xl border cursor-pointer group transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
      style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
    >
      {/* Company row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
          {ticket.first_name} {ticket.last_name}
        </span>
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
          #{String(ticket.ticket_no).padStart(4, '0')}
        </span>
      </div>

      {/* Title */}
      <p className="text-[13px] font-semibold leading-snug mb-3" style={{ color: 'var(--text-primary)' }}>
        {ticket.title}
      </p>

      {/* Category + Priority */}
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-[10px] px-2 py-0.5 rounded-md font-medium"
          style={{ background: catCfg.bg, color: catCfg.text }}>{catCfg.label}</span>
        <span className="text-[10px] font-medium flex items-center gap-1"
          style={{ color: pCfg.color }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: pCfg.dot }} />
          {pCfg.label}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          {timeAgo(ticket.created_at)}
        </span>
        <Avatar ticket={ticket} />
      </div>
    </div>
  )
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  status, tickets, onCard,
}: { status: TicketStatus; tickets: TicketWithEmployee[]; onCard: (t: TicketWithEmployee) => void }) {
  const cfg = STATUS_CFG[status]
  return (
    <div className="flex flex-col min-w-[240px] w-[240px] shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 mb-2 rounded-xl"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
        <div className="flex items-center gap-2">
          <span style={{ color: cfg.text }}><StatusIcon status={status} /></span>
          <span className="text-xs font-semibold" style={{ color: cfg.text }}>{cfg.label}</span>
        </div>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: cfg.border, color: cfg.text }}
        >
          {tickets.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2">
        {tickets.length === 0 ? (
          <div className="py-6 text-center text-[11px] rounded-xl border border-dashed"
            style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
            No tickets
          </div>
        ) : (
          tickets.map(t => <KanbanCard key={t.id} ticket={t} onClick={() => onCard(t)} />)
        )}
      </div>
    </div>
  )
}

// ─── List Row ─────────────────────────────────────────────────────────────────

function ListRow({ ticket, onClick }: { ticket: TicketWithEmployee; onClick: () => void }) {
  const pCfg = PRIORITY_CFG[ticket.priority]
  const sCfg = STATUS_CFG[ticket.status]
  const catCfg = CATEGORY_CFG[ticket.category]

  return (
    <tr
      onClick={onClick}
      className="border-b cursor-pointer transition-colors hover:bg-[var(--bg-subtle)]"
      style={{ borderColor: 'var(--border)' }}
    >
      <td className="px-4 py-3">
        <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
          #{String(ticket.ticket_no).padStart(4, '0')}
        </span>
      </td>
      <td className="px-4 py-3 max-w-[260px]">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {ticket.title}
        </p>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
            style={{ background: avatarBg(ticket.employee_id), color: '#1a1a1a' }}>
            {initials(ticket.first_name, ticket.last_name)}
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              {ticket.first_name} {ticket.last_name}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{ticket.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-[10px] px-2 py-0.5 rounded-md font-medium"
          style={{ background: catCfg.bg, color: catCfg.text }}>{catCfg.label}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-[10px] font-medium flex items-center gap-1" style={{ color: pCfg.color }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: pCfg.dot }} />
          {pCfg.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-[10px] px-2.5 py-1 rounded-full font-medium border flex items-center gap-1 w-fit"
          style={{ background: sCfg.bg, color: sCfg.text, borderColor: sCfg.border }}>
          <StatusIcon status={ticket.status} />
          {sCfg.label}
        </span>
      </td>
      <td className="px-4 py-3 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
        {timeAgo(ticket.created_at)}
      </td>
    </tr>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TicketBoard() {
  const qc = useQueryClient()
  const router = useRouter()
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | ''>('')
  const [selected, setSelected] = useState<TicketWithEmployee | null>(null)

  const handleCardClick = (t: TicketWithEmployee) => {
    if (t.category === 'leave') {
      router.navigate({ to: '/leave' })
    } else {
      setSelected(t)
    }
  }

  const { data: tickets = [], isLoading } = useQuery<TicketWithEmployee[]>({
    queryKey: ['admin-tickets'],
    queryFn: fetchAllTickets,
    refetchInterval: 30000,
  })

  // Filter
  const filtered = tickets.filter(t => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      t.title.toLowerCase().includes(q) ||
      `${t.first_name} ${t.last_name}`.toLowerCase().includes(q) ||
      (t.email ?? '').toLowerCase().includes(q) ||
      String(t.ticket_no).includes(q)
    const matchPriority = !priorityFilter || t.priority === priorityFilter
    return matchSearch && matchPriority
  })

  const byStatus = STATUSES.reduce((acc, s) => {
    acc[s] = filtered.filter(t => t.status === s)
    return acc
  }, {} as Record<TicketStatus, TicketWithEmployee[]>)

  return (
    <div className="fade-in">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Support Tickets</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {tickets.length} total · {byStatus.new.length} new
          </p>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {/* View toggle */}
        <div className="flex items-center gap-0.5 p-1 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
          {([['kanban', Kanban, 'Kanban'], ['list', LayoutList, 'List']] as const).map(([v, Icon, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{
                background: view === v ? 'var(--bg)' : 'transparent',
                color: view === v ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text-primary)' }}
          />
        </div>

        {/* Priority filter */}
        <div className="relative">
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value as TicketPriority | '')}
            className="appearance-none pl-3 pr-8 py-2 rounded-lg border text-xs font-medium"
            style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text-primary)' }}
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-tertiary)' }} />
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading tickets...</div>
      ) : view === 'kanban' ? (
        /* ── Kanban ── */
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
          {STATUSES.map(s => (
            <KanbanColumn key={s} status={s} tickets={byStatus[s]} onCard={handleCardClick} />
          ))}
        </div>
      ) : (
        /* ── List ── */
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                {['#', 'Title', 'Employee', 'Category', 'Priority', 'Status', 'Age'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    No tickets found
                  </td>
                </tr>
              ) : (
                filtered.map(t => <ListRow key={t.id} ticket={t} onClick={() => handleCardClick(t)} />)
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <DetailModal
          ticket={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => {
            setSelected(null)
            qc.invalidateQueries({ queryKey: ['admin-tickets'] })
          }}
        />
      )}
    </div>
  )
}
