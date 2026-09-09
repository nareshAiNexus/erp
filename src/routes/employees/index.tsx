import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, Search, Pencil, Trash2, Mail, Phone } from 'lucide-react'
import type { Employee } from '../../lib/types'
import { EmployeeForm } from '../../components/EmployeeForm'
import { dbQuery } from '../../lib/dbClient'

export const getEmployeesFn = async () => {
  const rows = await dbQuery('SELECT * FROM employees ORDER BY created_at DESC')
  return rows as Employee[]
}

export const deleteEmployeeFn = async ({ data: id }: { data: string }) => {
  await dbQuery('DELETE FROM employees WHERE id = $1', [id])
}

export const Route = createFileRoute('/employees/')({ component: EmployeesList })

function EmployeesList() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => getEmployeesFn(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEmployeeFn({ data: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['employee-count'] })
    },
  })

  const filtered = (employees ?? []).filter((e) => {
    const full = `${e.first_name} ${e.last_name}`.toLowerCase()
    return (
      full.includes(search.toLowerCase()) ||
      e.email?.toLowerCase().includes(search.toLowerCase()) ||
      e.department?.toLowerCase().includes(search.toLowerCase())
    )
  })

  const statusColors: Record<string, { bg: string; text: string }> = {
    active: { bg: '#e8f5e9', text: '#2e7d32' },
    on_leave: { bg: '#fff3e0', text: '#e65100' },
    terminated: { bg: '#ffebee', text: '#c62828' },
  }

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Employees
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {employees?.length ?? 0} team members
          </p>
        </div>
        <button
          onClick={() => { setEditingEmployee(null); setShowForm(true) }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium text-white"
          style={{ background: 'var(--text-primary)' }}
        >
          <Plus size={15} /> Add Employee
        </button>
      </div>

      <div className="mb-4 relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--text-tertiary)' }}
        />
        <input
          type="text"
          placeholder="Search by name, email, or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-md border text-sm"
          style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text-primary)' }}
        />
      </div>

      {isLoading ? (
        <div className="py-12 text-center" style={{ color: 'var(--text-tertiary)' }}>
          Loading employees...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center" style={{ color: 'var(--text-tertiary)' }}>
          No employees found
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                <th className="text-left text-xs font-semibold px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Name</th>
                <th className="text-left text-xs font-semibold px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Department</th>
                <th className="text-left text-xs font-semibold px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Role</th>
                <th className="text-left text-xs font-semibold px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Status</th>
                <th className="text-left text-xs font-semibold px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Contact</th>
                <th className="text-right text-xs font-semibold px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => {
                const sc = statusColors[emp.status] ?? statusColors.active
                return (
                  <tr
                    key={emp.id}
                    className="border-t"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                          style={{ background: 'var(--text-primary)' }}
                        >
                          {emp.first_name[0]}{emp.last_name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {emp.first_name} {emp.last_name}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            {emp.employment_type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                      {emp.department}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                      {emp.role}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded font-medium"
                        style={{ background: sc.bg, color: sc.text }}
                      >
                        {emp.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        {emp.email && (
                          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                            <Mail size={11} /> {emp.email}
                          </span>
                        )}
                        {emp.phone && (
                          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                            <Phone size={11} /> {emp.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setEditingEmployee(emp); setShowForm(true) }}
                          className="p-1.5 rounded hover:bg-[var(--bg-hover)]"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete ${emp.first_name} ${emp.last_name}?`)) {
                              deleteMutation.mutate(emp.id)
                            }
                          }}
                          className="p-1.5 rounded hover:bg-[var(--bg-hover)]"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <EmployeeForm
          employee={editingEmployee}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            queryClient.invalidateQueries({ queryKey: ['employees'] })
            queryClient.invalidateQueries({ queryKey: ['employee-count'] })
          }}
        />
      )}
    </div>
  )
}
