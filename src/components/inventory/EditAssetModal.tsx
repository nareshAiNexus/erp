import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { dbQuery } from '../../lib/dbClient'

export function EditAssetModal({ asset, onClose }: { asset: any, onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    allotted_employee_id: asset.allotted_employee_id || '',
    working_condition: asset.working_condition || '',
    status: asset.status || 'active'
  })
  const [saving, setSaving] = useState(false)

  const { data: employees = [] } = useQuery({
    queryKey: ['all-employees'],
    queryFn: async () => {
      const res = await dbQuery("SELECT id, first_name, last_name FROM employees WHERE status = 'active'")
      return res
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await dbQuery(
        `UPDATE assets SET allotted_employee_id = $1, working_condition = $2, status = $3 WHERE id = $4`,
        [form.allotted_employee_id || null, form.working_condition || null, form.status, asset.id]
      )
      qc.invalidateQueries({ queryKey: ['asset', String(asset.id)] })
      onClose()
    } catch (err) {
      console.error(err)
      alert('Failed to update asset')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = { borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text-primary)' }
  const inputCls = "w-full px-3 py-2.5 border rounded-lg text-sm outline-none"
  const labelCls = "block text-[11px] font-medium mb-1.5"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-sm fade-in"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-xl w-full max-w-md flex flex-col shadow-lg border"
        style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
      >
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Edit Asset</h2>
          <button onClick={onClose} style={{ color: 'var(--text-tertiary)' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>Assign to Employee</label>
            <select
              className={inputCls} style={inputStyle}
              value={form.allotted_employee_id}
              onChange={(e) => setForm({ ...form, allotted_employee_id: e.target.value })}
            >
              <option value="">Unassigned</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
          </div>

          {asset.category !== 'system' && (
            <div>
              <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>Working Condition</label>
              <select
                className={inputCls} style={inputStyle}
                value={form.working_condition}
                onChange={(e) => setForm({ ...form, working_condition: e.target.value })}
              >
                <option value="working">Working</option>
                <option value="not_working">Not Working</option>
                <option value="in_repair">In Repair</option>
              </select>
            </div>
          )}

          <div>
            <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>Status</label>
            <select
              className={inputCls} style={inputStyle}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="disposed">Disposed</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-[13px] font-medium transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
              style={{ background: 'var(--text-primary)', color: 'var(--bg)' }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
