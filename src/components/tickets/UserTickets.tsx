/**
 * UserTickets — Employee view
 *
 * - "Raise a Ticket" button → modal form
 * - Lists all their own tickets with status, priority, category, admin notes
 * - Toggle between list and kanban view of their own tickets
 */
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus, X, LayoutList, Kanban, Clock, CheckCircle2,
  XCircle, AlertCircle, Inbox,
} from 'lucide-react'
import { dbQuery } from '../../lib/dbClient'
import type { SupportTicket, TicketStatus, AuthUser } from '../../lib/types'
import {
  STATUSES, STATUS_CFG, PRIORITY_CFG, CATEGORY_CFG,
  timeAgo,
} from './ticketConfig'
import { notifyAdmins } from '../../lib/notifications'

// ─── Raise Ticket Modal ───────────────────────────────────────────────────────

function RaiseTicketModal({ employeeId, onClose, onSaved }: {
  employeeId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'general',
    priority: 'medium',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async () => {
    if (!form.title.trim()) return setError('Title is required')
    setSaving(true)
    setError(null)
    try {
      const rows: { id: string }[] = await dbQuery(
        `INSERT INTO support_tickets (employee_id, title, description, category, priority)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [employeeId, form.title.trim(), form.description.trim() || null, form.category, form.priority]
      )
      const ticketId = rows[0]?.id
      // Notify all admins about the new ticket
      await notifyAdmins(
        'new_ticket',
        `New ${form.priority} priority ticket: "${form.title.trim().slice(0, 60)}"`,
        ticketId
      )
      onSaved()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full px-3 py-2 rounded-lg border text-sm'
  const inpS = { borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text-primary)' }
  const lbl = 'text-xs font-medium mb-1.5 block'
  const lblS = { color: 'var(--text-secondary)' }

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
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Raise a Support Ticket</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--bg-hover)]">
            <X size={15} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="px-3 py-2 rounded-lg text-xs" style={{ background: '#fee2e2', color: '#991b1b' }}>{error}</div>}

          <div>
            <label className={lbl} style={lblS}>Title <span style={{ color: '#ef4444' }}>*</span></label>
            <input id="ticket-title" className={inp} style={inpS}
              value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Brief summary of the issue..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl} style={lblS}>Category</label>
              <select className={inp} style={inpS} value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="general">General</option>
                <option value="hr">HR</option>
                <option value="it">IT</option>
                <option value="payroll">Payroll</option>
                <option value="leave">Leave</option>
                <option value="billing">Billing</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={lbl} style={lblS}>Priority</label>
              <select className={inp} style={inpS} value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className={lbl} style={lblS}>Description (optional)</label>
            <textarea className={inp} style={inpS} rows={4}
              value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Describe the issue in detail..." />
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-xs font-medium border"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} id="raise-ticket-submit"
            className="flex-1 py-2 rounded-lg text-xs font-medium text-white"
            style={{ background: 'var(--text-primary)' }}>
            {saving ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TicketDetail({ ticket, onClose, onUpdated }: { ticket: SupportTicket; onClose: () => void; onUpdated: () => void }) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: ticket.title, description: ticket.description || '' })
  
  const sCfg = STATUS_CFG[ticket.status]
  const pCfg = PRIORITY_CFG[ticket.priority]
  const catCfg = CATEGORY_CFG[ticket.category]
  
  const isEditable = ticket.status !== 'closed' && ticket.status !== 'resolved'

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await dbQuery('UPDATE support_tickets SET title = $1, description = $2 WHERE id = $3', [form.title, form.description, ticket.id])
      setIsEditing(false)
      onUpdated()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-2xl border modal-panel shadow-2xl flex flex-col max-h-[90vh]"
        style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex-1 mr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                #{String(ticket.ticket_no).padStart(4, '0')}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: catCfg.bg, color: catCfg.text }}>{catCfg.label}</span>
            </div>
            {isEditing ? (
              <input 
                type="text" 
                value={form.title} 
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full text-sm font-semibold p-1.5 border rounded-lg focus:outline-none focus:border-indigo-500" 
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            ) : (
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{ticket.title}</h2>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--bg-hover)] shrink-0">
            <X size={15} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-3">
            <span className="text-[10px] px-2.5 py-1 rounded-full font-medium border flex items-center gap-1.5"
              style={{ background: sCfg.bg, color: sCfg.text, borderColor: sCfg.border }}>
              <span>{sCfg.label}</span>
            </span>
            <span className="text-[10px] font-medium" style={{ color: pCfg.color }}>
              ● {pCfg.label} priority
            </span>
            <span className="text-[10px] ml-auto" style={{ color: 'var(--text-tertiary)' }}>
              {timeAgo(ticket.created_at)}
            </span>
          </div>
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Description</p>
            {isEditing ? (
              <textarea 
                rows={4}
                value={form.description} 
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full text-sm p-2 border rounded-lg focus:outline-none focus:border-indigo-500 resize-none" 
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{ticket.description || <span className="italic opacity-50">No description</span>}</p>
            )}
          </div>
          {ticket.admin_notes && (
            <div className="p-3 rounded-xl" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#15803d' }}>Admin Response</p>
              <p className="text-sm" style={{ color: '#166534', whiteSpace: 'pre-wrap' }}>{ticket.admin_notes}</p>
            </div>
          )}
          {!ticket.admin_notes && ticket.status === 'new' && !isEditing && (
            <p className="text-xs text-center py-2" style={{ color: 'var(--text-tertiary)' }}>
              Your ticket is in queue — an admin will respond soon.
            </p>
          )}
        </div>
        
        {isEditable && (
          <div className="px-5 py-4 border-t flex gap-2" style={{ borderColor: 'var(--border)' }}>
            {isEditing ? (
              <>
                <button onClick={() => { setIsEditing(false); setForm({ title: ticket.title, description: ticket.description || '' }) }} 
                  className="flex-1 py-2 rounded-lg text-xs font-medium border transition-colors"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>Cancel</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
                  {saving ? 'Saving...' : 'Save Details'}
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} 
                className="w-full py-2 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
                Edit Details
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── User Ticket Card ─────────────────────────────────────────────────────────

function UserTicketCard({ ticket, onClick }: { ticket: SupportTicket; onClick: () => void }) {
  const sCfg = STATUS_CFG[ticket.status]
  const pCfg = PRIORITY_CFG[ticket.priority]
  const catCfg = CATEGORY_CFG[ticket.category]
  return (
    <div
      onClick={onClick}
      className="p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
      style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
          #{String(ticket.ticket_no).padStart(4, '0')}
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium border"
          style={{ background: sCfg.bg, color: sCfg.text, borderColor: sCfg.border }}>
          {sCfg.label}
        </span>
      </div>
      <p className="text-sm font-semibold mb-2 leading-snug" style={{ color: 'var(--text-primary)' }}>
        {ticket.title}
      </p>
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
          style={{ background: catCfg.bg, color: catCfg.text }}>{catCfg.label}</span>
        <span className="text-[10px] font-medium" style={{ color: pCfg.color }}>● {pCfg.label}</span>
      </div>
      {ticket.admin_notes && (
        <p className="text-[10px] px-2 py-1.5 rounded-lg mb-2 line-clamp-1"
          style={{ background: '#f0fdf4', color: '#15803d' }}>
          Admin: {ticket.admin_notes}
        </p>
      )}
      <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
        {timeAgo(ticket.created_at)}
      </p>
    </div>
  )
}

// ─── Status Icon ──────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: TicketStatus }) {
  const p = { size: 12, strokeWidth: 2 }
  switch (status) {
    case 'new':      return <Inbox {...p} />
    case 'open':     return <Clock {...p} />
    case 'pending':  return <AlertCircle {...p} />
    case 'resolved': return <CheckCircle2 {...p} />
    case 'closed':   return <XCircle {...p} />
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Props = { user: AuthUser }

export function UserTickets({ user }: Props) {
  const qc = useQueryClient()
  const [showRaise, setShowRaise] = useState(false)
  const [selected, setSelected] = useState<SupportTicket | null>(null)
  const [view, setView] = useState<'list' | 'kanban'>('list')
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('')

  const { data: tickets = [], isLoading } = useQuery<SupportTicket[]>({
    queryKey: ['my-tickets', user.id],
    queryFn: () => dbQuery(
      `SELECT * FROM support_tickets WHERE employee_id = $1 ORDER BY created_at DESC`,
      [user.id]
    ),
    refetchInterval: 20000,
  })

  const filtered = statusFilter ? tickets.filter(t => t.status === statusFilter) : tickets

  const byStatus = STATUSES.reduce((acc, s) => {
    acc[s] = tickets.filter(t => t.status === s)
    return acc
  }, {} as Record<TicketStatus, SupportTicket[]>)

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>My Tickets</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} raised by you
          </p>
        </div>
        <button
          id="raise-ticket-btn"
          onClick={() => setShowRaise(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'var(--text-primary)' }}
        >
          <Plus size={14} />
          Raise Ticket
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {/* View toggle */}
        <div className="flex items-center gap-0.5 p-1 rounded-lg border"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
          {([['list', LayoutList, 'List'], ['kanban', Kanban, 'Board']] as const).map(([v, Icon, label]) => (
            <button key={v} onClick={() => setView(v)}
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

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setStatusFilter('')}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors"
            style={{
              background: statusFilter === '' ? 'var(--text-primary)' : 'transparent',
              color: statusFilter === '' ? '#fff' : 'var(--text-secondary)',
              borderColor: statusFilter === '' ? 'var(--text-primary)' : 'var(--border)',
            }}
          >
            All
          </button>
          {STATUSES.map(s => {
            const c = STATUS_CFG[s]
            return (
              <button key={s} onClick={() => setStatusFilter(s === statusFilter ? '' : s)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all"
                style={{
                  background: statusFilter === s ? c.bg : 'transparent',
                  color: statusFilter === s ? c.text : 'var(--text-tertiary)',
                  borderColor: statusFilter === s ? c.border : 'var(--border)',
                }}>
                <StatusIcon status={s} />
                {c.label}
                {byStatus[s].length > 0 && (
                  <span className="ml-0.5 text-[9px] px-1 py-0.5 rounded-full font-bold"
                    style={{ background: statusFilter === s ? c.border : 'var(--bg-subtle)', color: statusFilter === s ? c.text : 'var(--text-tertiary)' }}>
                    {byStatus[s].length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-center py-16" style={{ color: 'var(--text-tertiary)' }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm mb-1" style={{ color: 'var(--text-tertiary)' }}>
            {statusFilter ? `No ${STATUS_CFG[statusFilter].label} tickets` : 'No tickets yet'}
          </p>
          {!statusFilter && (
            <button onClick={() => setShowRaise(true)}
              className="text-xs underline mt-1" style={{ color: 'var(--text-secondary)' }}>
              Raise your first ticket
            </button>
          )}
        </div>
      ) : view === 'list' ? (
        /* ── List view ── */
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                {['#', 'Title', 'Category', 'Priority', 'Status', 'Admin Notes', 'Age'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const sCfg = STATUS_CFG[t.status]
                const pCfg = PRIORITY_CFG[t.priority]
                const catCfg = CATEGORY_CFG[t.category]
                return (
                  <tr key={t.id} onClick={() => setSelected(t)}
                    className="border-b cursor-pointer transition-colors hover:bg-[var(--bg-subtle)]"
                    style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3 text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                      #{String(t.ticket_no).padStart(4, '0')}
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{t.title}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded font-medium"
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
                        <StatusIcon status={t.status} />
                        {sCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[160px]">
                      {t.admin_notes ? (
                        <p className="text-[10px] truncate" style={{ color: '#15803d' }}>{t.admin_notes}</p>
                      ) : (
                        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                      {timeAgo(t.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── Board view ── */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map(s => {
            const cfg = STATUS_CFG[s]
            const cols = filtered.filter(t => t.status === s)
            return (
              <div key={s} className="flex flex-col min-w-[220px] w-[220px] shrink-0">
                <div className="flex items-center justify-between px-3 py-2 mb-2 rounded-xl"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                  <span className="text-xs font-semibold" style={{ color: cfg.text }}>{cfg.label}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: cfg.border, color: cfg.text }}>{cols.length}</span>
                </div>
                <div className="flex flex-col gap-2 min-h-[100px] flex-1">
                  {cols.length === 0 ? (
                    <div className="py-5 text-center text-[11px] rounded-xl border border-dashed"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>Empty</div>
                  ) : (
                    cols.map(t => <UserTicketCard key={t.id} ticket={t} onClick={() => setSelected(t)} />)
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showRaise && (
        <RaiseTicketModal
          employeeId={user.id}
          onClose={() => setShowRaise(false)}
          onSaved={() => {
            setShowRaise(false)
            qc.invalidateQueries({ queryKey: ['my-tickets', user.id] })
          }}
        />
      )}

      {selected && (
        <TicketDetail ticket={selected} onClose={() => setSelected(null)} onUpdated={() => qc.invalidateQueries({ queryKey: ['my-tickets', user.id] })} />
      )}
    </div>
  )
}
