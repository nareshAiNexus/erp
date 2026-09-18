/**
 * NotificationBell — polls for unread notifications every 20s.
 *
 * Shows a badge count on the bell icon.
 * Click → slide-down panel with the last 20 notifications.
 * Clicking a notification marks it read and navigates to /tickets.
 */
import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, X, Check, Ticket, CalendarOff } from 'lucide-react'
import { dbQuery } from '../lib/dbClient'
import { useRouter } from '@tanstack/react-router'

type Notification = {
  id: string
  type: string
  message: string
  is_read: boolean
  related_id: string | null
  created_at: string
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)  return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

function typeIcon(type: string) {
  if (type.includes('leave')) return <CalendarOff size={13} />
  return <Ticket size={13} />
}

function typeColor(type: string): string {
  if (type === 'ticket_update') return '#16a34a'
  if (type === 'new_ticket')    return '#2563eb'
  if (type === 'leave_request') return '#d97706'
  return '#6b7280'
}

type Props = { employeeId: string }

export function NotificationBell({ employeeId }: Props) {
  const [open, setOpen]   = useState(false)
  const panelRef          = useRef<HTMLDivElement>(null)
  const qc                = useQueryClient()
  const router            = useRouter()

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications', employeeId],
    queryFn: () => dbQuery(
      `SELECT id, type, message, is_read, related_id, created_at
       FROM notifications
       WHERE employee_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [employeeId]
    ),
    refetchInterval: 20000,
  })

  // Poll for due tasks
  const { data: dueTasks } = useQuery<{id: string, title: string}[]>({
    queryKey: ['due-tasks', employeeId],
    queryFn: () => dbQuery(`
      SELECT id, title FROM tasks 
      WHERE employee_id = $1 AND reminded = false AND is_completed = false
      AND (due_date < CURRENT_DATE OR (due_date = CURRENT_DATE AND due_time <= CURRENT_TIME))
    `, [employeeId]),
    refetchInterval: 30000,
  })

  useEffect(() => {
    if (dueTasks && dueTasks.length > 0) {
      dueTasks.forEach(async (task) => {
        try {
          await dbQuery('UPDATE tasks SET reminded = true WHERE id = $1', [task.id])
          await dbQuery(
            'INSERT INTO notifications (employee_id, type, message) VALUES ($1, $2, $3)', 
            [employeeId, 'task_reminder', `Task Reminder: ${task.title}`]
          )
          qc.invalidateQueries({ queryKey: ['notifications', employeeId] })
        } catch (e) {
          console.error('Error reminding task', e)
        }
      })
    }
  }, [dueTasks, employeeId, qc])

  const [prevUnreadIds, setPrevUnreadIds] = useState<Set<string>>(new Set())
  const [toasts, setToasts] = useState<Notification[]>([])
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      if (notifications.length > 0) {
        isFirstRender.current = false
        setPrevUnreadIds(new Set(notifications.filter(n => !n.is_read).map(n => n.id)))
      }
      return
    }

    const unread = notifications.filter(n => !n.is_read)
    const newUnread = unread.filter(n => !prevUnreadIds.has(n.id))
    
    if (newUnread.length > 0) {
      setToasts(prev => [...prev, ...newUnread])
      setPrevUnreadIds(new Set(unread.map(n => n.id)))
      
      newUnread.forEach(n => {
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== n.id))
        }, 6000)
      })
    } else if (unread.length !== prevUnreadIds.size) {
      setPrevUnreadIds(new Set(unread.map(n => n.id)))
    }
  }, [notifications])

  const unread = notifications.filter(n => !n.is_read).length

  const markRead = async (n: Notification) => {
    if (!n.is_read) {
      await dbQuery(`UPDATE notifications SET is_read = true WHERE id = $1`, [n.id])
      qc.invalidateQueries({ queryKey: ['notifications', employeeId] })
    }
    setOpen(false)
    if (n.type.includes('leave')) {
      router.navigate({ to: '/leave' })
    } else {
      router.navigate({ to: '/tickets' })
    }
  }

  const markAllRead = async () => {
    await dbQuery(
      `UPDATE notifications SET is_read = true WHERE employee_id = $1 AND is_read = false`,
      [employeeId]
    )
    qc.invalidateQueries({ queryKey: ['notifications', employeeId] })
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
        title="Notifications"
      >
        <Bell size={16} style={{ color: 'var(--text-secondary)' }} />
        {unread > 0 && (
          <span
            className="absolute top-0.5 right-0.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5"
            style={{ background: '#dc2626' }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="absolute left-0 bottom-full mb-2 z-50 w-[320px] rounded-xl border shadow-xl overflow-hidden"
          style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Notifications
              </p>
              {unread > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white"
                  style={{ background: '#dc2626' }}>{unread}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button onClick={markAllRead}
                  className="text-[11px] px-2 py-1 rounded-md hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-1"
                  style={{ color: 'var(--text-secondary)' }}>
                  <Check size={10} />
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)}
                className="p-1 rounded-md hover:bg-[var(--bg-hover)] transition-colors">
                <X size={13} style={{ color: 'var(--text-tertiary)' }} />
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={24} className="mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => markRead(n)}
                  className="w-full text-left flex items-start gap-3 px-4 py-3 border-b hover:bg-[var(--bg-subtle)] transition-colors"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {/* Icon */}
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: `${typeColor(n.type)}18`, color: typeColor(n.type) }}>
                    {typeIcon(n.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs leading-snug ${n.is_read ? '' : 'font-semibold'}`}
                      style={{ color: n.is_read ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                      {n.message}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {timeAgo(n.created_at)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!n.is_read && (
                    <span className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                      style={{ background: '#2563eb' }} />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Toasts overlay */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            onClick={() => {
              markRead(toast)
              setToasts(prev => prev.filter(t => t.id !== toast.id))
            }}
            className="w-80 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 pointer-events-auto flex items-start gap-3 animate-in slide-in-from-right-8 fade-in duration-300 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
              <Bell size={14} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 mb-1">New Notification</p>
              <p className="text-xs text-gray-600 leading-snug">{toast.message}</p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation()
                setToasts(prev => prev.filter(t => t.id !== toast.id))
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
