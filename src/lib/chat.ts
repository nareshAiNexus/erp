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
  status?: 'sending' | 'sent' | 'delivered' | 'read'
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
  avatar_url?: string | null
  created_at: string
  last_message: string | null
  last_message_at: string | null
  last_sender_id: string | null
  unread_count: number
  members: ConversationMember[]
}

let socket: Socket | null = null
let currentSocketUserId: string | null = null

export function getChatSocket(userId: string): Socket {
  if (socket && currentSocketUserId === userId && socket.connected) {
    return socket
  }

  if (socket) {
    socket.disconnect()
    socket = null
  }

  currentSocketUserId = userId

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
  currentSocketUserId = null
}

export const CHAT_API = '/api/chat'

/** Register Service Worker for Windows desktop push notifications */
let swRegistration: ServiceWorkerRegistration | null = null

export async function registerChatServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      swRegistration = await navigator.serviceWorker.register('/sw.js')
      return swRegistration
    } catch (e) {
      console.warn('Chat SW registration failed:', e)
    }
  }
  return null
}

/** Request browser notification permission on user action */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Notification API not available')
    return 'denied'
  }

  // If already granted
  if (Notification.permission === 'granted') {
    await registerChatServiceWorker()
    return 'granted'
  }

  // If already denied, browser silently refuses to show prompt
  if (Notification.permission === 'denied') {
    console.warn('Notification permission is already "denied" in browser settings')
    return 'denied'
  }

  try {
    const perm = await new Promise<NotificationPermission>((resolve) => {
      let resolved = false
      try {
        const p = Notification.requestPermission((result) => {
          if (!resolved) {
            resolved = true
            resolve(result)
          }
        })
        if (p && typeof p.then === 'function') {
          p.then((result) => {
            if (!resolved) {
              resolved = true
              resolve(result)
            }
          }).catch(() => {
            if (!resolved) {
              resolved = true
              resolve(Notification.permission || 'denied')
            }
          })
        }
      } catch (err) {
        if (!resolved) {
          resolved = true
          resolve(Notification.permission || 'denied')
        }
      }
    })

    if (perm === 'granted') {
      await registerChatServiceWorker()
    }
    return perm
  } catch (e) {
    console.warn('requestNotificationPermission exception:', e)
    return Notification.permission || 'denied'
  }
}

/** Play audio chime for incoming messages */
export function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const audioCtx = new AudioContextClass()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime) // D5
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1) // A5
    gain.gain.setValueAtTime(0.18, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35)
    osc.start()
    osc.stop(audioCtx.currentTime + 0.35)
  } catch {}
}

let titleAlertTimer: any = null
let originalDocTitle = ''

/** Alert tab title when message arrives in background */
export function flashTabTitle(text: string) {
  if (typeof document === 'undefined') return
  if (!originalDocTitle) originalDocTitle = document.title || 'ERP System'

  clearInterval(titleAlertTimer)
  let count = 0
  titleAlertTimer = setInterval(() => {
    count++
    document.title = count % 2 === 0 ? text : originalDocTitle
    if (count > 10) {
      clearInterval(titleAlertTimer)
      document.title = originalDocTitle
    }
  }, 1000)

  const clearAlert = () => {
    clearInterval(titleAlertTimer)
    document.title = originalDocTitle
    window.removeEventListener('focus', clearAlert)
  }
  window.addEventListener('focus', clearAlert)
}

/** Show native desktop popup notification (Windows bottom-right Action Center toast) */
export async function showDesktopNotification(
  title: string,
  options?: { body?: string; icon?: string; tag?: string; onClick?: () => void }
) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  // Play audio chime
  playNotificationSound()

  // Flash tab title if window unfocused
  if (document.hidden || !document.hasFocus()) {
    flashTabTitle(`🔔 ${title}: ${options?.body || 'New message'}`)
  }

  const notifOptions: NotificationOptions = {
    body: options?.body,
    icon: options?.icon || '/logo.png',
    badge: '/logo.png',
    tag: options?.tag,
    silent: false, // enables Windows notification audio
  }

  // 1. Prefer Service Worker showNotification (Windows Action Center bottom-right toast)
  if ('serviceWorker' in navigator) {
    try {
      const reg = swRegistration || await navigator.serviceWorker.ready
      if (reg && reg.showNotification) {
        await reg.showNotification(title, notifOptions)
        return
      }
    } catch (e) {
      console.warn('SW notification fallback to Notification constructor:', e)
    }
  }

  // 2. Fallback to native window.Notification
  try {
    const notif = new Notification(title, notifOptions)
    if (options?.onClick) {
      notif.onclick = () => {
        window.focus()
        options.onClick?.()
        notif.close()
      }
    }
  } catch (err) {
    console.warn('Failed to show native notification:', err)
  }
}


