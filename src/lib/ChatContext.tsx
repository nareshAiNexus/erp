/**
 * ChatContext.tsx — Global React context for the messaging module.
 * Manages the Socket.IO connection lifecycle, presence, conversations,
 * active chat popover state, and unread counts.
 */
import {
  createContext, useContext, useEffect, useRef, useState, useCallback,
  type ReactNode,
} from 'react'
import {
  getChatSocket, disconnectChatSocket, CHAT_API,
  type ChatMessage, type Conversation, type PresenceStatus, type ConversationMember,
} from './chat'
import { useAuth } from './AuthContext'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmployeeInfo {
  id: string
  first_name: string
  last_name: string
  email?: string
  avatar_url?: string | null
  department?: string
  role?: string
  status?: string
}

interface ChatContextValue {
  // Conversations
  conversations: Conversation[]
  reloadConversations: () => void

  // Messages per conversation
  messages: Record<string, ChatMessage[]>
  loadMessages: (conversationId: string, before?: string) => Promise<void>

  // Active popover DM
  popoverConvId: string | null
  openPopover: (userId: string) => Promise<void>
  closePopover: () => void

  // Full-page selected conversation
  selectedConvId: string | null
  setSelectedConvId: (id: string | null) => void

  // Presence
  presence: Record<string, PresenceStatus>

  // Employees directory
  employees: EmployeeInfo[]

  // Unread
  totalUnread: number

  // Send + Edit
  sendMessage: (conversationId: string, body: string) => void
  editMessage: (messageId: string, body: string) => void

  // Create conversation
  createConversation: (members: string[], name?: string) => Promise<string>

  // Typing
  typingUsers: Record<string, string[]>

  // Mark read
  markRead: (conversationId: string, messageId: string) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const socketRef = useRef<ReturnType<typeof getChatSocket> | null>(null)

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({})
  const [presence, setPresence] = useState<Record<string, PresenceStatus>>({})
  const [employees, setEmployees] = useState<EmployeeInfo[]>([])
  const [popoverConvId, setPopoverConvId] = useState<string | null>(null)
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({})

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)

  // ── Load employees directory ─────────────────────────────────────────────────
  const loadEmployees = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetch(`${CHAT_API}/employees?userId=${user.id}`)
      if (res.ok) setEmployees(await res.json())
    } catch {}
  }, [user])

  // ── Load conversations ───────────────────────────────────────────────────────
  const reloadConversations = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetch(`${CHAT_API}/conversations?userId=${user.id}`)
      if (res.ok) setConversations(await res.json())
    } catch {}
  }, [user])

  // ── Load presence ────────────────────────────────────────────────────────────
  const loadPresence = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetch(`${CHAT_API}/presence`)
      if (res.ok) {
        const data: { userId: string; status: PresenceStatus }[] = await res.json()
        const map: Record<string, PresenceStatus> = {}
        data.forEach(p => { map[p.userId] = p.status })
        setPresence(map)
      }
    } catch {}
  }, [user])

  // ── Load messages for a conversation ────────────────────────────────────────
  const loadMessages = useCallback(async (conversationId: string, before?: string) => {
    if (!user) return
    const url = `${CHAT_API}/conversations/${conversationId}/messages?userId=${user.id}&limit=50${before ? `&before=${before}` : ''}`
    try {
      const res = await fetch(url)
      if (!res.ok) return
      const data: ChatMessage[] = await res.json()
      setMessages(prev => {
        if (before) {
          // Prepend older messages
          const existing = prev[conversationId] || []
          return { ...prev, [conversationId]: [...data, ...existing] }
        }
        return { ...prev, [conversationId]: data }
      })
    } catch {}
  }, [user])

  // ── Send message ─────────────────────────────────────────────────────────────
  const sendMessage = useCallback((conversationId: string, body: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('message:send', { conversationId, body })
  }, [])

  // ── Edit message ─────────────────────────────────────────────────────────────
  const editMessage = useCallback((messageId: string, body: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('message:edit', { messageId, body })
  }, [])

  // ── Create conversation ──────────────────────────────────────────────────────
  const createConversation = useCallback(async (members: string[], name?: string): Promise<string> => {
    if (!user) throw new Error('Not authenticated')
    const res = await fetch(`${CHAT_API}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, members, name }),
    })
    if (!res.ok) throw new Error('Failed to create conversation')
    const data = await res.json()
    await reloadConversations()
    return data.id
  }, [user, reloadConversations])

  // ── Open DM popover ──────────────────────────────────────────────────────────
  const openPopover = useCallback(async (targetUserId: string) => {
    if (!user) return
    const convId = await createConversation([targetUserId])
    setPopoverConvId(convId)
    await loadMessages(convId)
  }, [user, createConversation, loadMessages])

  const closePopover = useCallback(() => setPopoverConvId(null), [])

  // ── Mark read ─────────────────────────────────────────────────────────────────
  const markRead = useCallback(async (conversationId: string, messageId: string) => {
    if (!user) return
    await fetch(`${CHAT_API}/conversations/${conversationId}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, messageId }),
    })
    setConversations(prev =>
      prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c)
    )
  }, [user])

  // ── Socket setup ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return

    const socket = getChatSocket(user.id)
    socketRef.current = socket

    socket.on('message:new', (msg: ChatMessage) => {
      setMessages(prev => {
        const existing = prev[msg.conversation_id] || []
        // Avoid duplicates
        if (existing.some(m => m.id === msg.id)) return prev
        return { ...prev, [msg.conversation_id]: [...existing, msg] }
      })
      // Bump unread if not active conversation
      setConversations(prev =>
        prev.map(c => {
          if (c.id !== msg.conversation_id) return c
          const isActive = c.id === selectedConvId || c.id === popoverConvId
          return {
            ...c,
            last_message: msg.body,
            last_message_at: msg.created_at,
            last_sender_id: msg.sender_id,
            unread_count: isActive ? c.unread_count : (c.unread_count || 0) + 1,
          }
        })
      )
    })

    socket.on('message:edited', (msg: ChatMessage) => {
      setMessages(prev => {
        const existing = prev[msg.conversation_id] || []
        return {
          ...prev,
          [msg.conversation_id]: existing.map(m => m.id === msg.id ? msg : m),
        }
      })
    })

    socket.on('presence:update', ({ userId, status }: { userId: string; status: PresenceStatus }) => {
      setPresence(prev => ({ ...prev, [userId]: status }))
    })

    socket.on('typing:start', ({ userId: tid, conversationId }: { userId: string; conversationId: string }) => {
      setTypingUsers(prev => ({
        ...prev,
        [conversationId]: [...new Set([...(prev[conversationId] || []), tid])],
      }))
    })

    socket.on('typing:stop', ({ userId: tid, conversationId }: { userId: string; conversationId: string }) => {
      setTypingUsers(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).filter(id => id !== tid),
      }))
    })

    // Initial data load
    loadEmployees()
    reloadConversations()
    loadPresence()

    return () => {
      socket.off('message:new')
      socket.off('message:edited')
      socket.off('presence:update')
      socket.off('typing:start')
      socket.off('typing:stop')
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Disconnect on logout
  useEffect(() => {
    if (!user) disconnectChatSocket()
  }, [user])

  const value: ChatContextValue = {
    conversations, reloadConversations,
    messages, loadMessages,
    popoverConvId, openPopover, closePopover,
    selectedConvId, setSelectedConvId,
    presence,
    employees,
    totalUnread,
    sendMessage, editMessage,
    createConversation,
    typingUsers,
    markRead,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be inside <ChatProvider>')
  return ctx
}
