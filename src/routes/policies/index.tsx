import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { FileText, ChevronRight } from 'lucide-react'
import type { Policy } from '../../lib/types'
import { dbQuery } from '../../lib/dbClient'

export const getPoliciesFn = async () => {
  const rows = await dbQuery('SELECT * FROM policies ORDER BY category')
  return rows as Policy[]
}

export const Route = createFileRoute('/policies/')({ component: PoliciesList })

const categoryConfig: Record<string, { label: string; bg: string; text: string }> = {
  hr: { label: 'Human Resources', bg: '#e3f2fd', text: '#1565c0' },
  it: { label: 'IT', bg: '#f3e5f5', text: '#7b1fa2' },
  finance: { label: 'Finance', bg: '#e8f5e9', text: '#2e7d32' },
  operations: { label: 'Operations', bg: '#fff3e0', text: '#e65100' },
  security: { label: 'Security', bg: '#ffebee', text: '#c62828' },
  general: { label: 'General', bg: '#f5f5f5', text: '#616161' },
}

function PoliciesList() {
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
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Policies
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Company policies and guidelines
        </p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center" style={{ color: 'var(--text-tertiary)' }}>
          Loading policies...
        </div>
      ) : (policies ?? []).length === 0 ? (
        <div className="py-16 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg mb-3" style={{ background: 'var(--bg-subtle)' }}>
            <FileText size={20} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            No policies found
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byCategory).map(([category, items]) => {
            const cfg = categoryConfig[category] ?? categoryConfig.general
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: cfg.bg, color: cfg.text }}>
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
                      className="block p-4 rounded-lg border hover:bg-[var(--bg-subtle)] transition-all"
                      style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-3">
                          <div
                            className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
                            style={{ background: cfg.bg }}
                          >
                            <FileText size={16} style={{ color: cfg.text }} />
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                              {policy.title}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                              Version {policy.version} · Effective {policy.effective_date ?? '—'}
                            </p>
                          </div>
                        </div>
                        <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
