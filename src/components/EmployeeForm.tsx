import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import type { Employee } from '../lib/types'
import { dbQuery } from '../lib/dbClient'

const saveEmployeeFn = async ({ data: payload }: { data: any }) => {
  if (payload.id) {
    await dbQuery(
      `UPDATE employees SET 
        first_name = $1, last_name = $2, email = $3, phone = $4, department = $5, 
        role = $6, employment_type = $7, salary = $8, hire_date = $9, status = $10, address = $11
       WHERE id = $12`,
      [
        payload.first_name, payload.last_name, payload.email, payload.phone, payload.department,
        payload.role, payload.employment_type, payload.salary, payload.hire_date, payload.status, payload.address,
        payload.id
      ]
    )
  } else {
    await dbQuery(
      `INSERT INTO employees (
        first_name, last_name, email, phone, department, role, employment_type, salary, hire_date, status, address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        payload.first_name, payload.last_name, payload.email, payload.phone, payload.department,
        payload.role, payload.employment_type, payload.salary, payload.hire_date, payload.status, payload.address
      ]
    )
  }
}

type Props = {
  employee: Employee | null
  onClose: () => void
  onSaved: () => void
}

export function EmployeeForm({ employee, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    first_name: employee?.first_name ?? '',
    last_name: employee?.last_name ?? '',
    email: employee?.email ?? '',
    phone: employee?.phone ?? '',
    department: employee?.department ?? 'General',
    role: employee?.role ?? '',
    employment_type: employee?.employment_type ?? 'full_time',
    salary: employee?.salary?.toString() ?? '',
    hire_date: employee?.hire_date ?? '',
    status: employee?.status ?? 'active',
    address: employee?.address ?? '',
  })

  const set = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      id: employee?.id,
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email || null,
      phone: form.phone || null,
      department: form.department,
      role: form.role || null,
      employment_type: form.employment_type,
      salary: form.salary ? parseFloat(form.salary) : 0,
      hire_date: form.hire_date || null,
      status: form.status,
      address: form.address || null,
    }

    try {
      await saveEmployeeFn({ data: payload })
      setSaving(false)
      onSaved()
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 rounded-md border text-sm'
  const inputStyle = { borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text-primary)' }
  const labelClass = 'text-xs font-medium mb-1.5 block'
  const labelStyle = { color: 'var(--text-secondary)' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay"
      style={{ background: 'rgba(0,0,0,0.3)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg border modal-panel"
        style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b sticky top-0 z-10"
          style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
        >
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            {employee ? 'Edit Employee' : 'Add Employee'}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-hover)]">
            <X size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-md text-xs" style={{ background: '#ffebee', color: '#c62828' }}>
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={labelStyle}>First Name</label>
              <input className={inputClass} style={inputStyle} value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Last Name</label>
              <input className={inputClass} style={inputStyle} value={form.last_name} onChange={(e) => set('last_name', e.target.value)} required />
            </div>
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>Email</label>
            <input type="email" className={inputClass} style={inputStyle} value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>Phone</label>
            <input className={inputClass} style={inputStyle} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={labelStyle}>Department</label>
              <input className={inputClass} style={inputStyle} value={form.department} onChange={(e) => set('department', e.target.value)} />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Role / Title</label>
              <input className={inputClass} style={inputStyle} value={form.role} onChange={(e) => set('role', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={labelStyle}>Employment Type</label>
              <select className={inputClass} style={inputStyle} value={form.employment_type} onChange={(e) => set('employment_type', e.target.value)}>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contractor">Contractor</option>
              </select>
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Status</label>
              <select className={inputClass} style={inputStyle} value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={labelStyle}>Annual Salary</label>
              <input type="number" className={inputClass} style={inputStyle} value={form.salary} onChange={(e) => set('salary', e.target.value)} />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Hire Date</label>
              <input type="date" className={inputClass} style={inputStyle} value={form.hire_date} onChange={(e) => set('hire_date', e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>Address</label>
            <textarea className={inputClass} style={inputStyle} rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-medium border"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-md text-sm font-medium text-white"
              style={{ background: 'var(--text-primary)' }}
            >
              {saving ? 'Saving...' : employee ? 'Save Changes' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
