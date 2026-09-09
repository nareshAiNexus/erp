import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Plus, Wallet, Check, Clock } from 'lucide-react'
import type { PayrollRecord, Employee } from '../../lib/types'
import { dbQuery } from '../../lib/dbClient'

export const getPayrollRecordsFn = async ({ data: month }: { data: string }) => {
  const rows = await dbQuery(`
    SELECT p.*, e.first_name, e.last_name, e.department, e.role 
    FROM payroll_records p 
    JOIN employees e ON p.employee_id = e.id 
    WHERE p.pay_period_month = $1 
    ORDER BY p.created_at DESC
  `, [month])
  return rows.map((r: any) => ({
    ...r,
    employees: { first_name: r.first_name, last_name: r.last_name, department: r.department, role: r.role }
  })) as (PayrollRecord & { employees: { first_name: string; last_name: string; department: string; role: string } })[]
}

export const getEmployeesFn = async () => {
  const rows = await dbQuery('SELECT * FROM employees ORDER BY first_name')
  return rows as Employee[]
}

export const updatePayrollStatusFn = async ({ data: { id, status } }: { data: { id: string; status: string } }) => {
  await dbQuery('UPDATE payroll_records SET status = $1 WHERE id = $2', [status, id])
}

export const savePayrollRecordFn = async ({ data: payload }: { data: any }) => {
  await dbQuery(`
    INSERT INTO payroll_records (
      employee_id, pay_period_month, base_salary, bonuses, deductions, tax, net_pay, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    payload.employee_id, payload.pay_period_month, payload.base_salary, payload.bonuses,
    payload.deductions, payload.tax, payload.net_pay, payload.status
  ])
}

export const Route = createFileRoute('/payroll/')({ component: PayrollPage })

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#e65100', bg: '#fff3e0' },
  processed: { label: 'Processed', color: '#1565c0', bg: '#e3f2fd' },
  paid: { label: 'Paid', color: '#2e7d32', bg: '#e8f5e9' },
}

function PayrollPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  )

  const { data: records, isLoading } = useQuery({
    queryKey: ['payroll', selectedMonth],
    queryFn: () => getPayrollRecordsFn({ data: selectedMonth }),
  })

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => getEmployeesFn(),
  })

  const statusMutation = useMutation({
    mutationFn: (params: { id: string; status: string }) => updatePayrollStatusFn({ data: params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll', selectedMonth] })
      queryClient.invalidateQueries({ queryKey: ['pending-payroll'] })
    },
  })

  const totalNet = (records ?? []).reduce((sum, r) => sum + r.net_pay, 0)
  const totalGross = (records ?? []).reduce((sum, r) => sum + r.base_salary + r.bonuses, 0)

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Payroll
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Gross ${totalGross.toFixed(2)} · Net ${totalNet.toFixed(2)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 rounded-md border text-sm"
            style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text-primary)' }}
          />
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium text-white"
            style={{ background: 'var(--text-primary)' }}
          >
            <Plus size={15} /> Add Record
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center" style={{ color: 'var(--text-tertiary)' }}>
          Loading payroll...
        </div>
      ) : (records ?? []).length === 0 ? (
        <div className="py-16 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg mb-3" style={{ background: 'var(--bg-subtle)' }}>
            <Wallet size={20} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            No payroll records for {selectedMonth}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                <th className="text-left text-xs font-semibold px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Employee</th>
                <th className="text-right text-xs font-semibold px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Base</th>
                <th className="text-right text-xs font-semibold px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Bonus</th>
                <th className="text-right text-xs font-semibold px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Deductions</th>
                <th className="text-right text-xs font-semibold px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Tax</th>
                <th className="text-right text-xs font-semibold px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Net Pay</th>
                <th className="text-center text-xs font-semibold px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(records ?? []).map((r) => {
                const sc = statusConfig[r.status]
                const emp = r.employees
                return (
                  <tr key={r.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {emp?.first_name} {emp?.last_name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {emp?.department}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm" style={{ color: 'var(--text-primary)' }}>
                      ${r.base_salary.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm" style={{ color: 'var(--text-primary)' }}>
                      ${r.bonuses.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm" style={{ color: '#c62828' }}>
                      -${r.deductions.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm" style={{ color: '#c62828' }}>
                      -${r.tax.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      ${r.net_pay.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.status === 'paid' ? (
                        <span className="text-xs px-2 py-0.5 rounded font-medium inline-flex items-center gap-1" style={{ background: sc.bg, color: sc.color }}>
                          <Check size={11} /> {sc.label}
                        </span>
                      ) : (
                        <select
                          value={r.status}
                          onChange={(e) => statusMutation.mutate({ id: r.id, status: e.target.value })}
                          className="text-xs px-2 py-1 rounded border font-medium"
                          style={{ borderColor: 'var(--border)', background: sc.bg, color: sc.color }}
                        >
                          <option value="pending">Pending</option>
                          <option value="processed">Processed</option>
                          <option value="paid">Paid</option>
                        </select>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <PayrollForm
          employees={employees ?? []}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            queryClient.invalidateQueries({ queryKey: ['payroll', selectedMonth] })
            queryClient.invalidateQueries({ queryKey: ['pending-payroll'] })
          }}
        />
      )}
    </div>
  )
}

type FormProps = {
  employees: Employee[]
  onClose: () => void
  onSaved: () => void
}

function PayrollForm({ employees, onClose, onSaved }: FormProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    employee_id: '',
    pay_period_month: new Date().toISOString().slice(0, 7),
    base_salary: '',
    bonuses: '0',
    deductions: '0',
    tax: '0',
  })

  const set = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const base = parseFloat(form.base_salary) || 0
    const bonuses = parseFloat(form.bonuses) || 0
    const deductions = parseFloat(form.deductions) || 0
    const tax = parseFloat(form.tax) || 0
    const net_pay = base + bonuses - deductions - tax

    try {
      await savePayrollRecordFn({ data: {
        employee_id: form.employee_id,
        pay_period_month: form.pay_period_month,
        base_salary: base,
        bonuses,
        deductions,
        tax,
        net_pay,
        status: 'pending',
      }})
      setSaving(false)
      onSaved()
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 rounded-md border text-sm'
  const inputStyle = { borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text-primary)' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay"
      style={{ background: 'rgba(0,0,0,0.3)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-lg border modal-panel"
        style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Add Payroll Record</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-hover)]">
            <Clock size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-md text-xs" style={{ background: '#ffebee', color: '#c62828' }}>
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Employee</label>
            <select className={inputClass} style={inputStyle} value={form.employee_id} onChange={(e) => set('employee_id', e.target.value)} required>
              <option value="">Select employee...</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Pay Period</label>
              <input type="month" className={inputClass} style={inputStyle} value={form.pay_period_month} onChange={(e) => set('pay_period_month', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Base Salary</label>
              <input type="number" step="0.01" className={inputClass} style={inputStyle} value={form.base_salary} onChange={(e) => set('base_salary', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Bonuses</label>
              <input type="number" step="0.01" className={inputClass} style={inputStyle} value={form.bonuses} onChange={(e) => set('bonuses', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Deductions</label>
              <input type="number" step="0.01" className={inputClass} style={inputStyle} value={form.deductions} onChange={(e) => set('deductions', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Tax</label>
              <input type="number" step="0.01" className={inputClass} style={inputStyle} value={form.tax} onChange={(e) => set('tax', e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium border" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-md text-sm font-medium text-white" style={{ background: 'var(--text-primary)' }}>
              {saving ? 'Saving...' : 'Add Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
