/**
 * NewConversationDialog — searchable employee directory for starting DMs or groups.
 */
import { useState, useMemo } from 'react'
import { X, Search, Users, MessageSquare } from 'lucide-react'
import { useChat } from '../../lib/ChatContext'
import { useAuth } from '../../lib/AuthContext'

type PresenceStatus = 'online' | 'on_leave' | 'offline'

function presenceColor(s: PresenceStatus) {
  return s === 'online' ? '#22c55e' : s === 'on_leave' ? '#f59e0b' : '#9ca3af'
}

function Avatar({ emp, size = 36 }: { emp: any; size?: number }) {
  const initials = `${emp?.first_name?.[0] || ''}${emp?.last_name?.[0] || ''}`.toUpperCase()
  const colors = ['#7c3aed','#2563eb','#0891b2','#059669','#d97706','#dc2626','#db2777']
  const idx = (emp?.first_name?.charCodeAt(0) || 0) % colors.length
  if (emp?.avatar_url) {
    return <img src={emp.avatar_url} alt={initials} style={{ width: size, height: size }} className="rounded-full object-cover flex-shrink-0" />
  }
  return (
    <div style={{ width: size, height: size, background: colors[idx], fontSize: size * 0.35 }} className="rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
      {initials}
    </div>
  )
}

export function NewConversationDialog({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const { employees, presence, createConversation, openPopover } = useChat()

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [groupName, setGroupName] = useState('')
  const [loading, setLoading] = useState(false)

  const others = employees.filter(e => e.id !== user?.id)

  const filtered = useMemo(() =>
    others.filter(e =>
      `${e.first_name} ${e.last_name} ${e.email || ''}`.toLowerCase().includes(search.toLowerCase())
    ),
    [others, search]
  )

  const isGroup = selected.length > 1

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleStart = async () => {
    if (selected.length === 0) return
    setLoading(true)
    try {
      if (selected.length === 1) {
        // Open DM popover
        onClose()
        await openPopover(selected[0])
      } else {
        // Create group
        const name = groupName.trim() || selected.map(id => {
          const e = employees.find(e => e.id === id)
          return e?.first_name || ''
        }).join(', ')
        await createConversation(selected, name)
        onClose()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
      <div
        className="relative flex flex-col rounded-2xl overflow-hidden"
        style={{
          width: 440,
          maxHeight: '85vh',
          background: '#fff',
          border: '1px solid var(--border)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>New Message</h2>
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Start a DM or create a group</p>
          </div>
          <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" onClick={onClose}>
            <X size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
            <Search size={14} style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              className="flex-1 text-sm bg-transparent outline-none"
              style={{ color: 'var(--text-primary)' }}
              placeholder="Search people…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Selected chips */}
        {selected.length > 0 && (
          <div className="px-4 py-2 flex flex-wrap gap-1.5 border-b" style={{ borderColor: 'var(--border)' }}>
            {selected.map(id => {
              const e = employees.find(e => e.id === id)
              return (
                <span
                  key={id}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: '#111827', color: '#fff' }}
                >
                  {e?.first_name} {e?.last_name}
                  <button onClick={() => toggle(id)} className="opacity-70 hover:opacity-100">
                    <X size={10} />
                  </button>
                </span>
              )
            })}
          </div>
        )}

        {/* Group name input (when multiple selected) */}
        {isGroup && (
          <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <input
              type="text"
              className="w-full px-3 py-1.5 text-sm rounded-lg"
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
              placeholder="Group name (optional)…"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
            />
          </div>
        )}

        {/* Employee list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
              No people found
            </div>
          )}
          {filtered.map(emp => {
            const status = (presence[emp.id] || 'offline') as PresenceStatus
            const isSelected = selected.includes(emp.id)
            return (
              <button
                key={emp.id}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                onClick={() => toggle(emp.id)}
              >
                <div className="relative flex-shrink-0">
                  <Avatar emp={emp} size={36} />
                  <span
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white"
                    style={{ background: presenceColor(status) }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                    {emp.first_name} {emp.last_name}
                  </div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>
                    {emp.department} {emp.role ? `· ${emp.role}` : ''}
                  </div>
                </div>
                {/* Checkbox */}
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    border: isSelected ? '2px solid #111827' : '2px solid var(--border-strong)',
                    background: isSelected ? '#111827' : 'transparent',
                  }}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--sidebar-bg)' }}>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {selected.length === 0 ? 'Select people to message' : isGroup ? `${selected.length} people selected — group` : '1 person selected — DM'}
          </span>
          <button
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: selected.length > 0 ? '#111827' : 'var(--bg-hover)',
              color: selected.length > 0 ? '#fff' : 'var(--text-tertiary)',
            }}
            disabled={selected.length === 0 || loading}
            onClick={handleStart}
          >
            {isGroup ? <Users size={14} /> : <MessageSquare size={14} />}
            {loading ? 'Opening…' : isGroup ? 'Create group' : 'Open DM'}
          </button>
        </div>
      </div>
    </div>
  )
}
