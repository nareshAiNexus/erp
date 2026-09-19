/**
 * ThreadView — the middle column in the full MessagesView.
 * Shows message history for the selected conversation + composer.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { Send, Pencil, Check, X as XIcon, Users } from 'lucide-react'
import { useChat } from '../../lib/ChatContext'
import { useAuth } from '../../lib/AuthContext'
import { getChatSocket } from '../../lib/chat'
import type { ChatMessage } from '../../lib/chat'

type PresenceStatus = 'online' | 'on_leave' | 'offline'

function presenceColor(s: PresenceStatus) {
  return s === 'online' ? '#22c55e' : s === 'on_leave' ? '#f59e0b' : '#9ca3af'
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

function formatDateDivider(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

export function ThreadView({ onShowMemberInfo }: { onShowMemberInfo?: () => void }) {
  const { user } = useAuth()
  const {
    selectedConvId, conversations, messages, employees,
    sendMessage, editMessage, loadMessages, markRead,
    typingUsers, presence,
  } = useChat()

  const [input, setInput] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeout = useRef<any>(null)

  const conv = conversations.find(c => c.id === selectedConvId)
  const convMessages = selectedConvId ? (messages[selectedConvId] || []) : []

  const otherMember = conv?.type === 'dm' ? conv.members?.find(m => m.id !== user?.id) : null
  const otherStatus = (presence[otherMember?.id || ''] || 'offline') as PresenceStatus

  const displayName = conv?.type === 'group'
    ? (conv.name || `${conv.members?.length} members`)
    : (otherMember ? `${otherMember.first_name} ${otherMember.last_name}` : '…')

  const displaySubtitle = conv?.type === 'group'
    ? `${conv.members?.length || 0} members · ${conv.members?.filter(m => presence[m.id] === 'online').length || 0} online`
    : (otherMember ? `${otherMember.department || ''} ${otherMember.role ? '· ' + otherMember.role : ''}`.trim() : '')

  useEffect(() => {
    if (!selectedConvId) return
    loadMessages(selectedConvId)
  }, [selectedConvId]) // eslint-disable-line

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [convMessages.length])

  // Mark read when viewing
  useEffect(() => {
    if (!selectedConvId || convMessages.length === 0) return
    const lastMsg = convMessages[convMessages.length - 1]
    markRead(selectedConvId, lastMsg.id)
  }, [selectedConvId, convMessages.length]) // eslint-disable-line

  const handleSend = useCallback(() => {
    if (!input.trim() || !selectedConvId) return
    sendMessage(selectedConvId, input.trim())
    setInput('')
    inputRef.current?.focus()
  }, [input, selectedConvId, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    if (!selectedConvId || !user) return
    // Typing indicator
    const socket = getChatSocket(user.id)
    socket.emit('typing:start', { conversationId: selectedConvId })
    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId: selectedConvId })
    }, 2000)
  }

  const startEdit = (msg: ChatMessage) => { setEditingId(msg.id); setEditBody(msg.body) }
  const commitEdit = () => {
    if (!editingId || !editBody.trim()) return
    editMessage(editingId, editBody.trim())
    setEditingId(null); setEditBody('')
  }
  const cancelEdit = () => { setEditingId(null); setEditBody('') }

  const typingInConv = (typingUsers[selectedConvId || ''] || [])
    .filter(id => id !== user?.id)
    .map(id => employees.find(e => e.id === id)?.first_name || 'Someone')

  // Group messages by date
  type MsgGroup = { date: string; items: ChatMessage[] }
  const grouped = convMessages.reduce<MsgGroup[]>((acc, msg) => {
    const date = new Date(msg.created_at).toDateString()
    const last = acc[acc.length - 1]
    if (last && last.date === date) { last.items.push(msg) }
    else acc.push({ date, items: [msg] })
    return acc
  }, [])

  if (!selectedConvId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-subtle)' }}>
          <Users size={24} style={{ color: 'var(--text-tertiary)' }} />
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Select a conversation to start messaging</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      {/* Thread Header */}
      <div
        className="px-5 py-3.5 border-b flex items-center gap-3 flex-shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
      >
        {conv?.type === 'dm' && otherMember && (
          <div className="relative flex-shrink-0">
            <Avatar emp={employees.find(e => e.id === otherMember.id) || otherMember} size={36} />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: presenceColor(otherStatus) }} />
          </div>
        )}
        {conv?.type === 'group' && (
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: '#ede9fe', color: '#7c3aed' }}>
            {(conv.name || '#')[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{displayName}</h2>
          {displaySubtitle && (
            <p className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>{displaySubtitle}</p>
          )}
        </div>
        {onShowMemberInfo && (
          <button
            className="text-[11px] px-2.5 py-1 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-1"
            style={{ color: 'var(--text-secondary)' }}
            onClick={onShowMemberInfo}
          >
            <Users size={12} /> Info
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-1">
        {convMessages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 mt-20">
            <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Start the conversation</div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {conv?.type === 'dm' ? `Send a message to ${displayName}` : 'Be the first to say something'}
            </div>
          </div>
        )}

        {grouped.map(({ date, items }) => (
          <div key={date}>
            {/* Date divider */}
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 border-t" style={{ borderColor: 'var(--border)' }} />
              <span className="text-[11px] font-medium px-2" style={{ color: 'var(--text-tertiary)' }}>{formatDateDivider(items[0].created_at)}</span>
              <div className="flex-1 border-t" style={{ borderColor: 'var(--border)' }} />
            </div>

            {items.map((msg, idx) => {
              const isMine = msg.sender_id === user?.id
              const prevMsg = idx > 0 ? items[idx - 1] : null
              const showSenderHeader = !prevMsg || prevMsg.sender_id !== msg.sender_id
              const sender = employees.find(e => e.id === msg.sender_id)
              const isEditing = editingId === msg.id

              return (
                <div key={msg.id} className={`flex gap-2.5 group ${showSenderHeader ? 'mt-4' : 'mt-0.5'}`}>
                  {/* Avatar — only on first message in group */}
                  <div className="w-8 flex-shrink-0 flex flex-col justify-start">
                    {showSenderHeader && !isMine && (
                      <Avatar emp={sender || { first_name: msg.first_name, last_name: msg.last_name, avatar_url: msg.avatar_url }} size={32} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {showSenderHeader && (
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-sm font-semibold" style={{ color: isMine ? '#7c3aed' : 'var(--text-primary)' }}>
                          {isMine ? 'You' : `${msg.first_name || sender?.first_name} ${msg.last_name || sender?.last_name}`}
                        </span>
                        <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{formatTime(msg.created_at)}</span>
                      </div>
                    )}

                    {isEditing ? (
                      <div className="flex flex-col gap-1.5 max-w-[520px]">
                        <textarea
                          className="text-sm px-3 py-2 rounded-lg border resize-none"
                          style={{ borderColor: 'var(--border-strong)', minHeight: 64, outline: 'none' }}
                          value={editBody}
                          onChange={e => setEditBody(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() } if (e.key === 'Escape') cancelEdit() }}
                          autoFocus
                        />
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          <span>Enter to save</span>
                          <span>·</span>
                          <span>Esc to cancel</span>
                          <button onClick={commitEdit} className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded bg-gray-900 text-white"><Check size={10} /> Save</button>
                          <button onClick={cancelEdit} className="flex items-center gap-1 px-2 py-0.5 rounded border" style={{ borderColor: 'var(--border)' }}><XIcon size={10} /> Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative flex items-start gap-2 group/msg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-relaxed break-words whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                            {msg.body}
                            {msg.edited_at && (
                              <span className="ml-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>(edited)</span>
                            )}
                          </p>
                        </div>
                        {/* Hover actions — only on own messages */}
                        {isMine && (
                          <button
                            className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 rounded-md hover:bg-gray-100 flex-shrink-0"
                            style={{ color: 'var(--text-secondary)' }}
                            onClick={() => startEdit(msg)}
                            title="Edit message"
                          >
                            <Pencil size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {typingInConv.length > 0 && (
          <div className="flex items-center gap-2 mt-2 ml-10 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <span className="flex gap-0.5">
              <span className="animate-bounce" style={{ animationDelay: '0ms' }}>•</span>
              <span className="animate-bounce" style={{ animationDelay: '100ms' }}>•</span>
              <span className="animate-bounce" style={{ animationDelay: '200ms' }}>•</span>
            </span>
            {typingInConv.join(', ')} {typingInConv.length === 1 ? 'is' : 'are'} typing…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="px-5 py-3 border-t flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div
          className="flex items-end gap-2 rounded-xl px-3 py-2"
          style={{ border: '1px solid var(--border-strong)', background: 'var(--bg)' }}
        >
          <textarea
            ref={inputRef}
            className="flex-1 resize-none text-sm leading-relaxed bg-transparent outline-none"
            style={{ color: 'var(--text-primary)', minHeight: 24, maxHeight: 120 }}
            placeholder={`Message ${displayName}…`}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              background: input.trim() ? '#111827' : 'var(--bg-hover)',
              color: input.trim() ? '#fff' : 'var(--text-tertiary)',
            }}
            onClick={handleSend}
            disabled={!input.trim()}
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-[10px] mt-1.5 ml-1" style={{ color: 'var(--text-tertiary)' }}>
          Enter to send · Shift + Enter for new line
        </p>
      </div>
    </div>
  )
}
