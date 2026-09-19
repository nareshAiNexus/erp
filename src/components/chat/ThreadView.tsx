/**
 * ThreadView — the middle column in the full MessagesView.
 * Shows message history for the selected conversation + composer.
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Send, Pencil, Check, CheckCheck, X as XIcon, Users, Settings, AtSign } from 'lucide-react'
import { useChat } from '../../lib/ChatContext'
import { useAuth } from '../../lib/AuthContext'
import { getChatSocket } from '../../lib/chat'
import type { ChatMessage } from '../../lib/chat'
import { GroupEditModal } from './GroupEditModal'

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

/** Delivery status ticks: single grey tick (sent), double grey tick (delivered), double blue tick (read) */
function MessageStatusTicks({ status }: { status?: 'sending' | 'sent' | 'delivered' | 'read' }) {
  if (status === 'read') {
    return (
      <span title="Read" className="inline-flex items-center text-sky-500 flex-shrink-0">
        <CheckCheck size={13} strokeWidth={2.5} />
      </span>
    )
  }
  if (status === 'delivered') {
    return (
      <span title="Delivered" className="inline-flex items-center text-gray-400 flex-shrink-0">
        <CheckCheck size={13} strokeWidth={2.5} />
      </span>
    )
  }
  return (
    <span title="Sent" className="inline-flex items-center text-gray-400 flex-shrink-0">
      <Check size={13} strokeWidth={2.5} />
    </span>
  )
}

/** Render message text with highlighted @mentions */
function renderMessageText(text: string, isMine: boolean) {
  const parts = text.split(/(@[a-zA-Z0-9_\s]+?)(?=\s@|\s|$|[.,!?])/g)
  return parts.map((part, i) => {
    if (part.startsWith('@') && part.length > 1) {
      return (
        <span
          key={i}
          className={`font-semibold px-1 py-0.5 rounded ${
            isMine
              ? 'bg-white/20 text-white'
              : 'bg-violet-100 text-violet-700'
          }`}
        >
          {part}
        </span>
      )
    }
    return part
  })
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
  const [showGroupEdit, setShowGroupEdit] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionIndex, setMentionIndex] = useState(0)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeout = useRef<any>(null)

  const conv = conversations.find(c => c.id === selectedConvId)
  const convMessages = selectedConvId ? (messages[selectedConvId] || []) : []

  const otherMember = conv?.type === 'dm' ? conv.members?.find(m => m.id !== user?.id) : null
  const otherStatus = (presence[otherMember?.id || ''] || 'offline') as PresenceStatus

  const displayName = conv?.type === 'group'
    ? (conv.name || `${conv.members?.length || 0} members`)
    : (otherMember ? `${otherMember.first_name} ${otherMember.last_name}` : '…')

  const displaySubtitle = conv?.type === 'group'
    ? `${conv.members?.length || 0} members · ${conv.members?.filter(m => presence[m.id] === 'online').length || 0} online`
    : (otherMember ? `${otherMember.department || ''} ${otherMember.role ? '· ' + otherMember.role : ''}`.trim() : '')

  // Mention suggestions from members or employees
  const mentionCandidates = useMemo(() => {
    const list = conv?.members && conv.members.length > 0
      ? conv.members.map(m => employees.find(e => e.id === m.id) || m)
      : employees

    return list.filter(e => {
      if (e.id === user?.id) return false
      const fullName = `${e.first_name} ${e.last_name}`.toLowerCase()
      return fullName.includes(mentionQuery.toLowerCase())
    })
  }, [conv?.members, employees, mentionQuery, user?.id])

  useEffect(() => {
    if (!selectedConvId) return
    loadMessages(selectedConvId)
  }, [selectedConvId]) // eslint-disable-line

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [convMessages.length])

  // Mark read strictly when user is ACTUALLY viewing and window is focused
  const tryMarkRead = useCallback(() => {
    if (!selectedConvId || convMessages.length === 0 || !user) return
    if (typeof document !== 'undefined') {
      if (document.visibilityState !== 'visible' || !document.hasFocus()) return
    }
    // ONLY mark read up to the latest INCOMING message sent by someone else!
    const lastIncoming = [...convMessages].reverse().find(m => m.sender_id !== user.id)
    if (lastIncoming) {
      markRead(selectedConvId, lastIncoming.id)
    }
  }, [selectedConvId, convMessages, user, markRead])

  useEffect(() => {
    tryMarkRead()
  }, [tryMarkRead])

  // Window focus listener to mark read only when tab is brought to foreground
  useEffect(() => {
    const handleFocus = () => tryMarkRead()
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [tryMarkRead])

  const handleSend = useCallback(() => {
    if (!input.trim() || !selectedConvId) return
    sendMessage(selectedConvId, input.trim())
    setInput('')
    setShowMentions(false)
    inputRef.current?.focus()
  }, [input, selectedConvId, sendMessage])

  const insertMention = (emp: any) => {
    const cursor = inputRef.current?.selectionStart || input.length
    const textBefore = input.slice(0, cursor)
    const textAfter = input.slice(cursor)
    const newTextBefore = textBefore.replace(/@([a-zA-Z0-9_]{0,20})$/, `@${emp.first_name} ${emp.last_name} `)
    setInput(newTextBefore + textAfter)
    setShowMentions(false)
    setTimeout(() => inputRef.current?.focus(), 10)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && mentionCandidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex(i => (i + 1) % mentionCandidates.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex(i => (i - 1 + mentionCandidates.length) % mentionCandidates.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(mentionCandidates[mentionIndex])
        return
      }
      if (e.key === 'Escape') {
        setShowMentions(false)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setInput(val)

    // Check for @mention trigger (only matches @ followed by word chars, closes on space)
    const cursor = e.target.selectionStart
    const textBefore = val.slice(0, cursor)
    const match = textBefore.match(/@([a-zA-Z0-9_]{0,20})$/)
    if (match) {
      setMentionQuery(match[1])
      setShowMentions(true)
      setMentionIndex(0)
    } else {
      setShowMentions(false)
    }

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
    <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full">
      {/* Thread Header */}
      <div
        className="px-5 py-3 border-b flex items-center gap-3 flex-shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
      >
        {conv?.type === 'dm' && otherMember && (
          <div className="relative flex-shrink-0">
            <Avatar emp={employees.find(e => e.id === otherMember.id) || otherMember} size={36} />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: presenceColor(otherStatus) }} />
          </div>
        )}
        {conv?.type === 'group' && (
          <div
            onClick={() => setShowGroupEdit(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity border"
            style={{ background: '#ede9fe', color: '#7c3aed', borderColor: '#ddd6fe' }}
            title="Click to edit group details"
          >
            {conv.avatar_url ? (
              <span className="text-base">{conv.avatar_url}</span>
            ) : (
              <span>{(conv.name || 'G')[0].toUpperCase()}</span>
            )}
          </div>
        )}

        <div
          className={`flex-1 min-w-0 ${conv?.type === 'group' ? 'cursor-pointer group/title' : ''}`}
          onClick={() => {
            if (conv?.type === 'group') setShowGroupEdit(true)
          }}
        >
          <div className="flex items-center gap-1.5">
            <h2 className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
              {displayName}
            </h2>
            {conv?.type === 'group' && (
              <span className="opacity-0 group-hover/title:opacity-100 transition-opacity text-xs text-gray-400">
                <Pencil size={11} />
              </span>
            )}
          </div>
          {displaySubtitle && (
            <p className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>{displaySubtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {conv?.type === 'group' && (
            <button
              onClick={() => setShowGroupEdit(true)}
              className="text-xs px-2.5 py-1.5 rounded-lg border hover:bg-gray-50 transition-colors flex items-center gap-1.5"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              title="Edit Group"
            >
              <Settings size={13} />
              <span>Edit Group</span>
            </button>
          )}
          {onShowMemberInfo && (
            <button
              className="text-[11px] px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1"
              style={{ color: 'var(--text-secondary)' }}
              onClick={onShowMemberInfo}
            >
              <Users size={12} /> Info
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-1 min-h-0">
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

              // ── Right-aligned for Current User's Sent Messages ──
              if (isMine) {
                return (
                  <div key={msg.id} className="flex justify-end group/msg mt-1 mb-0.5">
                    <div className="flex flex-col items-end max-w-[72%]">
                      {isEditing ? (
                        <div className="flex flex-col gap-1.5 w-full min-w-[280px]">
                          <textarea
                            className="text-sm px-3 py-2 rounded-xl border resize-none outline-none focus:ring-2 focus:ring-gray-900/10"
                            style={{ borderColor: 'var(--border-strong)', minHeight: 64 }}
                            value={editBody}
                            onChange={e => setEditBody(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() }
                              if (e.key === 'Escape') cancelEdit()
                            }}
                            autoFocus
                          />
                          <div className="flex items-center justify-end gap-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            <button onClick={cancelEdit} className="px-2 py-0.5 rounded border hover:bg-gray-50 flex items-center gap-1">
                              <XIcon size={10} /> Cancel
                            </button>
                            <button onClick={commitEdit} className="px-2 py-0.5 rounded bg-gray-900 text-white hover:bg-black flex items-center gap-1">
                              <Check size={10} /> Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 group/bubble">
                          {/* Edit button on hover */}
                          <button
                            className="opacity-0 group-hover/bubble:opacity-100 transition-opacity p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex-shrink-0"
                            onClick={() => startEdit(msg)}
                            title="Edit message"
                          >
                            <Pencil size={12} />
                          </button>

                          {/* Dark right bubble */}
                          <div
                            className="px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed shadow-sm break-words"
                            style={{ background: '#111827', color: '#f9fafb' }}
                          >
                            <p className="break-words whitespace-pre-wrap">
                              {renderMessageText(msg.body, true)}
                            </p>
                            {msg.edited_at && (
                              <span className="text-[10px] text-gray-400 block text-right mt-0.5">(edited)</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Timestamp and message status ticks */}
                      {!isEditing && (
                        <div className="flex items-center gap-1 mt-0.5 pr-1 text-[10px] text-gray-400">
                          <span>{formatTime(msg.created_at)}</span>
                          <MessageStatusTicks status={msg.status} />
                        </div>
                      )}
                    </div>
                  </div>
                )
              }

              // ── Left-aligned for Received Messages ──
              return (
                <div key={msg.id} className={`flex gap-2.5 group/msg ${showSenderHeader ? 'mt-3' : 'mt-1'}`}>
                  {/* Avatar — only on first message in group */}
                  <div className="w-8 flex-shrink-0 flex flex-col justify-start">
                    {showSenderHeader ? (
                      <Avatar emp={sender || { first_name: msg.first_name, last_name: msg.last_name, avatar_url: msg.avatar_url }} size={32} />
                    ) : (
                      <div className="w-8" />
                    )}
                  </div>

                  <div className="flex flex-col items-start max-w-[72%]">
                    {showSenderHeader && (
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {msg.first_name || sender?.first_name} {msg.last_name || sender?.last_name}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    )}

                    {/* Light left bubble */}
                    <div
                      className="px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm leading-relaxed border shadow-sm"
                      style={{
                        background: 'var(--bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <p className="break-words whitespace-pre-wrap">
                        {renderMessageText(msg.body, false)}
                      </p>
                      {msg.edited_at && (
                        <span className="text-[10px] text-gray-400 block mt-0.5">(edited)</span>
                      )}
                    </div>

                    {!showSenderHeader && (
                      <span className="text-[10px] text-gray-400 mt-0.5 pl-1">
                        {formatTime(msg.created_at)}
                      </span>
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

      {/* Composer at Bottom with Tagging popup */}
      <div className="px-5 py-3 border-t flex-shrink-0 bg-white relative" style={{ borderColor: 'var(--border)' }}>
        {/* Mentions popup */}
        {showMentions && mentionCandidates.length > 0 && (
          <div
            className="absolute bottom-full mb-2 left-5 w-64 max-h-48 overflow-y-auto rounded-xl border bg-white shadow-xl py-1 z-30 divide-y divide-gray-100"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Tag a member
            </div>
            {mentionCandidates.map((emp, i) => (
              <div
                key={emp.id}
                onClick={() => insertMention(emp)}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-xs transition-colors ${
                  i === mentionIndex ? 'bg-violet-50 text-violet-900' : 'hover:bg-gray-50'
                }`}
              >
                <Avatar emp={emp} size={22} />
                <div className="flex-1 truncate">
                  <span className="font-medium">{emp.first_name} {emp.last_name}</span>
                  <span className="text-[10px] text-gray-400 ml-1.5 truncate">
                    {emp.role || emp.department}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          className="flex items-end gap-2 rounded-2xl px-3 py-2 border transition-all focus-within:ring-2 focus-within:ring-gray-900/10"
          style={{ borderColor: 'var(--border-strong)', background: 'var(--bg)' }}
        >
          {/* @ tag trigger button */}
          <button
            type="button"
            onClick={() => {
              setInput(prev => prev + '@')
              setShowMentions(true)
              inputRef.current?.focus()
            }}
            className="p-1 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors flex-shrink-0 mb-0.5"
            title="Tag someone (@)"
          >
            <AtSign size={16} />
          </button>

          <textarea
            ref={inputRef}
            className="flex-1 resize-none text-sm leading-relaxed bg-transparent outline-none py-1"
            style={{ color: 'var(--text-primary)', minHeight: 24, maxHeight: 120 }}
            placeholder={`Message ${displayName}… (Type @ to tag)`}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
          />

          <button
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
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
        <p className="text-[10px] mt-1 ml-1" style={{ color: 'var(--text-tertiary)' }}>
          Enter to send · Shift + Enter for new line · Type @ to mention
        </p>
      </div>

      {/* Group Edit Modal */}
      {showGroupEdit && conv?.type === 'group' && (
        <GroupEditModal
          conversation={conv}
          onClose={() => setShowGroupEdit(false)}
        />
      )}
    </div>
  )
}
