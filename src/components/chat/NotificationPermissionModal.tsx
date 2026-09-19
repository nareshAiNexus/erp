/**
 * NotificationPermissionModal.tsx
 * Explains how to unblock notifications in Brave / Chrome when permission is 'denied'
 * or when the browser suppresses permission prompts.
 */
import { Bell, BellOff, X, ExternalLink, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onCheckAgain: () => void
}

export function NotificationPermissionModal({ isOpen, onClose, onCheckAgain }: Props) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const isBrave = typeof navigator !== 'undefined' && (Boolean((navigator as any).brave) || /Brave/.test(navigator.userAgent))
  const isSecure = typeof window !== 'undefined' && window.isSecureContext

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6 relative"
        style={{
          background: 'var(--bg, #ffffff)',
          border: '1px solid var(--border, #e5e7eb)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
            <BellOff size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Browser Notifications Blocked
            </h3>
            <p className="text-xs text-gray-500">
              {isBrave ? 'Brave Browser' : 'Chrome / Edge'} has blocked notification prompts for this site.
            </p>
          </div>
        </div>

        {!isSecure && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
            <strong>Insecure Origin Warning:</strong> You are accessing this site via an insecure HTTP IP address. Modern browsers only allow Web Notifications on <code>localhost</code> or via HTTPS. Please open <code>http://localhost:3000</code> instead.
          </div>
        )}

        <div className="space-y-3 text-xs text-gray-600 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <p className="font-semibold text-gray-800">
            Because notifications are marked as "Blocked", the browser will not show the popup automatically. You can enable them in 2 clicks:
          </p>

          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
              1
            </span>
            <p>
              Click the <strong>Site Settings / Tune icon</strong> (🔒 or ⚙️ or 🛡️) on the <strong>left side of the address bar</strong> (next to <code>{typeof window !== 'undefined' ? window.location.host : 'localhost:3000'}</code>).
            </p>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
              2
            </span>
            <p>
              Find <strong>Notifications</strong> and switch it from <strong className="text-red-600">Block</strong> to <strong className="text-green-600">Allow</strong>.
            </p>
          </div>

          {isBrave && (
            <div className="flex items-start gap-2.5 pt-1 border-t border-gray-200">
              <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                🦁
              </span>
              <p>
                In <strong>Brave</strong>: Also check the Lion Shield icon or address bar bell icon to ensure Brave Shields isn't blocking notifications.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              onCheckAgain()
              if (Notification.permission === 'granted') {
                onClose()
              }
            }}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gray-900 text-white font-medium text-xs hover:bg-black transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={13} />
            I Changed It, Check Again
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-gray-300 text-gray-700 font-medium text-xs hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
