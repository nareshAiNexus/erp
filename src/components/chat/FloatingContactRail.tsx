/**
 * FloatingContactRail — fixed right-edge presence strip.
 * Shows recent contacts with colored presence rings.
 * Click → opens ChatPopover. + → opens new DM dialog.
 */
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus } from 'lucide-react'
import { useChat } from '../../lib/ChatContext'
import { useAuth } from '../../lib/AuthContext'
import { ChatPopover } from './ChatPopover'
import { NewConversationDialog } from './NewConversationDialog'

type PresenceStatus = 'online' | 'on_leave' | 'offline'

function presenceRingColor(status: PresenceStatus) {
  if (status === 'online')   return '#22c55e'  // green
  if (status === 'on_leave') return '#f59e0b'  // yellow
  return '#9ca3af'                              // gray
}

function presenceLabel(status: PresenceStatus) {
  if (status === 'online')   return 'Online'
  if (status === 'on_leave') return 'On leave'
  return 'Offline'
}

function Avatar({ emp, size = 40 }: { emp: any; size?: number }) {
  const initials = `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase()
  const colors = ['#7c3aed','#2563eb','#0891b2','#059669','#d97706','#dc2626','#db2777']
  const colorIdx = (emp.first_name?.charCodeAt(0) || 0) % colors.length
  if (emp.avatar_url) {
    return (
      <img
        src={emp.avatar_url}
        alt={initials}
        style={{ width: size, height: size }}
        className="rounded-full object-cover"
      />
    )
  }
  return (
    <div
      style={{ width: size, height: size, background: colors[colorIdx], fontSize: size * 0.35 }}
      className="rounded-full flex items-center justify-center text-white font-semibold"
    >
      {initials}
    </div>
  )
}

export function FloatingContactRail() {
  const { user } = useAuth()
  const { employees, presence, conversations, openPopover, openPopoverConv, popoverConvId } = useChat()
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  if (!user) return null

  const groups = conversations.filter(c => c.type === 'group')

  // Build contact list: show other employees, sorted by presence (online first), limit 8
  const contacts = employees
    .filter(e => e.id !== user.id)
    .map(e => ({
      ...e,
      status: (presence[e.id] || 'offline') as PresenceStatus,
    }))
    .sort((a, b) => {
      const order = { online: 0, on_leave: 1, offline: 2 }
      return order[a.status] - order[b.status]
    })
    .slice(0, 8)

  // Compute unread per user (from DM conversations)
  const unreadByUser: Record<string, number> = {}
  conversations.forEach(c => {
    const count = Number(c.unread_count) || 0
    if (c.type === 'dm' && count > 0) {
      const other = c.members?.find(m => m.id !== user.id)
      if (other) unreadByUser[other.id] = (unreadByUser[other.id] || 0) + count
    }
  })

  return (
    <>
      {/* Rail */}
      <div
        className="fixed right-3 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2"
        style={{ pointerEvents: 'auto' }}
      >
        <div
          className="flex flex-col items-center gap-2 px-2 py-3 rounded-2xl shadow-lg"
          style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          }}
        >
          {/* Groups Section */}
          {groups.map(grp => {
            const unread = Number(grp.unread_count) || 0
            return (
              <div
                key={grp.id}
                className="relative cursor-pointer group"
                onMouseEnter={() => setHoveredId(grp.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => openPopoverConv(grp.id)}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm overflow-hidden border shadow-sm transition-transform active:scale-95"
                  style={{ background: '#ede9fe', color: '#7c3aed', borderColor: '#ddd6fe' }}
                >
                  {grp.avatar_url ? (
                    grp.avatar_url.startsWith('http') || grp.avatar_url.startsWith('data:') ? (
                      <img src={grp.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-base leading-none">{grp.avatar_url}</span>
                    )
                  ) : (
                    <span>{(grp.name || 'G')[0].toUpperCase()}</span>
                  )}
                </div>

                {/* Unread badge */}
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border border-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}

                {/* Tooltip */}
                {hoveredId === grp.id && (
                  <div
                    className="absolute right-full mr-3 top-1/2 -translate-y-1/2 z-50 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap pointer-events-none"
                    style={{
                      background: '#111',
                      color: '#fff',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                    }}
                  >
                    <div className="font-medium">{grp.name || 'Group'}</div>
                    <div className="text-[10px] text-gray-400">{grp.members?.length || 0} members</div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Divider between groups and direct messages */}
          {groups.length > 0 && contacts.length > 0 && (
            <div className="w-6 border-t my-0.5" style={{ borderColor: 'var(--border)' }} />
          )}

          {/* Contacts */}
          {contacts.map(emp => {
            const ringColor = presenceRingColor(emp.status)
            const unread = unreadByUser[emp.id] || 0

            return (
              <div
                key={emp.id}
                className="relative cursor-pointer group"
                onMouseEnter={() => setHoveredId(emp.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => openPopover(emp.id)}
              >
                {/* Presence ring */}
                <div
                  style={{
                    padding: 2,
                    borderRadius: '50%',
                    background: `conic-gradient(${ringColor} 0%, ${ringColor} 100%)`,
                    boxShadow: `0 0 0 2px white`,
                    transition: 'box-shadow 150ms',
                  }}
                >
                  <Avatar emp={emp} size={36} />
                </div>

                {/* Presence dot */}
                <span
                  className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
                  style={{ background: ringColor }}
                />

                {/* Unread badge */}
                {Number(unread) > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border border-white">
                    {Number(unread) > 99 ? '99+' : Number(unread)}
                  </span>
                )}

                {/* Tooltip */}
                {hoveredId === emp.id && (
                  <div
                    className="absolute right-full mr-3 top-1/2 -translate-y-1/2 z-50 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap pointer-events-none"
                    style={{
                      background: '#111',
                      color: '#fff',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                    }}
                  >
                    <div className="font-medium">{emp.first_name} {emp.last_name}</div>
                    <div style={{ color: ringColor, fontSize: 10 }}>{presenceLabel(emp.status)}</div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Divider */}
          {(contacts.length > 0 || groups.length > 0) && (
            <div className="w-6 border-t my-0.5" style={{ borderColor: 'var(--border)' }} />
          )}

          {/* New DM button */}
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
            style={{ color: 'var(--text-secondary)', border: '1.5px dashed var(--border-strong)' }}
            onClick={() => setShowNewDialog(true)}
            title="New message"
          >
            <Plus size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Popover portal */}
      {popoverConvId && createPortal(<ChatPopover />, document.body)}

      {/* New conversation dialog */}
      {showNewDialog && (
        <NewConversationDialog onClose={() => setShowNewDialog(false)} />
      )}
    </>
  )
}
