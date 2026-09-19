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
  requestNotificationPermission, showDesktopNotification, registerChatServiceWorker,
  type ChatMessage, type Conversation, type PresenceStatus, type ConversationMember,
} from './chat'
import { useAuth } from './AuthContext'
import { NotificationPermissionModal } from '../components/chat/NotificationPermissionModal'

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
  openPopoverConv: (convId: string) => Promise<void>
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

  // Group management
  updateConversation: (id: string, updates: { name?: string; avatar_url?: string | null }) => Promise<void>
  addGroupMembers: (id: string, memberIds: string[]) => Promise<void>
  removeGroupMember: (id: string, memberId: string) => Promise<void>

  // Typing
  typingUsers: Record<string, string[]>

  // Mark read
  markRead: (conversationId: string, messageId: string) => void

  // Push Notifications
  notificationPermission: NotificationPermission
  enableNotifications: () => Promise<void>
  sendTestNotification: () => void
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
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  })

  // Strictly numeric total unread
  const totalUnread = conversations.reduce(
    (sum, c) => sum + (Number(c.unread_count) || 0),
    0
  )

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
      if (res.ok) {
        const data: Conversation[] = await res.json()
        setConversations(
          data.map(c => ({
            ...c,
            unread_count: Number(c.unread_count) || 0,
          }))
        )
      }
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

  // ── Update conversation (name/avatar) ─────────────────────────────────────────
  const updateConversation = useCallback(async (id: string, updates: { name?: string; avatar_url?: string | null }) => {
    if (!user) return
    await fetch(`${CHAT_API}/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    await reloadConversations()
  }, [user, reloadConversations])

  // ── Add group members ────────────────────────────────────────────────────────
  const addGroupMembers = useCallback(async (id: string, memberIds: string[]) => {
    if (!user) return
    await fetch(`${CHAT_API}/conversations/${id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, memberIds }),
    })
    await reloadConversations()
  }, [user, reloadConversations])

  // ── Remove group member ──────────────────────────────────────────────────────
  const removeGroupMember = useCallback(async (id: string, memberId: string) => {
    if (!user) return
    await fetch(`${CHAT_API}/conversations/${id}/members/${memberId}`, {
      method: 'DELETE',
    })
    await reloadConversations()
  }, [user, reloadConversations])

  // ── Open DM popover ──────────────────────────────────────────────────────────
  const openPopover = useCallback(async (targetUserId: string) => {
    if (!user) return
    const convId = await createConversation([targetUserId])
    setPopoverConvId(convId)
    await loadMessages(convId)
  }, [user, createConversation, loadMessages])

  const openPopoverConv = useCallback(async (convId: string) => {
    setPopoverConvId(convId)
    await loadMessages(convId)
  }, [loadMessages])

  const closePopover = useCallback(() => setPopoverConvId(null), [])

  // ── Mark read ─────────────────────────────────────────────────────────────────
  const markRead = useCallback(async (conversationId: string, messageId: string) => {
    if (!user || !messageId) return

    // Never mark our own sent messages as read
    const convMsgs = messages[conversationId] || []
    const targetMsg = convMsgs.find(m => m.id === messageId)
    if (targetMsg && targetMsg.sender_id === user.id) return

    // Emit socket event for real-time tick update
    socketRef.current?.emit('message:read', { conversationId, messageId })

    await fetch(`${CHAT_API}/conversations/${conversationId}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, messageId }),
    })
    setConversations(prev =>
      prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c)
    )
  }, [user, messages])

  // ── Push Notifications ────────────────────────────────────────────────────────
  const [showBlockedModal, setShowBlockedModal] = useState(false)

  useEffect(() => {
    registerChatServiceWorker()
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  const checkNotificationPermissionAgain = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const current = Notification.permission
      setNotificationPermission(current)
      if (current === 'granted') {
        await registerChatServiceWorker()
        await showDesktopNotification('ERP Notifications Active', {
          body: 'Windows desktop alerts are now active for ERP messaging.',
        })
      }
    }
  }, [])

  const enableNotifications = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Your browser does not support the Web Notification API.')
      return
    }

    // If permission is already 'denied', browser WILL NOT prompt the user
    if (Notification.permission === 'denied') {
      setShowBlockedModal(true)
      return
    }

    const perm = await requestNotificationPermission()
    setNotificationPermission(perm)

    if (perm === 'granted') {
      await showDesktopNotification('ERP Messages Active', {
        body: 'Windows push notifications enabled! You will now receive desktop alerts for incoming messages.',
      })
    } else if (perm === 'denied') {
      setShowBlockedModal(true)
    }
  }, [])

  const sendTestNotification = useCallback(async () => {
    if (notificationPermission !== 'granted') {
      await enableNotifications()
      return
    }
    await showDesktopNotification('ERP Chat Notification', {
      body: '🔔 Push notifications are working! Windows desktop alerts are active.',
    })
  }, [notificationPermission, enableNotifications])

  // ── Socket setup ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return

    const socket = getChatSocket(user.id)
    socketRef.current = socket

    socket.on('message:new', (msg: ChatMessage) => {
      setMessages(prev => {
        const existing = prev[msg.conversation_id] || []
        if (existing.some(m => m.id === msg.id)) return prev
        return { ...prev, [msg.conversation_id]: [...existing, msg] }
      })

      const isMine = msg.sender_id === user.id
      const isActive = msg.conversation_id === selectedConvId || msg.conversation_id === popoverConvId

      setConversations(prev =>
        prev.map(c => {
          if (c.id !== msg.conversation_id) return c
          return {
            ...c,
            last_message: msg.body,
            last_message_at: msg.created_at,
            last_sender_id: msg.sender_id,
            unread_count: (isMine || isActive)
              ? Number(c.unread_count) || 0
              : (Number(c.unread_count) || 0) + 1,
          }
        })
      )

      // High priority Windows / OS desktop popup notification
      if (!isMine) {
        const senderName = msg.first_name ? `${msg.first_name} ${msg.last_name || ''}`.trim() : 'New message'
        showDesktopNotification(senderName, {
          body: msg.body,
          icon: msg.avatar_url || '/logo.png',
          tag: msg.conversation_id,
          onClick: () => {
            setSelectedConvId(msg.conversation_id)
          },
        })
      }
    })

    socket.on('message:read', ({ conversationId, userId: readerId, messageId }: { conversationId: string; userId: string; messageId: string }) => {
      // Do not mark our own sent messages as read when WE are the one reading the chat
      if (readerId === user.id) return

      // Mark messages sent by current user up to messageId as 'read'
      setMessages(prev => {
        const list = prev[conversationId]
        if (!list) return prev
        const readMsg = list.find(m => m.id === messageId)
        const readTime = readMsg ? new Date(readMsg.created_at).getTime() : Date.now()

        return {
          ...prev,
          [conversationId]: list.map(m => {
            if (m.sender_id === user.id) {
              const msgTime = new Date(m.created_at).getTime()
              if (msgTime <= readTime) {
                return { ...m, status: 'read' }
              }
            }
            return m
          }),
        }
      })
    })

    socket.on('conversation:updated', () => {
      reloadConversations()
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

    // Periodic presence refresh
    const presenceTimer = setInterval(loadPresence, 15000)

    return () => {
      clearInterval(presenceTimer)
      socket.off('message:new')
      socket.off('message:read')
      socket.off('conversation:updated')
      socket.off('message:edited')
      socket.off('presence:update')
      socket.off('typing:start')
      socket.off('typing:stop')
    }
  }, [user?.id, selectedConvId, popoverConvId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Disconnect on logout
  useEffect(() => {
    if (!user) disconnectChatSocket()
  }, [user])

  const value: ChatContextValue = {
    conversations, reloadConversations,
    messages, loadMessages,
    popoverConvId, openPopover, openPopoverConv, closePopover,
    selectedConvId, setSelectedConvId,
    presence,
    employees,
    totalUnread,
    sendMessage, editMessage,
    createConversation,
    updateConversation,
    addGroupMembers,
    removeGroupMember,
    typingUsers,
    markRead,
    notificationPermission,
    enableNotifications,
    sendTestNotification,
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
      <NotificationPermissionModal
        isOpen={showBlockedModal}
        onClose={() => setShowBlockedModal(false)}
        onCheckAgain={checkNotificationPermissionAgain}
      />
    </ChatContext.Provider>
  )
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be inside <ChatProvider>')
  return ctx
}

