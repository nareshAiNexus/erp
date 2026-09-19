import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { dbQuery } from '../../lib/dbClient'
import { useAuth } from '../../lib/AuthContext'
import { ArrowRight, Search, Check } from 'lucide-react'

export function NewAuditModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { user } = useAuth()
  
  const [step, setStep] = useState<1|2|3>(1) // 1: Search, 2: Form, 3: Diff Review
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form State
  const [form, setForm] = useState<any>({})

  const { data: searchResults = [] } = useQuery({
    queryKey: ['asset-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return []
      const res = await dbQuery(`
        SELECT a.*, e.full_name as owner_name, d.name as dept_name 
        FROM assets a 
        LEFT JOIN inventory_employees e ON a.allotted_employee_id = e.id 
        LEFT JOIN inventory_departments d ON a.department_id = d.id 
        WHERE a.asset_tag ILIKE $1 OR a.model_name ILIKE $1 
        LIMIT 5
      `, [`%${searchTerm}%`])
      return res
    },
    enabled: searchTerm.length >= 2
  })

  const handleSelectAsset = (asset: any) => {
    setSelectedAsset(asset)
    setForm({
      condition_at_audit: asset.working_condition || 'working',
      allotted_employee_at_audit: asset.owner_name || '',
      department_at_audit: asset.dept_name || '',
      observations: '',
      // hardware info snapshot
      ram_at_audit: asset.ram || '',
      storage_raw_at_audit: asset.storage_raw || '',
      processor_at_audit: asset.processor || '',
      os_at_audit: asset.operating_system || '',
    })
    setStep(2)
  }

  const getDiffs = () => {
    const diffs: any[] = []
    if (selectedAsset.owner_name !== form.allotted_employee_at_audit) {
      diffs.push({ field: 'User', old: selectedAsset.owner_name || 'Unassigned', new: form.allotted_employee_at_audit || 'Unassigned' })
    }
    if (selectedAsset.dept_name !== form.department_at_audit) {
      diffs.push({ field: 'Department', old: selectedAsset.dept_name || 'None', new: form.department_at_audit || 'None' })
    }
    if (selectedAsset.working_condition !== form.condition_at_audit) {
      diffs.push({ field: 'Condition', old: selectedAsset.working_condition || 'working', new: form.condition_at_audit })
    }
    return diffs
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        asset_id: selectedAsset.id,
        audit_date: new Date().toISOString().split('T')[0],
        auditor: user?.full_name || user?.email || 'Unknown Auditor',
        ...form
      }

      const response = await fetch('/api/inventory/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      qc.invalidateQueries({ queryKey: ['audits'] })
      qc.invalidateQueries({ queryKey: ['asset-audits', selectedAsset.id] })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save audit')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm fade-in" onMouseDown={(e) => { if(e.target===e.currentTarget) onClose() }}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
        <div className="px-6 py-4 border-b shrink-0 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {step === 1 ? 'Search Asset' : step === 2 ? 'Audit Details' : 'Review & Confirm'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">{error}</div>}

          {step === 1 && (
            <div>
              <div className="relative mb-4">
                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                <input 
                  type="text" 
                  className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm outline-none transition-colors"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text-primary)' }}
                  placeholder="Search by Asset Tag or Model..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                {searchResults.map((asset: any) => (
                  <div key={asset.id} onClick={() => handleSelectAsset(asset)} className="p-3 border rounded-lg cursor-pointer transition-colors flex items-center justify-between" style={{ borderColor: 'var(--border)' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div>
                      <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{asset.model_name || asset.asset_type}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{asset.asset_tag || 'UNTAGGED'} · {asset.owner_name || 'Unassigned'}</p>
                    </div>
                    <ArrowRight size={14} className="text-gray-400" />
                  </div>
                ))}
                {searchTerm.length >= 2 && searchResults.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No assets found.</p>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--bg-hover)' }}>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{selectedAsset.model_name || selectedAsset.asset_type}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{selectedAsset.asset_tag || 'UNTAGGED'}</p>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>User / Owner</label>
                  <input className="w-full px-3 py-2.5 border rounded-lg text-sm outline-none" style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text-primary)' }} value={form.allotted_employee_at_audit} onChange={e => setForm({...form, allotted_employee_at_audit: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Department</label>
                  <input className="w-full px-3 py-2.5 border rounded-lg text-sm outline-none" style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text-primary)' }} value={form.department_at_audit} onChange={e => setForm({...form, department_at_audit: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Condition</label>
                  <select className="w-full px-3 py-2.5 border rounded-lg text-sm outline-none" style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text-primary)' }} value={form.condition_at_audit} onChange={e => setForm({...form, condition_at_audit: e.target.value})}>
                    <option value="working">Working</option>
                    <option value="not_working">Not Working</option>
                    <option value="in_repair">In Repair</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Observations / Notes</label>
                <textarea rows={3} className="w-full p-3 border rounded-lg text-sm outline-none resize-none" style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text-primary)' }} value={form.observations} onChange={e => setForm({...form, observations: e.target.value})} placeholder="Any physical damage or software issues..." />
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>Please review the changes before saving. Audit records are immutable once saved.</p>
              
              <div className="space-y-3">
                {getDiffs().length === 0 ? (
                  <div className="p-4 rounded-lg border text-sm flex items-center gap-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                    <Check size={16} /> No changes detected. Data matches system records.
                  </div>
                ) : (
                  getDiffs().map((diff, i) => (
                    <div key={i} className="p-3.5 border rounded-lg flex items-center justify-between text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{diff.field}</span>
                      <div className="flex items-center gap-3">
                        <span className="line-through" style={{ color: 'var(--text-tertiary)' }}>{diff.old}</span>
                        <ArrowRight size={14} className="text-gray-400" />
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{diff.new}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {step > 1 && (
          <div className="px-6 py-4 border-t shrink-0 flex gap-3 justify-end" style={{ borderColor: 'var(--border)' }}>
            <button onClick={() => setStep(step === 2 ? 1 : 2)} className="px-4 py-2 rounded-lg text-[13px] font-medium border transition-colors hover:bg-gray-50 text-gray-700" style={{ borderColor: 'var(--border)' }}>Back</button>
            {step === 2 ? (
              <button onClick={() => setStep(3)} className="px-4 py-2 rounded-lg text-[13px] font-medium text-white bg-black hover:bg-gray-800 transition-colors">Review Changes</button>
            ) : (
              <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 rounded-lg text-[13px] font-medium text-white bg-black hover:bg-gray-800 transition-colors flex items-center gap-2">
                <Check size={14} /> {saving ? 'Saving...' : 'Confirm & Save Audit'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
