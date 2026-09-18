import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../lib/AuthContext'
import { dbQuery } from '../../lib/dbClient'
import { Calendar, Clock, Loader2, Plus, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { AddTaskModal } from '../../components/AddTaskModal'

export const Route = createFileRoute('/tasks/')({
  component: TasksPage,
})

type Task = {
  id: string
  title: string
  description: string
  due_date: string
  due_time: string
  is_completed: boolean
  status: string
  assignees: string[]
}

type EmployeeInfo = { id: string, first_name: string, last_name: string, avatar_url: string }

function TasksPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [dragConfirm, setDragConfirm] = useState<{ id: string, newStatus: string } | null>(null)

  const { data: employees = [] } = useQuery<EmployeeInfo[]>({
    queryKey: ['employees-avatars'],
    queryFn: () => dbQuery("SELECT id, first_name, last_name, avatar_url FROM employees")
  })

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ['all-user-tasks-kanban', user?.id],
    queryFn: () => dbQuery(`
      SELECT id, title, description, due_date::text as due_date, due_time, is_completed, status, assignees 
      FROM tasks 
      WHERE employee_id = $1 OR $1 = ANY(assignees)
      ORDER BY due_date ASC, due_time ASC
    `, [user?.id]),
    enabled: !!user?.id
  })

  const changeStatus = async (id: string, newStatus: string) => {
    await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'UPDATE tasks SET status = $1, is_completed = $2 WHERE id = $3',
        values: [newStatus, newStatus === 'done', id]
      })
    })
    qc.invalidateQueries({ queryKey: ['all-user-tasks-kanban', user?.id] })
    qc.invalidateQueries({ queryKey: ['user-tasks'] })
    qc.invalidateQueries({ queryKey: ['due-tasks'] })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading tasks...
      </div>
    )
  }

  const allTasks = tasks || []
  
  // Map older tasks without status
  const normalizedTasks = allTasks.map(t => ({
    ...t,
    status: t.status ? t.status : (t.is_completed ? 'done' : 'todo'),
    assignees: t.assignees || []
  }))

  const columns = [
    { id: 'todo', label: 'To Do', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
    { id: 'in_progress', label: 'In Progress', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
    { id: 'review', label: 'Need Review', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
    { id: 'done', label: 'Done', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' }
  ]

  const getInitials = (f: string, l: string) => `${f?.[0]||''}${l?.[0]||''}`.toUpperCase()

  return (
    <div className="fade-in max-w-[1400px] mx-auto h-[calc(100vh-100px)] flex flex-col">
      <div className="mb-6 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Task Board</h1>
          <p className="text-sm mt-1 text-gray-500">Manage your projects and tasks</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={16} />
          Add new task
        </button>
      </div>

      {allTasks.length === 0 ? (
        <div className="flex-1 border-2 border-dashed rounded-xl border-gray-200 bg-gray-50 flex flex-col items-center justify-center">
          <p className="text-sm text-gray-500 mb-4">You're all caught up! No pending tasks.</p>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
          >
            Add your first task
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto flex gap-6 pb-4 custom-scrollbar">
          {columns.map(col => {
            const colTasks = normalizedTasks.filter(t => t.status === col.id)
            return (
              <div key={col.id} className="flex-shrink-0 w-80 flex flex-col bg-gray-50/50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <h3 className="font-semibold text-gray-700 text-sm">{col.label}</h3>
                  </div>
                  <span className="text-xs font-semibold text-gray-500 bg-white px-2 py-0.5 rounded shadow-sm">
                    {colTasks.length}
                  </span>
                </div>
                
                <div 
                  className="flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1 pr-1"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const taskId = e.dataTransfer.getData('text/plain')
                    if (taskId && taskId !== '') {
                      const task = allTasks.find(t => t.id === taskId)
                      if (task && task.status !== col.id) {
                        setDragConfirm({ id: taskId, newStatus: col.id })
                      }
                    }
                  }}
                >
                  {colTasks.map(task => (
                    <div 
                      key={task.id} 
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', task.id)}
                      className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group relative cursor-grab active:cursor-grabbing"
                    >
                      
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${col.color}`}>
                          {col.label}
                        </span>
                        
                        <div className="relative">
                          <select 
                            className="absolute inset-0 opacity-0 cursor-pointer w-full"
                            value={task.status}
                            onChange={(e) => changeStatus(task.id, e.target.value)}
                          >
                            {columns.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                          </select>
                          <button className="text-gray-400 hover:text-gray-600 transition-colors">
                            <MoreHorizontal size={16} />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-semibold text-gray-800 text-sm mb-1 leading-snug">{task.title}</h4>
                      {task.description && (
                        <p className="text-xs text-gray-500 mb-4 line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-3 text-[11px] font-medium text-gray-400">
                          {task.due_date && (
                            <div className="flex items-center gap-1">
                              <Calendar size={12} />
                              {new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </div>
                          )}
                          {task.due_time && (
                            <div className="flex items-center gap-1">
                              <Clock size={12} />
                              {task.due_time.substring(0, 5)}
                            </div>
                          )}
                        </div>

                        {/* Avatars */}
                        <div className="flex -space-x-2">
                          {task.assignees?.map((empId, idx) => {
                            if (idx > 2) return null; // Show max 3
                            const emp = employees.find(e => e.id === empId)
                            if (!emp) return null
                            return emp.avatar_url ? (
                              <img key={empId} src={emp.avatar_url} alt="avatar" className="w-6 h-6 rounded-full border-2 border-white bg-white" />
                            ) : (
                              <div key={empId} className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 text-gray-600 flex items-center justify-center text-[9px] font-bold">
                                {getInitials(emp.first_name, emp.last_name)}
                              </div>
                            )
                          })}
                          {(task.assignees?.length || 0) > 3 && (
                            <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 text-gray-500 flex items-center justify-center text-[9px] font-bold z-10">
                              +{task.assignees.length - 3}
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  ))}
                  {colTasks.length === 0 && (
                    <div className="text-center py-6 border border-dashed rounded-xl border-gray-200">
                      <p className="text-xs text-gray-400">No tasks</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showAddModal && (
        <AddTaskModal
          employee={user!}
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false)
            qc.invalidateQueries({ queryKey: ['all-user-tasks-kanban', user?.id] })
          }}
        />
      )}

      {dragConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Move</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to move this task to <span className="font-semibold text-gray-800">{columns.find(c => c.id === dragConfirm.newStatus)?.label}</span>?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDragConfirm(null)}
                className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  changeStatus(dragConfirm.id, dragConfirm.newStatus)
                  setDragConfirm(null)
                }}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
