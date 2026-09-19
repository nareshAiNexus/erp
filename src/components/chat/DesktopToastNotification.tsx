/**
 * DesktopToastNotification.tsx — Windows-style bottom-right push notification toast.
 * Replicates the authentic Windows/Brave desktop notification toast shown in the bottom right.
 */
import { useState, useEffect } from 'react'
import { X, MessageSquare, Bell } from 'lucide-react'
import { useChat } from '../../lib/ChatContext'
import { useAuth } from '../../lib/AuthContext'
import { getChatSocket } from '../../lib/chat'

interface ToastItem {
  id: string
  conversationId: string
  senderName: string
  avatarUrl?: string | null
  body: string
  time: string
}

export function DesktopToastNotification() {
  const { user } = useAuth()
  const { setSelectedConvId, openPopoverConv, employees } = useChat()
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    if (!user) return

    const socket = getChatSocket(user.id)

    const handleNewMessage = (msg: any) => {
      // Do not show notification for own messages
      if (msg.sender_id === user.id) return

      const emp = employees.find(e => e.id === msg.sender_id)
      const senderName = msg.first_name
        ? `${msg.first_name} ${msg.last_name || ''}`.trim()
        : emp
        ? `${emp.first_name} ${emp.last_name}`
        : 'New message'

      const newToast: ToastItem = {
        id: msg.id || String(Date.now()),
        conversationId: msg.conversation_id,
        senderName,
        avatarUrl: msg.avatar_url || emp?.avatar_url,
        body: msg.body,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setToasts(prev => [...prev.slice(-2), newToast])

      // Play subtle notification tone
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const osc = audioCtx.createOscillator()
        const gain = audioCtx.createGain()
        osc.connect(gain)
        gain.connect(audioCtx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime) // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1) // A5
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3)
        osc.start()
        osc.stop(audioCtx.currentTime + 0.3)
      } catch {}

      // Auto dismiss after 6 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id))
      }, 6000)
    }

    socket.on('message:new', handleNewMessage)

    return () => {
      socket.off('message:new', handleNewMessage)
    }
  }, [user?.id, employees])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2.5 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="pointer-events-auto w-84 max-w-[90vw] rounded-xl overflow-hidden shadow-2xl transition-all duration-300 transform translate-y-0"
          style={{
            background: '#18181b', // Windows 11 Action Center dark acrylic
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 12px 36px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 pt-3 pb-1 text-white/80">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-violet-600 flex items-center justify-center text-white">
                <MessageSquare size={12} />
              </div>
              <span className="text-[11px] font-medium text-white/70 tracking-wide">
                ERP Messages
              </span>
              <span className="text-[10px] text-white/40">· {toast.time}</span>
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={13} />
            </button>
          </div>

          {/* Content */}
          <div
            className="px-3.5 pb-3.5 pt-1.5 cursor-pointer hover:bg-white/[0.03] transition-colors"
            onClick={() => {
              setSelectedConvId(toast.conversationId)
              openPopoverConv(toast.conversationId)
              setToasts(prev => prev.filter(t => t.id !== toast.id))
            }}
          >
            <div className="flex items-start gap-2.5">
              {toast.avatarUrl ? (
                <img
                  src={toast.avatarUrl}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5 border border-white/10"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-violet-500/20 text-violet-300 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5 border border-violet-500/30">
                  {toast.senderName[0]?.toUpperCase() || 'M'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {toast.senderName}
                </div>
                <div className="text-xs text-zinc-300 mt-0.5 line-clamp-2 leading-relaxed">
                  {toast.body}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
