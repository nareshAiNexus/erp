import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { Plus, Monitor, Cpu, Box, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { SortingState } from '@tanstack/react-table'
import { dbQuery } from '../../lib/dbClient'
import { AssetFormModal } from '../../components/inventory/AssetFormModal'

export const Route = createFileRoute('/inventory/')({
  component: InventoryBoard,
})

type Asset = {
  id: number
  asset_tag: string | null
  category: 'system' | 'electronics' | 'other'
  asset_type: string
  model_name: string | null
  operating_system: string | null
  ram: string | null
  storage_raw: string | null
  processor: string | null
  working_condition: string | null
  other_product_name_id: number | null
  quantity: number | null
  status: string
}

const columnHelper = createColumnHelper<Asset>()

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ChevronUp size={13} className="ml-1 inline-block opacity-70" />
  if (sorted === 'desc') return <ChevronDown size={13} className="ml-1 inline-block opacity-70" />
  return <ChevronsUpDown size={12} className="ml-1 inline-block opacity-30" />
}

function InventoryBoard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'system' | 'electronics' | 'other'>('system')
  const [showAddModal, setShowAddModal] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])

  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ['assets', activeTab],
    queryFn: async () => {
      const res = await dbQuery('SELECT * FROM assets WHERE category = $1 ORDER BY id DESC', [activeTab])
      return res as Asset[]
    }
  })

  const columns = useMemo(() => {
    const baseColumns = [
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
      columnHelper.accessor('asset_tag', {
        header: 'Asset Tag',
        enableSorting: true,
        cell: info => info.getValue() || <span style={{ color: 'var(--text-tertiary)' }} className="italic">Untagged</span>,
      }),
      columnHelper.accessor('asset_type', {
        header: 'Type',
        enableSorting: true,
        cell: info => <span className="capitalize">{info.getValue()}</span>,
      }),
      columnHelper.accessor('model_name', {
        header: 'Model',
        enableSorting: true,
        cell: info => info.getValue() || '-',
      }),
      columnHelper.accessor('status', {
        enableSorting: true,
        header: 'Status',
        cell: info => (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
            info.getValue() === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
            info.getValue() === 'in_repair' ? 'bg-orange-50 text-orange-700 border-orange-200' :
            'bg-gray-100 text-gray-600 border-gray-200'
          }`}>
            {info.getValue().toUpperCase()}
          </span>
        ),
      }),
    ]

    if (activeTab === 'system') {
      return [
        ...baseColumns,
        columnHelper.accessor('processor', { header: 'Processor', enableSorting: true, cell: info => info.getValue() || '-' }),
        columnHelper.accessor('ram', { header: 'RAM', enableSorting: true, cell: info => info.getValue() ? `${info.getValue()} GB` : '-' }),
        columnHelper.accessor('storage_raw', { header: 'Storage', enableSorting: true, cell: info => info.getValue() || '-' }),
        columnHelper.accessor('operating_system', { header: 'OS', enableSorting: true, cell: info => info.getValue() || '-' }),
      ]
    } else if (activeTab === 'electronics') {
      return [
        ...baseColumns,
        columnHelper.accessor('working_condition', {
          header: 'Condition',
          cell: info => (
            <span className={`capitalize ${info.getValue() === 'working' ? 'text-green-600' : 'text-orange-600'}`}>
              {info.getValue()?.replace('_', ' ') || '-'}
            </span>
          )
        }),
      ]
    } else {
      return [
        columnHelper.accessor('asset_type', {
          header: 'Item',
          cell: info => <span className="capitalize">{info.getValue()}</span>,
        }),
        columnHelper.accessor('quantity', {
          header: 'Quantity',
          cell: info => info.getValue() || '-',
        }),
      ]
    }
  }, [activeTab])

  const table = useReactTable({
    data: assets,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const tabBtn = (tab: typeof activeTab, label: string, Icon: any) => (
    <button
      onClick={() => { setActiveTab(tab); setSorting([]) }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
      style={{
        background: activeTab === tab ? 'var(--bg-hover)' : 'transparent',
        color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontWeight: activeTab === tab ? 600 : 400,
      }}
    >
      <Icon size={15} />
      {label}
    </button>
  )

  return (
    <div className="fade-in max-w-[1400px] mx-auto h-[calc(100vh-100px)] flex flex-col">
      <div className="mb-5 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Inventory</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Track and manage company assets</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg)' }}
        >
          <Plus size={15} />
          Add Asset
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 pb-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        {tabBtn('system', 'Systems', Monitor)}
        {tabBtn('electronics', 'Electronics', Cpu)}
        {tabBtn('other', 'Other', Box)}
      </div>

      <div className="flex-1 rounded-xl border overflow-hidden flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
        <div className="overflow-x-auto flex-1 custom-scrollbar relative">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-hover)' }}>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider select-none"
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
                    Loading assets...
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    No {activeTab} assets found.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    onClick={() => navigate({ to: `/inventory/${row.original.id}` })}
                    className="border-b last:border-b-0 cursor-pointer transition-colors"
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

      {showAddModal && (
        <AssetFormModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  )
}
