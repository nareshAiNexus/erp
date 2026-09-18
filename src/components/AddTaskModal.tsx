import { useState } from 'react'
import { X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { dbQuery } from '../lib/dbClient'
import type { AuthUser } from '../lib/auth'
import { createNotification } from '../lib/notifications'
import { TimePicker } from './TimePicker'

type Props = {
  employee: AuthUser
  initialDate?: Date
  onClose: () => void
  onSaved: () => void
}

function toISO(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const date = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${date}`
}

export function AddTaskModal({ employee, initialDate, onClose, onSaved }: Props) {
  const startISO = initialDate ? toISO(initialDate) : toISO(new Date())
  
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDate, setTaskDate] = useState(startISO)
  const [taskTime, setTaskTime] = useState('09:00 AM')
  const [reason, setReason] = useState('')
  const [taggedEmployeeIds, setTaggedEmployeeIds] = useState<string[]>([])
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: employees = [] } = useQuery({
    queryKey: ['active-employees-tagging'],
    queryFn: () => dbQuery("SELECT id, first_name, last_name FROM employees WHERE status = 'active' ORDER BY first_name")
  })

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      if (!taskTitle.trim()) throw new Error('Task title is required')
      
      const match = taskTime.match(/(\d+):(\d+)\s+(AM|PM)/i)
      let timeStr = '00:00:00'
      if (match) {
        let h = parseInt(match[1])
        const m = match[2]
        const isPm = match[3].toUpperCase() === 'PM'
        if (isPm && h < 12) h += 12
        if (!isPm && h === 12) h = 0
        timeStr = `${String(h).padStart(2, '0')}:${m}:00`
      }

      // Create for current user
      await dbQuery(
        `INSERT INTO tasks (employee_id, title, description, due_date, due_time)
         VALUES ($1, $2, $3, $4, $5)`,
        [employee.id, taskTitle, reason || null, taskDate, timeStr]
      )

      // Create for tagged employees
      for (const tagId of taggedEmployeeIds) {
        await dbQuery(
          `INSERT INTO tasks (employee_id, title, description, due_date, due_time)
           VALUES ($1, $2, $3, $4, $5)`,
          [tagId, taskTitle, reason || null, taskDate, timeStr]
        )
        await createNotification(
          tagId, 
          'task', 
          `${employee.first_name} ${employee.last_name} assigned you a task: ${taskTitle}`
        )
      }

      onSaved()
    } catch(e: any) { 
      setError(e.message) 
    } finally { 
      setSaving(false) 
    }
  }

  const inp = 'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all'
  const inpS = { borderColor: '#e5e7eb', background: 'white', color: '#111827' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onMouseDown={(e) => { if(e.target === e.currentTarget) onClose() }}>
      
      <div className="w-full max-w-sm rounded-2xl border shadow-2xl bg-white flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: '#e5e7eb' }}>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Create New Task
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Add a personal reminder or assign to others
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {error && <div className="px-3 py-2 rounded-lg text-xs bg-red-50 text-red-700">{error}</div>}

          <div>
            <label className="text-xs font-medium mb-1.5 block text-gray-700">Task Title</label>
            <input type="text" className={inp} style={inpS} value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)} placeholder="e.g. Prepare Monthly Report" />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium mb-1.5 block text-gray-700">Date</label>
              <div className="relative">
                <input 
                  type="date" 
                  className={`${inp} cursor-pointer hover:bg-gray-50 appearance-none`} 
                  style={inpS} 
                  value={taskDate}
                  onChange={e => setTaskDate(e.target.value)} 
                />
              </div>
            </div>
            <div className="flex-1">
              <TimePicker
                label="Time"
                value={taskTime}
                onChange={setTaskTime}
              />
            </div>
          </div>
          
          <div>
            <label className="text-xs font-medium mb-1.5 block text-gray-700">Tag Employees</label>
            <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1 bg-gray-50" style={{ borderColor: '#e5e7eb' }}>
              {employees.filter((e: any) => e.id !== employee.id).map((emp: any) => (
                <label key={emp.id} className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer p-1.5 hover:bg-white rounded-md transition-colors">
                  <input type="checkbox" checked={taggedEmployeeIds.includes(emp.id)}
                    onChange={(e) => {
                      if (e.target.checked) setTaggedEmployeeIds([...taggedEmployeeIds, emp.id])
                      else setTaggedEmployeeIds(taggedEmployeeIds.filter(id => id !== emp.id))
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                  />
                  <span className="font-medium">{emp.first_name} {emp.last_name}</span>
                </label>
              ))}
              {employees.length <= 1 && (
                <span className="text-xs text-gray-400 p-1 block text-center">No other employees found.</span>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block text-gray-700">Description (optional)</label>
            <textarea className={inp} style={inpS} rows={2} value={reason}
              onChange={e => setReason(e.target.value)} placeholder="Add any details..." />
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t shrink-0 flex gap-2" style={{ borderColor: '#e5e7eb' }}>
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg text-xs font-semibold border text-gray-700 hover:bg-gray-50 transition-colors"
            style={{ borderColor: '#e5e7eb' }}>
            Cancel
          </button>
          <button onClick={submit} disabled={saving}
            className="flex-1 py-2 rounded-lg text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Task'}
          </button>
        </div>

      </div>
    </div>
  )
}
