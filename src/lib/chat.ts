/**
 * chat.ts — Socket.IO client singleton + typed event helpers.
 * Import `getChatSocket()` wherever you need the socket connection.
 */
import { io, type Socket } from 'socket.io-client'

export type PresenceStatus = 'online' | 'on_leave' | 'offline'

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  created_at: string
  edited_at: string | null
  first_name?: string
  last_name?: string
  avatar_url?: string | null
}

export interface ConversationMember {
  id: string
  first_name: string
  last_name: string
  avatar_url?: string | null
  department?: string
  role?: string
}

export interface Conversation {
  id: string
  type: 'dm' | 'group'
  name: string | null
  created_at: string
  last_message: string | null
  last_message_at: string | null
  last_sender_id: string | null
  unread_count: number
  members: ConversationMember[]
}

let socket: Socket | null = null

export function getChatSocket(userId: string): Socket {
  if (socket && socket.connected) return socket

  // Determine the chat server URL — in dev Vite proxies /socket.io/ → :3001
  const url = typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:3001'

  socket = io(url, {
    query: { userId },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity,
  })

  return socket
}

export function disconnectChatSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export const CHAT_API = '/api/chat'
