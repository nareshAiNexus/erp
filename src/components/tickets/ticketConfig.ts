/**
 * Shared ticket constants, helpers, and mini-components.
 * Imported by both TicketBoard (admin) and UserTickets (user).
 */
import type { TicketPriority, TicketStatus, TicketCategory } from '../../lib/types'

// ─── Status config ────────────────────────────────────────────────────────────

export const STATUSES: TicketStatus[] = ['new', 'open', 'pending', 'resolved', 'closed']

export const STATUS_CFG: Record<TicketStatus, { label: string; bg: string; text: string; border: string }> = {
  new:      { label: 'New',      bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  open:     { label: 'Open',     bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  pending:  { label: 'Pending',  bg: '#fefce8', text: '#a16207', border: '#fde68a' },
  resolved: { label: 'Resolved', bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
  closed:   { label: 'Closed',   bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' },
}

// ─── Priority config ──────────────────────────────────────────────────────────

export const PRIORITY_CFG: Record<TicketPriority, { label: string; color: string; dot: string }> = {
  low:      { label: 'Low',      color: '#6b7280', dot: '#9ca3af' },
  medium:   { label: 'Medium',   color: '#d97706', dot: '#f59e0b' },
  high:     { label: 'High',     color: '#dc2626', dot: '#ef4444' },
  critical: { label: 'Critical', color: '#7c3aed', dot: '#8b5cf6' },
}

// ─── Category config ──────────────────────────────────────────────────────────

export const CATEGORY_CFG: Record<TicketCategory, { label: string; bg: string; text: string }> = {
  general: { label: 'General', bg: '#f3f4f6', text: '#374151' },
  hr:      { label: 'HR',      bg: '#dbeafe', text: '#1e40af' },
  it:      { label: 'IT',      bg: '#f3e8ff', text: '#7e22ce' },
  payroll: { label: 'Payroll', bg: '#dcfce7', text: '#166534' },
  leave:   { label: 'Leave',   bg: '#fce7f3', text: '#9d174d' },
  billing: { label: 'Billing', bg: '#fff7ed', text: '#9a3412' },
  other:   { label: 'Other',   bg: '#f1f5f9', text: '#475569' },
}

// ─── Avatar helper ────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#c7d2fe','#a7f3d0','#fde68a','#fbcfe8','#bfdbfe','#d1fae5']

export function avatarBg(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + (h << 5) - h
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

// ─── Time helper ──────────────────────────────────────────────────────────────

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
