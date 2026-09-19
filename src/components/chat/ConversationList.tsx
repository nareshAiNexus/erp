/**
 * ConversationList — left column of the full MessagesView.
 * Shows group channels + direct messages with unread badges.
 */
import { useState } from 'react'
import { Search, Plus, Bell } from 'lucide-react'
import { useChat } from '../../lib/ChatContext'
import { useAuth } from '../../lib/AuthContext'
import { NewConversationDialog } from './NewConversationDialog'

type PresenceStatus = 'online' | 'on_leave' | 'offline'

function presenceColor(s: PresenceStatus) {
  return s === 'online' ? '#22c55e' : s === 'on_leave' ? '#f59e0b' : '#9ca3af'
}

function Avatar({ emp, size = 36 }: { emp: any; size?: number }) {
  const initials = `${emp?.first_name?.[0] || ''}${emp?.last_name?.[0] || ''}`.toUpperCase()
  const colors = ['#7c3aed','#2563eb','#0891b2','#059669','#d97706','#dc2626','#db2777']
  const idx = (emp?.first_name?.charCodeAt(0) || 0) % colors.length
  if (emp?.avatar_url) {
    return <img src={emp.avatar_url} alt={initials} style={{ width: size, height: size }} className="rounded-full object-cover flex-shrink-0" />
  }
  return (
    <div style={{ width: size, height: size, background: colors[idx], fontSize: size * 0.36 }} className="rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
      {initials}
    </div>
  )
}

function timeAgo(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1)  return 'now'
  if (mins < 60) return `${mins}m`
  if (hrs < 24)  return `${hrs}h`
  if (days < 7)  return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function ConversationList() {
  const { user } = useAuth()
  const {
    conversations, selectedConvId, setSelectedConvId, loadMessages, employees, presence,
    notificationPermission, enableNotifications, sendTestNotification,
  } = useChat()
  const [search, setSearch] = useState('')
  const [showNewDialog, setShowNewDialog] = useState(false)

  const groups = conversations.filter(c => c.type === 'group')
  const dms = conversations.filter(c => c.type === 'dm')

  const filterConv = (list: typeof conversations) => {
    if (!search) return list
    return list.filter(c => {
      const name = c.type === 'group'
        ? c.name || ''
        : (() => {
            const other = c.members?.find(m => m.id !== user?.id)
            return other ? `${other.first_name} ${other.last_name}` : ''
          })()
      return name.toLowerCase().includes(search.toLowerCase())
    })
  }

  const handleSelect = async (id: string) => {
    setSelectedConvId(id)
    await loadMessages(id)
  }

  const renderConvRow = (conv: (typeof conversations)[0]) => {
    const isActive = selectedConvId === conv.id
    const isDm = conv.type === 'dm'
    const otherMember = isDm ? conv.members?.find(m => m.id !== user?.id) : null
    const otherEmp = employees.find(e => e.id === otherMember?.id)
    const status = isDm ? (presence[otherMember?.id || ''] || 'offline') as PresenceStatus : null

    const displayName = isDm
      ? (otherMember ? `${otherMember.first_name} ${otherMember.last_name}` : '…')
      : (conv.name || 'Group')

    const lastMsgPreview = conv.last_message
      ? (conv.last_sender_id === user?.id ? `You: ${conv.last_message}` : conv.last_message)
      : 'No messages yet'

    return (
      <button
        key={conv.id}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left"
        style={{
          background: isActive ? 'var(--bg-hover)' : 'transparent',
          marginBottom: 1,
        }}
        onClick={() => handleSelect(conv.id)}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)' }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        {/* Avatar with presence */}
        <div className="relative flex-shrink-0">
          {isDm ? (
            <>
              <Avatar emp={otherEmp || otherMember} size={36} />
              <span
                className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white"
                style={{ background: presenceColor(status!) }}
              />
            </>
          ) : (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm overflow-hidden"
              style={{ background: '#ede9fe', color: '#7c3aed' }}
            >
              {conv.avatar_url ? (
                conv.avatar_url.startsWith('http') || conv.avatar_url.startsWith('data:') ? (
                  <img src={conv.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-base leading-none">{conv.avatar_url}</span>
                )
              ) : (
                <span>{(displayName)[0].toUpperCase()}</span>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span
              className="text-sm font-medium truncate"
              style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-primary)', fontWeight: conv.unread_count > 0 ? 600 : 400 }}
            >
              {displayName}
            </span>
            <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
              {timeAgo(conv.last_message_at)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="text-[11px] truncate flex-1"
              style={{ color: Number(conv.unread_count) > 0 ? 'var(--text-secondary)' : 'var(--text-tertiary)', fontWeight: Number(conv.unread_count) > 0 ? 500 : 400 }}
            >
              {lastMsgPreview}
            </span>
            {Number(conv.unread_count) > 0 && (
              <span
                className="flex-shrink-0 min-w-[18px] h-4.5 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                style={{ background: '#111827', fontSize: 10, height: 18 }}
              >
                {Number(conv.unread_count) > 99 ? '99+' : Number(conv.unread_count)}
              </span>
            )}
          </div>
        </div>
      </button>
    )
  }

  return (
    <div
      className="flex flex-col border-r"
      style={{ width: 256, borderColor: 'var(--border)', background: 'var(--sidebar-bg)', flexShrink: 0 }}
    >
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Messages</h1>
          <div className="flex items-center gap-1">
            <button
              className={`p-1.5 rounded-lg transition-colors ${
                notificationPermission === 'granted'
                  ? 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                  : 'text-amber-500 hover:text-amber-600 hover:bg-amber-50'
              }`}
              onClick={notificationPermission === 'granted' ? sendTestNotification : enableNotifications}
              title={
                notificationPermission === 'granted'
                  ? 'Windows push notifications active — click to test'
                  : 'Click to enable Windows desktop push notifications'
              }
            >
              <Bell size={14} />
            </button>
            <button
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onClick={() => setShowNewDialog(true)}
              title="New conversation"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}
        >
          <Search size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <input
            type="text"
            className="flex-1 text-xs bg-transparent outline-none"
            style={{ color: 'var(--text-primary)' }}
            placeholder="Search people or groups…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Enable Push Notifications Banner if not granted */}
        {notificationPermission !== 'granted' && (
          <div
            onClick={enableNotifications}
            className="mt-2.5 px-2.5 py-2 rounded-xl bg-violet-50 hover:bg-violet-100 transition-colors border border-violet-200 cursor-pointer flex items-center justify-between shadow-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Bell size={13} className="text-violet-600 flex-shrink-0 animate-bounce" />
              <span className="text-[11px] font-medium text-violet-900 truncate">
                Enable Windows push alerts
              </span>
            </div>
            <span className="text-[10px] font-bold text-violet-700 bg-white px-1.5 py-0.5 rounded shadow-xs flex-shrink-0 border border-violet-100">
              Enable
            </span>
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {/* Groups */}
        {filterConv(groups).length > 0 && (
          <>
            <div className="px-1 py-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                Groups
              </span>
            </div>
            {filterConv(groups).map(renderConvRow)}
          </>
        )}

        {/* Direct Messages */}
        {filterConv(dms).length > 0 && (
          <>
            <div className="px-1 py-1.5 mt-3 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                Direct Messages
              </span>
            </div>
            {filterConv(dms).map(renderConvRow)}
          </>
        )}

        {filterConv(groups).length === 0 && filterConv(dms).length === 0 && (
          <div className="py-8 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {search ? 'No results' : 'No conversations yet'}
          </div>
        )}
      </div>

      {showNewDialog && <NewConversationDialog onClose={() => setShowNewDialog(false)} />}
    </div>
  )
}
