/**
 * GroupEditModal.tsx — Popup dialog to edit group name, group icon, and add/remove members.
 * Opened when clicking the group icon or name in the top bar.
 */
import { useState, useMemo } from 'react'
import { X, Users, Trash2, UserPlus, Check, Image, Sparkles } from 'lucide-react'
import { useChat } from '../../lib/ChatContext'
import { useAuth } from '../../lib/AuthContext'
import type { Conversation, ConversationMember } from '../../lib/chat'

interface GroupEditModalProps {
  conversation: Conversation
  onClose: () => void
}

const PRESET_ICONS = ['💼', '🚀', '⚡', '🎯', '💡', '📢', '🔥', '🛡️', '📦', '🌟']

export function GroupEditModal({ conversation, onClose }: GroupEditModalProps) {
  const { user } = useAuth()
  const { updateConversation, addGroupMembers, removeGroupMember, employees, presence } = useChat()

  const [name, setName] = useState(conversation.name || '')
  const [avatarUrl, setAvatarUrl] = useState(conversation.avatar_url || '')
  const [selectedPreset, setSelectedPreset] = useState(conversation.avatar_url || '')
  const [searchEmployee, setSearchEmployee] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'members'>('general')

  const currentMemberIds = useMemo(() => {
    return new Set((conversation.members || []).map(m => m.id))
  }, [conversation.members])

  // Employees available to add
  const availableEmployees = useMemo(() => {
    return employees.filter(e => {
      if (currentMemberIds.has(e.id)) return false
      if (!searchEmployee) return true
      const fullName = `${e.first_name} ${e.last_name}`.toLowerCase()
      return fullName.includes(searchEmployee.toLowerCase()) || e.email?.toLowerCase().includes(searchEmployee.toLowerCase())
    })
  }, [employees, currentMemberIds, searchEmployee])

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await updateConversation(conversation.id, {
        name: name.trim() || 'Group',
        avatar_url: avatarUrl.trim() || selectedPreset || null,
      })
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddMember = async (employeeId: string) => {
    await addGroupMembers(conversation.id, [employeeId])
  }

  const handleRemoveMember = async (memberId: string) => {
    if (confirm('Remove this member from the group?')) {
      await removeGroupMember(conversation.id, memberId)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm"
              style={{ background: '#ede9fe', color: '#7c3aed' }}
            >
              {avatarUrl || selectedPreset ? (
                <span>{avatarUrl || selectedPreset}</span>
              ) : (
                <span>{(name || 'G')[0]?.toUpperCase()}</span>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                Edit Group Details
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                {conversation.members?.length || 0} members
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b text-xs font-medium px-5 flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => setActiveTab('general')}
            className={`py-2.5 px-3 border-b-2 -mb-px transition-colors ${
              activeTab === 'general'
                ? 'border-gray-900 text-gray-900 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            General Settings
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`py-2.5 px-3 border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
              activeTab === 'members'
                ? 'border-gray-900 text-gray-900 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Members ({conversation.members?.length || 0})
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'general' ? (
            <form onSubmit={handleSaveGeneral} className="space-y-4">
              {/* Group Name */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Operations, Project Alpha"
                  className="w-full px-3 py-2 text-sm rounded-xl border outline-none focus:ring-2 focus:ring-gray-900/10"
                  style={{ borderColor: 'var(--border-strong)', background: 'var(--bg)' }}
                />
              </div>

              {/* Group Icon presets */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Choose Group Emoji / Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => {
                        setSelectedPreset(icon)
                        setAvatarUrl(icon)
                      }}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-base transition-transform active:scale-95 border ${
                        (avatarUrl === icon || selectedPreset === icon)
                          ? 'border-gray-900 bg-gray-100 scale-105'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Image URL */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Or Custom Icon / Image URL
                </label>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={e => {
                    setAvatarUrl(e.target.value)
                    setSelectedPreset('')
                  }}
                  placeholder="https://... or emoji"
                  className="w-full px-3 py-2 text-sm rounded-xl border outline-none focus:ring-2 focus:ring-gray-900/10"
                  style={{ borderColor: 'var(--border-strong)', background: 'var(--bg)' }}
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-medium rounded-xl border hover:bg-gray-50 transition-colors"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-medium rounded-xl bg-gray-900 text-white hover:bg-black transition-colors flex items-center gap-1.5"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Add Member section */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Add People to Group
                </label>
                <input
                  type="text"
                  value={searchEmployee}
                  onChange={e => setSearchEmployee(e.target.value)}
                  placeholder="Search employees to add..."
                  className="w-full px-3 py-2 text-xs rounded-xl border outline-none mb-2"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                />

                {availableEmployees.length > 0 && (
                  <div
                    className="border rounded-xl max-h-36 overflow-y-auto divide-y"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {availableEmployees.slice(0, 6).map(emp => (
                      <div
                        key={emp.id}
                        className="flex items-center justify-between px-3 py-2 text-xs hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center font-bold text-[10px] text-gray-700">
                            {emp.first_name[0]}{emp.last_name[0]}
                          </div>
                          <div>
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                              {emp.first_name} {emp.last_name}
                            </span>
                            <span className="text-[10px] ml-1.5" style={{ color: 'var(--text-tertiary)' }}>
                              {emp.department || emp.role}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddMember(emp.id)}
                          className="px-2 py-1 rounded-md bg-gray-900 text-white text-[11px] hover:bg-black transition-colors flex items-center gap-1"
                        >
                          <UserPlus size={11} /> Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Current Members list */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Current Members ({conversation.members?.length || 0})
                </label>
                <div
                  className="border rounded-xl divide-y overflow-hidden"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {(conversation.members || []).map(member => {
                    const isOnline = presence[member.id] === 'online'
                    const isCurrentUser = member.id === user?.id

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between px-3 py-2.5 text-xs hover:bg-gray-50/50"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="relative">
                            {member.avatar_url ? (
                              <img
                                src={member.avatar_url}
                                alt="avatar"
                                className="w-7 h-7 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 font-bold flex items-center justify-center text-[10px]">
                                {member.first_name[0]}{member.last_name[0]}
                              </div>
                            )}
                            <span
                              className="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white"
                              style={{ background: isOnline ? '#22c55e' : '#9ca3af' }}
                            />
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                              {member.first_name} {member.last_name}
                              {isCurrentUser && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-600">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                              {member.role || member.department || (isOnline ? 'Online' : 'Offline')}
                            </div>
                          </div>
                        </div>

                        {!isCurrentUser && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            title="Remove from group"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
