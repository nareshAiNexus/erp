import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, User, Phone, Mail, MapPin, Briefcase, Calendar as CalIcon, Settings } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { dbQuery } from '../lib/dbClient'

type Props = {
  isOpen: boolean
  onClose: () => void
}

type ProfileData = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  address: string | null
  dob: string | null
  role: string
  salary: number
  hire_date: string | null
  avatar_url: string | null
}

export function ProfileSidebar({ isOpen, onClose }: Props) {
  const { user, login } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit state
  const [dob, setDob] = useState('')
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    if (isOpen && user) {
      dbQuery(`SELECT * FROM employees WHERE id = $1`, [user.id]).then(res => {
        const p = res[0]
        setProfile(p)
        setDob(p.dob?.split('T')[0] || '')
        setBio(p.bio || '')
        setPhone(p.phone || '')
        setAddress(p.address || '')
        setAvatarUrl(p.avatar_url || '')
      })
    }
  }, [isOpen, user])

  // Don't unmount when closed to allow slide animation
  if (!user || !profile) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      await dbQuery(
        `UPDATE employees SET dob = $1, bio = $2, phone = $3, address = $4, avatar_url = $5 WHERE id = $6`,
        [dob || null, bio || null, phone || null, address || null, avatarUrl || null, user.id]
      )
      setProfile({ ...profile, dob, bio, phone, address, avatar_url: avatarUrl })
      login({ ...user, avatar_url: avatarUrl })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  // Calculate age
  const age = profile.dob ? Math.floor((new Date().getTime() - new Date(profile.dob).getTime()) / 3.15576e+10) : null
  const dobFormatted = profile.dob ? new Date(profile.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

  return createPortal(
    <>
      {/* Invisible backdrop to detect clicks outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[39]"
          onClick={onClose}
        />
      )}
      
      <div 
        className={`fixed inset-y-0 left-60 w-[420px] bg-white shadow-xl z-[40] flex flex-col transform transition-transform duration-500 ease-in-out border-r border-gray-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
      
      {/* Header */}
      <div className="px-6 py-5 flex items-center gap-3 border-b border-gray-200 shrink-0">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} className="text-gray-500" />
        </button>
        <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">Employee / Profile</span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 custom-scrollbar">
        
        {/* Top: Avatar & Name */}
        <div className="flex gap-4 items-center">
          <div className="w-20 h-20 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={32} className="text-gray-400" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{profile.first_name} {profile.last_name}</h2>
            {dobFormatted ? (
              <p className="text-xs text-gray-500">{dobFormatted} {age ? `(${age} y.o)` : ''}</p>
            ) : (
              <p className="text-xs text-gray-400 italic">No DOB set</p>
            )}
            <button onClick={() => setEditing(!editing)} className="mt-2 text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors font-medium border border-gray-200">
              <Settings size={12} />
              {editing ? 'Cancel Editing' : 'Edit Profile'}
            </button>
          </div>
        </div>

        {editing ? (
          <div className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-200">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Profile Picture</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setAvatarUrl(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-indigo-500" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Birth</label>
              <input type="date" value={dob} onChange={e=>setDob(e.target.value)} 
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Bio</label>
              <textarea value={bio} onChange={e=>setBio(e.target.value)} rows={3}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
              <input type="text" value={phone} onChange={e=>setPhone(e.target.value)} 
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Address</label>
              <input type="text" value={address} onChange={e=>setAddress(e.target.value)} 
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            </div>
            <button onClick={handleSave} disabled={saving} className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
              {saving ? 'Saving...' : 'Save Details'}
            </button>
          </div>
        ) : (
          <>
            {/* Bio / Specializations */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Briefcase size={16} className="text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Bio</h3>
              </div>
              <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100">
                {profile.bio || 'No bio added yet.'}
              </div>
            </div>

            {/* General */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-4 h-4 rounded-full border-2 border-gray-400 flex items-center justify-center text-[8px] font-bold text-gray-500">i</span>
                <h3 className="text-sm font-semibold text-gray-900">General</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500 font-medium">Role</span>
                  <span className="text-sm font-semibold text-gray-900 capitalize">{profile.role?.replace('_', ' ') || 'Unknown'}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500 font-medium">Salary</span>
                  <span className="text-sm font-semibold text-green-600">${Number(profile.salary).toLocaleString()}/yr</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 font-medium">Start of work</span>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                    <CalIcon size={14} className="text-gray-400" />
                    {profile.hire_date ? new Date(profile.hire_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown'}
                  </div>
                </div>
              </div>
            </div>

            {/* Contacts */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-4 h-4 rounded flex items-center justify-center border-2 border-gray-400">
                  <User size={10} className="text-gray-500" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Contacts</h3>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-start pb-3 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Phone</span>
                  <span className="text-gray-900 font-medium">{profile.phone || '—'}</span>
                </div>
                <div className="flex justify-between items-start pb-3 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">E-mail</span>
                  <span className="text-gray-900 font-medium">{profile.email}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-500 font-medium shrink-0 mr-4">Address</span>
                  <span className="text-gray-900 font-medium text-right leading-relaxed">{profile.address || '—'}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
    </>,
    document.body
  )
}
