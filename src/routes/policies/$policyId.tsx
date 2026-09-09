import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import type { Policy } from '../../lib/types'
import { dbQuery } from '../../lib/dbClient'

export const getPolicyFn = async ({ data: id }: { data: string }) => {
  const rows = await dbQuery('SELECT * FROM policies WHERE id = $1', [id])
  return (rows.length > 0 ? rows[0] : null) as Policy | null
}

export const Route = createFileRoute('/policies/$policyId')({ component: PolicyDetail })

const categoryConfig: Record<string, { label: string; bg: string; text: string }> = {
  hr: { label: 'Human Resources', bg: '#e3f2fd', text: '#1565c0' },
  it: { label: 'IT', bg: '#f3e5f5', text: '#7b1fa2' },
  finance: { label: 'Finance', bg: '#e8f5e9', text: '#2e7d32' },
  operations: { label: 'Operations', bg: '#fff3e0', text: '#e65100' },
  security: { label: 'Security', bg: '#ffebee', text: '#c62828' },
  general: { label: 'General', bg: '#f5f5f5', text: '#616161' },
}

function PolicyDetail() {
  const { policyId } = Route.useParams()

  const { data: policy, isLoading } = useQuery({
    queryKey: ['policy', policyId],
    queryFn: () => getPolicyFn({ data: policyId }),
  })

  if (isLoading) {
    return (
      <div className="py-12 text-center" style={{ color: 'var(--text-tertiary)' }}>
        Loading policy...
      </div>
    )
  }

  if (!policy) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Policy not found</p>
        <Link to="/policies" className="text-sm mt-2 inline-block" style={{ color: 'var(--text-secondary)' }}>
          Back to policies
        </Link>
      </div>
    )
  }

  const cfg = categoryConfig[policy.category] ?? categoryConfig.general

  return (
    <div className="fade-in">
      <Link
        to="/policies"
        className="inline-flex items-center gap-1 text-xs mb-4"
        style={{ color: 'var(--text-secondary)' }}
      >
        <ArrowLeft size={13} /> Back to Policies
      </Link>

      <div className="mb-6">
        <span className="text-xs px-2 py-0.5 rounded font-medium mb-3 inline-block" style={{ background: cfg.bg, color: cfg.text }}>
          {cfg.label}
        </span>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          {policy.title}
        </h1>
        <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <span>Version {policy.version}</span>
          <span>·</span>
          <span>Effective {policy.effective_date ?? '—'}</span>
          <span>·</span>
          <span>Updated {new Date(policy.last_updated).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="prose prose-sm max-w-none">
        <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>
          {policy.content}
        </p>
      </div>
    </div>
  )
}
