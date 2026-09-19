/**
 * ChatPopover — bottom-right floating DM panel (~360x480px).
 * Opens when clicking an avatar in the FloatingContactRail.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Send, Pencil, Check, X as XIcon } from 'lucide-react'
import { useChat } from '../../lib/ChatContext'
import { useAuth } from '../../lib/AuthContext'
import type { ChatMessage } from '../../lib/chat'

type PresenceStatus = 'online' | 'on_leave' | 'offline'

function presenceColor(s: PresenceStatus) {
  return s === 'online' ? '#22c55e' : s === 'on_leave' ? '#f59e0b' : '#9ca3af'
}
function presenceLabel(s: PresenceStatus) {
  return s === 'online' ? 'Online' : s === 'on_leave' ? 'On leave' : 'Offline'
}

function Avatar({ emp, size = 32 }: { emp: any; size?: number }) {
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

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function ChatPopover() {
  const { user } = useAuth()
  const {
    popoverConvId, closePopover, conversations, messages,
    sendMessage, editMessage, markRead, presence, employees,
    loadMessages, typingUsers,
  } = useChat()

  const [input, setInput] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const conv = conversations.find(c => c.id === popoverConvId)
  const convMessages = popoverConvId ? (messages[popoverConvId] || []) : []

  // The other person in a DM
  const otherMember = conv?.members?.find(m => m.id !== user?.id)
  const otherEmp = employees.find(e => e.id === otherMember?.id)
  const otherStatus = (presence[otherMember?.id || ''] || 'offline') as PresenceStatus

  // The name to display (group name or DM partner name)
  const displayName = conv?.type === 'group'
    ? (conv.name || 'Group')
    : (otherMember ? `${otherMember.first_name} ${otherMember.last_name}` : '...')

  // Load messages on open
  useEffect(() => {
    if (!popoverConvId) return
    loadMessages(popoverConvId)
  }, [popoverConvId]) // eslint-disable-line

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [convMessages.length])

  // Mark read when opened
  useEffect(() => {
    if (!popoverConvId || convMessages.length === 0) return
    const lastMsg = convMessages[convMessages.length - 1]
    markRead(popoverConvId, lastMsg.id)
  }, [popoverConvId, convMessages.length]) // eslint-disable-line

  const handleSend = useCallback(() => {
    if (!input.trim() || !popoverConvId) return
    sendMessage(popoverConvId, input.trim())
    setInput('')
    inputRef.current?.focus()
  }, [input, popoverConvId, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const startEdit = (msg: ChatMessage) => {
    setEditingId(msg.id)
    setEditBody(msg.body)
  }

  const commitEdit = () => {
    if (!editingId || !editBody.trim()) return
    editMessage(editingId, editBody.trim())
    setEditingId(null)
    setEditBody('')
  }

  const cancelEdit = () => { setEditingId(null); setEditBody('') }

  const typingInConv = (typingUsers[popoverConvId || ''] || [])
    .filter(id => id !== user?.id)
    .map(id => {
      const e = employees.find(e => e.id === id)
      return e ? e.first_name : 'Someone'
    })

  return (
    <div
      className="fixed bottom-4 right-16 z-[200] flex flex-col rounded-2xl overflow-hidden"
      style={{
        width: 360,
        height: 480,
        background: '#ffffff',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.14)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--sidebar-bg)' }}
      >
        {conv?.type === 'dm' && otherMember && (
          <div className="relative">
            <Avatar emp={otherEmp || otherMember} size={34} />
            <span
              className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white"
              style={{ background: presenceColor(otherStatus) }}
            />
          </div>
        )}
        {conv?.type === 'group' && (
          <div className="w-[34px] h-[34px] rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-xs flex-shrink-0">
            {(conv.name || 'G')[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
            {displayName}
          </div>
          {conv?.type === 'dm' && (
            <div className="text-[11px]" style={{ color: presenceColor(otherStatus) }}>
              {presenceLabel(otherStatus)}
            </div>
          )}
          {conv?.type === 'group' && (
            <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              {conv.members?.length} members
            </div>
          )}
        </div>
        <button
          className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onClick={closePopover}
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {convMessages.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
            No messages yet. Say hello!
          </div>
        )}
        {convMessages.map((msg) => {
          const isMine = msg.sender_id === user?.id
          const sender = employees.find(e => e.id === msg.sender_id)
          const isEditing = editingId === msg.id

          return (
            <div key={msg.id} className={`flex gap-2 group ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
              {!isMine && <Avatar emp={sender || { first_name: msg.first_name, last_name: msg.last_name, avatar_url: msg.avatar_url }} size={26} />}

              <div className={`flex flex-col max-w-[75%] ${isMine ? 'items-end' : 'items-start'}`}>
                {!isMine && (
                  <span className="text-[10px] mb-0.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {msg.first_name || sender?.first_name}
                  </span>
                )}
                {isEditing ? (
                  <div className="flex flex-col gap-1 w-full">
                    <textarea
                      className="text-sm px-2 py-1 rounded-lg border w-full resize-none"
                      style={{ borderColor: 'var(--border-strong)', minHeight: 60 }}
                      value={editBody}
                      onChange={e => setEditBody(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() } if (e.key === 'Escape') cancelEdit() }}
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <button onClick={commitEdit} className="px-2 py-0.5 rounded text-[11px] bg-gray-900 text-white flex items-center gap-1"><Check size={10} /> Save</button>
                      <button onClick={cancelEdit} className="px-2 py-0.5 rounded text-[11px] border flex items-center gap-1" style={{ borderColor: 'var(--border)' }}><XIcon size={10} /> Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div
                      className="px-3 py-2 rounded-2xl text-sm leading-relaxed"
                      style={
                        isMine
                          ? { background: '#111827', color: '#fff', borderBottomRightRadius: 6 }
                          : { background: 'var(--bg-subtle)', color: 'var(--text-primary)', borderBottomLeftRadius: 6 }
                      }
                    >
                      {msg.body}
                    </div>
                    {/* Edit pencil — only on own messages */}
                    {isMine && (
                      <button
                        className="absolute -top-1 -left-6 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-white shadow-sm border"
                        style={{ borderColor: 'var(--border)' }}
                        onClick={() => startEdit(msg)}
                      >
                        <Pencil size={10} style={{ color: 'var(--text-secondary)' }} />
                      </button>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    {formatTime(msg.created_at)}
                  </span>
                  {msg.edited_at && (
                    <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>(edited)</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {typingInConv.length > 0 && (
          <div className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            <span className="flex gap-0.5">
              <span className="animate-bounce" style={{ animationDelay: '0ms' }}>•</span>
              <span className="animate-bounce" style={{ animationDelay: '100ms' }}>•</span>
              <span className="animate-bounce" style={{ animationDelay: '200ms' }}>•</span>
            </span>
            {typingInConv[0]} is typing…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div
        className="px-3 py-2.5 border-t flex items-end gap-2 flex-shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
      >
        <textarea
          ref={inputRef}
          className="flex-1 resize-none rounded-xl px-3 py-2 text-sm leading-relaxed"
          style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            minHeight: 36,
            maxHeight: 100,
            outline: 'none',
          }}
          placeholder={`Message ${displayName}…`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
          style={{
            background: input.trim() ? '#111827' : 'var(--bg-hover)',
            color: input.trim() ? '#fff' : 'var(--text-tertiary)',
          }}
          onClick={handleSend}
          disabled={!input.trim()}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}
