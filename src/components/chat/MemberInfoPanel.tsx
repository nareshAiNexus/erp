/**
 * MemberInfoPanel — right column in the full MessagesView.
 * Shows profile card for DM partner or group member list.
 */
import { useChat } from '../../lib/ChatContext'
import { useAuth } from '../../lib/AuthContext'

type PresenceStatus = 'online' | 'on_leave' | 'offline'

function presenceColor(s: PresenceStatus) {
  return s === 'online' ? '#22c55e' : s === 'on_leave' ? '#f59e0b' : '#9ca3af'
}
function presenceLabel(s: PresenceStatus) {
  return s === 'online' ? 'Online' : s === 'on_leave' ? 'On leave' : 'Offline'
}

function Avatar({ emp, size = 56 }: { emp: any; size?: number }) {
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

export function MemberInfoPanel() {
  const { user } = useAuth()
  const { selectedConvId, conversations, employees, presence } = useChat()

  const conv = conversations.find(c => c.id === selectedConvId)
  if (!conv) return null

  const isDm = conv.type === 'dm'
  const otherMember = isDm ? conv.members?.find(m => m.id !== user?.id) : null
  const otherEmp = employees.find(e => e.id === otherMember?.id)
  const otherStatus = (presence[otherMember?.id || ''] || 'offline') as PresenceStatus

  return (
    <div
      className="flex flex-col border-l"
      style={{ width: 220, borderColor: 'var(--border)', background: 'var(--bg)', flexShrink: 0 }}
    >
      {isDm && otherMember ? (
        // DM partner profile
        <div className="flex flex-col items-center px-4 pt-8 pb-6 gap-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="relative">
            <Avatar emp={otherEmp || otherMember} size={64} />
            <span
              className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white"
              style={{ background: presenceColor(otherStatus) }}
            />
          </div>
          <div className="text-center">
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {otherMember.first_name} {otherMember.last_name}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {otherEmp?.role || otherMember.role || 'Employee'}
            </p>
          </div>
        </div>
      ) : (
        // Group header
        <div className="flex flex-col items-center px-4 pt-8 pb-6 gap-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl" style={{ background: '#ede9fe', color: '#7c3aed' }}>
            {(conv.name || '#')[0].toUpperCase()}
          </div>
          <div className="text-center">
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {conv.name || 'Group'}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {conv.members?.length} members
            </p>
          </div>
        </div>
      )}

      {/* Info rows */}
      <div className="px-4 py-4 flex flex-col gap-3">
        {isDm && otherMember && (
          <>
            <InfoRow label="Status" value={presenceLabel(otherStatus)} valueStyle={{ color: presenceColor(otherStatus) }} />
            {(otherEmp?.department || otherMember.department) && (
              <InfoRow label="Department" value={otherEmp?.department || otherMember.department || ''} />
            )}
            {(otherEmp?.role || otherMember.role) && (
              <InfoRow label="Role" value={otherEmp?.role || otherMember.role || ''} />
            )}
          </>
        )}
        {!isDm && (
          <>
            <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-tertiary)' }}>Members</div>
            {conv.members?.map(m => {
              const emp = employees.find(e => e.id === m.id)
              const st = (presence[m.id] || 'offline') as PresenceStatus
              return (
                <div key={m.id} className="flex items-center gap-2">
                  <div className="relative flex-shrink-0">
                    <Avatar emp={emp || m} size={28} />
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 border-white" style={{ background: presenceColor(st) }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {m.first_name} {m.last_name}
                      {m.id === user?.id && <span style={{ color: 'var(--text-tertiary)' }}> (you)</span>}
                    </p>
                    <p className="text-[10px]" style={{ color: presenceColor(st) }}>{presenceLabel(st)}</p>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value, valueStyle }: { label: string; value: string; valueStyle?: React.CSSProperties }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <span className="text-[11px] font-medium text-right" style={{ color: 'var(--text-primary)', ...valueStyle }}>{value}</span>
    </div>
  )
}
