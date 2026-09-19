import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { Plus, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { SortingState } from '@tanstack/react-table'
import { dbQuery } from '../../lib/dbClient'
import { NewAuditModal } from '../../components/inventory/NewAuditModal'

export const Route = createFileRoute('/audits/')({
  component: AuditsBoard,
})

type Audit = {
  id: number
  asset_id: number
  asset_tag: string
  asset_type: string
  audit_date: string
  auditor: string
  department_at_audit: string
  allotted_employee_at_audit: string
  condition_at_audit: string
}

const columnHelper = createColumnHelper<Audit>()

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ChevronUp size={13} className="inline-block opacity-70" />
  if (sorted === 'desc') return <ChevronDown size={13} className="inline-block opacity-70" />
  return <ChevronsUpDown size={12} className="inline-block opacity-30" />
}

function AuditsBoard() {
  const [showNewAudit, setShowNewAudit] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'audit_date', desc: true }])

  const { data: audits = [], isLoading } = useQuery<Audit[]>({
    queryKey: ['audits'],
    queryFn: async () => {
      const res = await dbQuery(`
        SELECT au.*, a.asset_tag, a.asset_type 
        FROM audits au 
        JOIN assets a ON au.asset_id = a.id 
        ORDER BY au.audit_date DESC, au.id DESC
      `)
      return res as Audit[]
    }
  })

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'row_num',
      header: '#',
      enableSorting: false,
      cell: info => (
        <span style={{ color: 'var(--text-tertiary)' }} className="tabular-nums">
          {info.row.index + 1}
        </span>
      ),
    }),
    columnHelper.accessor('audit_date', {
      header: 'Date',
      enableSorting: true,
      cell: info => {
        const d = new Date(info.getValue())
        return <span className="tabular-nums">{d.toLocaleDateString('en-GB')}</span>
      },
    }),
    columnHelper.accessor('asset_tag', {
      header: 'Asset Tag',
      enableSorting: true,
      cell: info => info.getValue() || <span style={{ color: 'var(--text-tertiary)' }} className="italic">Untagged</span>,
    }),
    columnHelper.accessor('asset_type', {
      header: 'Asset Type',
      enableSorting: true,
      cell: info => <span className="capitalize">{info.getValue()}</span>,
    }),
    columnHelper.accessor('auditor', {
      header: 'Auditor',
      enableSorting: true,
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('allotted_employee_at_audit', {
      header: 'User at Audit',
      enableSorting: true,
      cell: info => info.getValue() || <span style={{ color: 'var(--text-tertiary)' }}>Unassigned</span>,
    }),
    columnHelper.accessor('department_at_audit', {
      header: 'Department',
      enableSorting: true,
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('condition_at_audit', {
      header: 'Condition',
      enableSorting: true,
      cell: info => {
        const val = info.getValue()
        return (
          <span className={`capitalize text-sm ${val === 'working' ? 'text-green-600' : val ? 'text-orange-600' : ''}`}>
            {val?.replace('_', ' ') || '-'}
          </span>
        )
      },
    }),
  ], [])

  const table = useReactTable({
    data: audits,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="fade-in max-w-[1400px] mx-auto h-[calc(100vh-100px)] flex flex-col">
      <div className="mb-5 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Audit Logs</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Record and review asset audits</p>
        </div>
        <button
          onClick={() => setShowNewAudit(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg)' }}
        >
          <Plus size={15} />
          New Audit
        </button>
      </div>

      <div
        className="flex-1 rounded-xl border overflow-hidden flex flex-col"
        style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
      >
        <div className="overflow-x-auto flex-1 custom-scrollbar relative">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-hover)' }}>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider"
                      style={{
                        color: 'var(--text-tertiary)',
                        cursor: header.column.getCanSort() ? 'pointer' : 'default',
                        userSelect: 'none',
                        width: header.id === 'row_num' ? '48px' : undefined,
                      }}
                      onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <span className="flex items-center gap-1">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <SortIcon sorted={header.column.getIsSorted()} />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    Loading audits...
                  </td>
                </tr>
              ) : audits.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    No audits found.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    className="border-b last:border-b-0 transition-colors"
                    style={{ borderColor: 'var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-5 py-3.5 text-sm" style={{ color: 'var(--text-primary)' }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showNewAudit && (
        <NewAuditModal onClose={() => setShowNewAudit(false)} />
      )}
    </div>
  )
}
