import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../lib/AuthContext'
import { dbQuery } from '../../lib/dbClient'
import { CheckSquare, Square, Calendar, Clock, Loader2, Plus } from 'lucide-react'
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
}

function TasksPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ['all-user-tasks', user?.id],
    queryFn: () => dbQuery(`
      SELECT id, title, description, due_date::text as due_date, due_time, is_completed 
      FROM tasks 
      WHERE employee_id = $1 
      ORDER BY due_date ASC, due_time ASC
    `, [user?.id]),
    enabled: !!user?.id
  })

  const toggleTask = async (id: string, is_completed: boolean) => {
    await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'UPDATE tasks SET is_completed = $1 WHERE id = $2',
        values: [!is_completed, id]
      })
    })
    qc.invalidateQueries({ queryKey: ['all-user-tasks', user?.id] })
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

  const upcoming = tasks?.filter(t => !t.is_completed) || []
  const completed = tasks?.filter(t => t.is_completed) || []

  return (
    <div className="fade-in max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            My Tasks
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Manage your personal reminders and to-dos
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-colors shadow-sm"
        >
          <Plus size={16} />
          Add Task
        </button>
      </div>

      <div className="space-y-6">
        {/* Upcoming Tasks */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Upcoming ({upcoming.length})
          </h2>
          {upcoming.length === 0 ? (
            <div className="py-10 text-center border rounded-xl border-dashed bg-gray-50 flex flex-col items-center justify-center">
              <CheckSquare size={32} className="text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 mb-4">You're all caught up! No pending tasks.</p>
              <button 
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
              >
                Add your first task
              </button>
            </div>
          ) : (
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
              <ul className="divide-y">
                {upcoming.map(t => (
                  <TaskRow key={t.id} task={t} onToggle={() => toggleTask(t.id, t.is_completed)} />
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Completed Tasks */}
        {completed.length > 0 && (
          <div className="pt-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Completed ({completed.length})
            </h2>
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm opacity-70">
              <ul className="divide-y">
                {completed.map(t => (
                  <TaskRow key={t.id} task={t} onToggle={() => toggleTask(t.id, t.is_completed)} />
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {showAddModal && user && (
        <AddTaskModal
          employee={user}
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false)
            qc.invalidateQueries({ queryKey: ['all-user-tasks', user.id] })
            qc.invalidateQueries({ queryKey: ['user-tasks'] })
            qc.invalidateQueries({ queryKey: ['due-tasks'] })
          }}
        />
      )}
    </div>
  )
}

function TaskRow({ task, onToggle }: { task: Task, onToggle: () => void }) {
  const isPastDue = !task.is_completed && new Date(`${task.due_date.split('T')[0]}T${task.due_time}`) < new Date()

  return (
    <li className="p-4 hover:bg-gray-50 transition-colors flex gap-4 cursor-pointer" onClick={onToggle}>
      <div className="mt-0.5 shrink-0 text-gray-400 hover:text-gray-900 transition-colors">
        {task.is_completed ? (
          <CheckSquare size={20} className="text-emerald-500" />
        ) : (
          <Square size={20} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-base font-medium truncate ${task.is_completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
            {task.description}
          </p>
        )}
        <div className="flex items-center gap-4 mt-2">
          <div className={`flex items-center gap-1.5 text-xs font-medium ${isPastDue ? 'text-red-600' : 'text-gray-500'}`}>
            <Calendar size={14} />
            {new Date(task.due_date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
          <div className={`flex items-center gap-1.5 text-xs font-medium ${isPastDue ? 'text-red-600' : 'text-gray-500'}`}>
            <Clock size={14} />
            {task.due_time.substring(0,5)}
          </div>
        </div>
      </div>
    </li>
  )
}
