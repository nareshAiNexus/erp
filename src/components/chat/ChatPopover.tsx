/**
 * ChatPopover — bottom-right floating DM panel (~360x480px).
 * Opens when clicking an avatar or group in the FloatingContactRail.
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { X, Send, Pencil, Check, CheckCheck, X as XIcon, Settings, AtSign } from 'lucide-react'
import { useChat } from '../../lib/ChatContext'
import { useAuth } from '../../lib/AuthContext'
import type { ChatMessage } from '../../lib/chat'
import { GroupEditModal } from './GroupEditModal'

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

function MessageStatusTicks({ status }: { status?: 'sending' | 'sent' | 'delivered' | 'read' }) {
  if (status === 'read') {
    return (
      <span title="Read" className="inline-flex items-center text-sky-500 flex-shrink-0">
        <CheckCheck size={12} strokeWidth={2.5} />
      </span>
    )
  }
  if (status === 'delivered') {
    return (
      <span title="Delivered" className="inline-flex items-center text-gray-400 flex-shrink-0">
        <CheckCheck size={12} strokeWidth={2.5} />
      </span>
    )
  }
  return (
    <span title="Sent" className="inline-flex items-center text-gray-400 flex-shrink-0">
      <Check size={12} strokeWidth={2.5} />
    </span>
  )
}

function renderMessageText(text: string, isMine: boolean) {
  const parts = text.split(/(@[a-zA-Z0-9_\s]+?)(?=\s@|\s|$|[.,!?])/g)
  return parts.map((part, i) => {
    if (part.startsWith('@') && part.length > 1) {
      return (
        <span
          key={i}
          className={`font-semibold px-1 py-0.5 rounded ${
            isMine ? 'bg-white/20 text-white' : 'bg-violet-100 text-violet-700'
          }`}
        >
          {part}
        </span>
      )
    }
    return part
  })
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
  const [showGroupEdit, setShowGroupEdit] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionIndex, setMentionIndex] = useState(0)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const conv = conversations.find(c => c.id === popoverConvId)
  const convMessages = popoverConvId ? (messages[popoverConvId] || []) : []

  // The other person in a DM
  const otherMember = conv?.members?.find(m => m.id !== user?.id)
  const otherEmp = employees.find(e => e.id === otherMember?.id)
  const otherStatus = (otherMember ? (presence[otherMember.id] || 'offline') : 'offline') as PresenceStatus

  // The name to display (group name or DM partner name)
  const displayName = conv?.type === 'group'
    ? (conv.name || 'Group')
    : (otherMember ? `${otherMember.first_name} ${otherMember.last_name}` : '...')

  // Mention suggestions
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

  // Load messages on open
  useEffect(() => {
    if (!popoverConvId) return
    loadMessages(popoverConvId)
  }, [popoverConvId]) // eslint-disable-line

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [convMessages.length])

  // Mark read strictly when user is ACTUALLY viewing and window is focused
  const tryMarkRead = useCallback(() => {
    if (!popoverConvId || convMessages.length === 0 || !user) return
    if (typeof document !== 'undefined') {
      if (document.visibilityState !== 'visible' || !document.hasFocus()) return
    }
    const lastIncoming = [...convMessages].reverse().find(m => m.sender_id !== user.id)
    if (lastIncoming) {
      markRead(popoverConvId, lastIncoming.id)
    }
  }, [popoverConvId, convMessages, user, markRead])

  useEffect(() => {
    tryMarkRead()
  }, [tryMarkRead])

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
    if (!input.trim() || !popoverConvId) return
    sendMessage(popoverConvId, input.trim())
    setInput('')
    setShowMentions(false)
    inputRef.current?.focus()
  }, [input, popoverConvId, sendMessage])

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
      className="fixed bottom-3 right-16 z-[200] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
      style={{
        width: 360,
        height: 480,
        maxHeight: 'calc(100vh - 24px)',
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
          <div
            onClick={() => setShowGroupEdit(true)}
            className="w-[34px] h-[34px] rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-xs flex-shrink-0 cursor-pointer hover:opacity-80 overflow-hidden"
          >
            {conv.avatar_url ? (
              conv.avatar_url.startsWith('http') || conv.avatar_url.startsWith('data:') ? (
                <img src={conv.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-base leading-none">{conv.avatar_url}</span>
              )
            ) : (
              <span>{(conv.name || 'G')[0].toUpperCase()}</span>
            )}
          </div>
        )}
        <div
          className={`flex-1 min-w-0 ${conv?.type === 'group' ? 'cursor-pointer' : ''}`}
          onClick={() => {
            if (conv?.type === 'group') setShowGroupEdit(true)
          }}
        >
          <div className="font-semibold text-sm truncate flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
            {displayName}
            {conv?.type === 'group' && <Pencil size={11} className="text-gray-400" />}
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
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onClick={closePopover}
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 min-h-0">
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
                      className="text-sm px-2 py-1 rounded-lg border w-full resize-none outline-none"
                      style={{ borderColor: 'var(--border-strong)', minHeight: 60 }}
                      value={editBody}
                      onChange={e => setEditBody(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() } if (e.key === 'Escape') cancelEdit() }}
                      autoFocus
                    />
                    <div className="flex gap-1 justify-end">
                      <button onClick={cancelEdit} className="px-2 py-0.5 rounded text-[11px] border flex items-center gap-1" style={{ borderColor: 'var(--border)' }}><XIcon size={10} /> Cancel</button>
                      <button onClick={commitEdit} className="px-2 py-0.5 rounded text-[11px] bg-gray-900 text-white flex items-center gap-1"><Check size={10} /> Save</button>
                    </div>
                  </div>
                ) : (
                  <div className="relative group/bubble">
                    <div
                      className="px-3.5 py-2 rounded-2xl text-sm leading-relaxed shadow-sm break-words"
                      style={
                        isMine
                          ? { background: '#111827', color: '#fff', borderTopRightRadius: 4 }
                          : { background: 'var(--bg-subtle)', color: 'var(--text-primary)', borderTopLeftRadius: 4 }
                      }
                    >
                      <p className="whitespace-pre-wrap">{renderMessageText(msg.body, isMine)}</p>
                    </div>
                    {/* Edit pencil — only on own messages */}
                    {isMine && (
                      <button
                        className="absolute -top-1 -left-6 opacity-0 group-hover/bubble:opacity-100 transition-opacity p-1 rounded-full bg-white shadow-sm border"
                        style={{ borderColor: 'var(--border)' }}
                        onClick={() => startEdit(msg)}
                      >
                        <Pencil size={10} style={{ color: 'var(--text-secondary)' }} />
                      </button>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-1 mt-0.5 px-0.5">
                  <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    {formatTime(msg.created_at)}
                  </span>
                  {msg.edited_at && (
                    <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>(edited)</span>
                  )}
                  {isMine && <MessageStatusTicks status={msg.status} />}
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
        className="px-3 py-2 border-t flex items-end gap-1.5 flex-shrink-0 bg-white relative"
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Mentions popup */}
        {showMentions && mentionCandidates.length > 0 && (
          <div
            className="absolute bottom-full mb-2 left-3 w-56 max-h-40 overflow-y-auto rounded-xl border bg-white shadow-xl py-1 z-30 divide-y divide-gray-100"
            style={{ borderColor: 'var(--border)' }}
          >
            {mentionCandidates.map((emp, i) => (
              <div
                key={emp.id}
                onClick={() => insertMention(emp)}
                className={`flex items-center gap-2 px-2.5 py-1.5 cursor-pointer text-xs transition-colors ${
                  i === mentionIndex ? 'bg-violet-50 text-violet-900' : 'hover:bg-gray-50'
                }`}
              >
                <Avatar emp={emp} size={20} />
                <span className="font-medium truncate">{emp.first_name} {emp.last_name}</span>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setInput(prev => prev + '@')
            setShowMentions(true)
            inputRef.current?.focus()
          }}
          className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors flex-shrink-0 mb-0.5"
          title="Tag someone (@)"
        >
          <AtSign size={15} />
        </button>

        <textarea
          ref={inputRef}
          className="flex-1 resize-none rounded-xl px-2.5 py-1.5 text-xs leading-relaxed outline-none border transition-all focus:border-gray-900"
          style={{
            background: 'var(--bg-subtle)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
            minHeight: 32,
            maxHeight: 90,
          }}
          placeholder={`Message ${displayName}…`}
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
          <Send size={13} />
        </button>
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
