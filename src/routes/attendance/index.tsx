import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { Attendance, Employee } from '../../lib/types'
import { dbQuery } from '../../lib/dbClient'

export const getEmployeesFn = async () => {
  const rows = await dbQuery('SELECT * FROM employees ORDER BY first_name')
  return rows as Employee[]
}

export const getAttendanceFn = async ({ data: date }: { data: string }) => {
  const rows = await dbQuery(`
    SELECT a.*, e.first_name, e.last_name 
    FROM attendance a 
    JOIN employees e ON a.employee_id = e.id 
    WHERE a.date = $1 
    ORDER BY a.created_at
  `, [date])
  return rows.map((r: any) => ({
    ...r,
    employees: { first_name: r.first_name, last_name: r.last_name }
  })) as (Attendance & { employees: { first_name: string; last_name: string } })[]
}

export const upsertAttendanceFn = async ({ data: params }: { data: {
  employee_id: string
  date: string
  status: string
  check_in?: string
  check_out?: string
  notes?: string
}}) => {
  const rows = await dbQuery('SELECT id FROM attendance WHERE employee_id = $1 AND date = $2', [params.employee_id, params.date])
  if (rows.length > 0) {
    await dbQuery(`
      UPDATE attendance SET status = $1, check_in = $2, check_out = $3, notes = $4 
      WHERE id = $5
    `, [params.status, params.check_in ?? null, params.check_out ?? null, params.notes ?? null, rows[0].id])
  } else {
    await dbQuery(`
      INSERT INTO attendance (employee_id, date, status, check_in, check_out, notes) 
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [params.employee_id, params.date, params.status, params.check_in ?? null, params.check_out ?? null, params.notes ?? null])
  }
}

export const Route = createFileRoute('/attendance/')({ component: AttendancePage })

const statusConfig: Record<string, { label: string; color: string }> = {
  present: { label: 'Present', color: '#2e7d32' },
  absent: { label: 'Absent', color: '#c62828' },
  late: { label: 'Late', color: '#e65100' },
  half_day: { label: 'Half Day', color: '#f9a825' },
  remote: { label: 'Remote', color: '#1565c0' },
}

function AttendancePage() {
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => getEmployeesFn(),
  })

  const { data: records, isLoading } = useQuery({
    queryKey: ['attendance', selectedDate],
    queryFn: () => getAttendanceFn({ data: selectedDate }),
  })

  const upsertMutation = useMutation({
    mutationFn: async (params: {
      employee_id: string
      status: string
      check_in?: string
      check_out?: string
      notes?: string
    }) => {
      await upsertAttendanceFn({ data: { ...params, date: selectedDate } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', selectedDate] })
      queryClient.invalidateQueries({ queryKey: ['present-today'] })
    },
  })

  const recordMap = new Map(records?.map((r) => [r.employee_id, r]))

  const summary = {
    present: records?.filter((r) => r.status === 'present').length ?? 0,
    late: records?.filter((r) => r.status === 'late').length ?? 0,
    absent: records?.filter((r) => r.status === 'absent').length ?? 0,
    remote: records?.filter((r) => r.status === 'remote').length ?? 0,
    half_day: records?.filter((r) => r.status === 'half_day').length ?? 0,
  }

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Attendance
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Track daily check-in and check-out
          </p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 rounded-md border text-sm"
          style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text-primary)' }}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <div
            key={key}
            className="p-3 rounded-lg border"
            style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
          >
            <p className="text-lg font-semibold" style={{ color: cfg.color }}>
              {summary[key as keyof typeof summary]}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {cfg.label}
            </p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="py-12 text-center" style={{ color: 'var(--text-tertiary)' }}>
          Loading attendance...
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                <th className="text-left text-xs font-semibold px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Employee</th>
                <th className="text-left text-xs font-semibold px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Status</th>
                <th className="text-left text-xs font-semibold px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Check In</th>
                <th className="text-left text-xs font-semibold px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Check Out</th>
              </tr>
            </thead>
            <tbody>
              {(employees ?? []).map((emp) => {
                const record = recordMap.get(emp.id)
                const status = record?.status ?? 'present'
                const sc = statusConfig[status]
                return (
                  <tr key={emp.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                          style={{ background: 'var(--text-primary)' }}
                        >
                          {emp.first_name[0]}{emp.last_name[0]}
                        </div>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {emp.first_name} {emp.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={status}
                        onChange={(e) => {
                          upsertMutation.mutate({
                            employee_id: emp.id,
                            status: e.target.value,
                          })
                        }}
                        className="text-xs px-2 py-1 rounded border font-medium"
                        style={{
                          borderColor: 'var(--border)',
                          background: 'var(--bg)',
                          color: sc.color,
                        }}
                      >
                        {Object.entries(statusConfig).map(([key, cfg]) => (
                          <option key={key} value={key}>{cfg.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {record?.check_in
                        ? new Date(record.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {record?.check_out
                        ? new Date(record.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
