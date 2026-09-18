/**
 * Policies page — admin view.
 *
 * - Shows all policies grouped by category
 * - "+ Add Policy" button in the header (admin only)
 * - Modal to create a new policy (title, category, version, effective_date, content)
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, ChevronRight, Plus, X } from 'lucide-react'
import { useState } from 'react'
import type { Policy } from '../../lib/types'
import { dbQuery } from '../../lib/dbClient'
import { useAuth } from '../../lib/AuthContext'

export const getPoliciesFn = async () => {
  const rows = await dbQuery('SELECT * FROM policies ORDER BY category, title')
  return rows as Policy[]
}

export const Route = createFileRoute('/policies/')({ component: PoliciesList })

const categoryConfig: Record<string, { label: string; bg: string; text: string }> = {
  hr:         { label: 'Human Resources', bg: '#dbeafe', text: '#1e40af' },
  it:         { label: 'IT',              bg: '#f3e8ff', text: '#7e22ce' },
  finance:    { label: 'Finance',         bg: '#dcfce7', text: '#166534' },
  operations: { label: 'Operations',      bg: '#fff7ed', text: '#9a3412' },
  security:   { label: 'Security',        bg: '#fee2e2', text: '#991b1b' },
  general:    { label: 'General',         bg: '#f3f4f6', text: '#374151' },
}

// ─── Add Policy Modal ─────────────────────────────────────────────────────────

function AddPolicyModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: '',
    category: 'general',
    version: '1.0',
    effective_date: '',
    content: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }))

  const handleSubmit = async () => {
    if (!form.title.trim()) return setError('Title is required')
    setSaving(true)
    setError(null)
    try {
      await dbQuery(
        `INSERT INTO policies (title, category, version, effective_date, content)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          form.title.trim(),
          form.category,
          form.version.trim() || '1.0',
          form.effective_date || null,
          form.content.trim() || null,
        ]
      )
      onSaved()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full px-3 py-2 rounded-lg border text-sm'
  const inpS = { borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text-primary)' }
  const lbl = 'text-xs font-medium mb-1.5 block'
  const lblS = { color: 'var(--text-secondary)' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay"
      style={{ background: 'rgba(0,0,0,0.3)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border modal-panel shadow-xl"
        style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b sticky top-0 z-10"
          style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
        >
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            Add Policy
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--bg-hover)]">
            <X size={15} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-lg text-xs" style={{ background: '#fee2e2', color: '#991b1b' }}>
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className={lbl} style={lblS}>Title <span style={{ color: '#991b1b' }}>*</span></label>
            <input
              id="policy-title"
              className={inp} style={inpS}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Remote Work Policy"
            />
          </div>

          {/* Category + Version */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl} style={lblS}>Category</label>
              <select className={inp} style={inpS} value={form.category} onChange={(e) => set('category', e.target.value)}>
                <option value="hr">Human Resources</option>
                <option value="it">IT</option>
                <option value="finance">Finance</option>
                <option value="operations">Operations</option>
                <option value="security">Security</option>
                <option value="general">General</option>
              </select>
            </div>
            <div>
              <label className={lbl} style={lblS}>Version</label>
              <input
                className={inp} style={inpS}
                value={form.version}
                onChange={(e) => set('version', e.target.value)}
                placeholder="1.0"
              />
            </div>
          </div>

          {/* Effective date */}
          <div>
            <label className={lbl} style={lblS}>Effective Date (optional)</label>
            <input
              type="date"
              className={inp} style={inpS}
              value={form.effective_date}
              onChange={(e) => set('effective_date', e.target.value)}
            />
          </div>

          {/* Content */}
          <div>
            <label className={lbl} style={lblS}>Content (optional)</label>
            <textarea
              className={inp} style={inpS}
              rows={5}
              value={form.content}
              onChange={(e) => set('content', e.target.value)}
              placeholder="Policy details, rules, guidelines..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg text-xs font-medium border"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
            <button
              id="add-policy-submit"
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 py-2 rounded-lg text-xs font-medium text-white"
              style={{ background: 'var(--text-primary)' }}
            >
              {saving ? 'Adding...' : 'Add Policy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Policies List ────────────────────────────────────────────────────────────

function PoliciesList() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)

  const { data: policies, isLoading } = useQuery({
    queryKey: ['policies'],
    queryFn: () => getPoliciesFn(),
  })

  const byCategory = (policies ?? []).reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {} as Record<string, Policy[]>)

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Policies
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Company policies and guidelines
          </p>
        </div>

        {/* Add button — admin only */}
        {user?.auth_role === 'admin' && (
          <button
            id="add-policy-btn"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'var(--text-primary)' }}
          >
            <Plus size={14} />
            Add Policy
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-12 text-center" style={{ color: 'var(--text-tertiary)' }}>
          Loading policies...
        </div>
      ) : (policies ?? []).length === 0 ? (
        <div className="py-16 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3"
            style={{ background: 'var(--bg-subtle)' }}>
            <FileText size={20} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No policies yet</p>
          {user?.auth_role === 'admin' && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-3 text-xs underline"
              style={{ color: 'var(--text-secondary)' }}
            >
              Add the first policy
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byCategory).map(([category, items]) => {
            const cfg = categoryConfig[category] ?? categoryConfig.general
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                    style={{ background: cfg.bg, color: cfg.text }}
                  >
                    {cfg.label}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {items.length} {items.length === 1 ? 'policy' : 'policies'}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {items.map((policy) => (
                    <Link
                      key={policy.id}
                      to="/policies/$policyId"
                      params={{ policyId: policy.id }}
                      className="block p-4 rounded-xl border hover:bg-[var(--bg-subtle)] transition-all"
                      style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-3">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: cfg.bg }}
                          >
                            <FileText size={16} style={{ color: cfg.text }} />
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                              {policy.title}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                              Version {policy.version}
                              {policy.effective_date ? ` · Effective ${policy.effective_date}` : ''}
                            </p>
                          </div>
                        </div>
                        <ChevronRight size={15} style={{ color: 'var(--text-tertiary)' }} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Policy modal */}
      {showModal && (
        <AddPolicyModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false)
            queryClient.invalidateQueries({ queryKey: ['policies'] })
          }}
        />
      )}
    </div>
  )
}
