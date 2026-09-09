import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle, Package } from 'lucide-react'
import type { InventoryItem } from '../../lib/types'
import { dbQuery } from '../../lib/dbClient'

export const getInventoryFn = async () => {
  const rows = await dbQuery('SELECT * FROM inventory_items ORDER BY name')
  return rows as InventoryItem[]
}

export const deleteInventoryItemFn = async ({ data: id }: { data: string }) => {
  await dbQuery('DELETE FROM inventory_items WHERE id = $1', [id])
}

export const saveInventoryItemFn = async ({ data: payload }: { data: any }) => {
  if (payload.id) {
    await dbQuery(`
      UPDATE inventory_items SET
        name = $1, sku = $2, category = $3, quantity = $4, unit_price = $5,
        reorder_level = $6, supplier = $7, location = $8
      WHERE id = $9
    `, [
      payload.name, payload.sku, payload.category, payload.quantity, payload.unit_price,
      payload.reorder_level, payload.supplier, payload.location, payload.id
    ])
  } else {
    await dbQuery(`
      INSERT INTO inventory_items (
        name, sku, category, quantity, unit_price, reorder_level, supplier, location
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      payload.name, payload.sku, payload.category, payload.quantity, payload.unit_price,
      payload.reorder_level, payload.supplier, payload.location
    ])
  }
}

export const Route = createFileRoute('/inventory/')({ component: InventoryPage })

function InventoryPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)

  const { data: items, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => getInventoryFn(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInventoryItemFn({ data: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['low-stock'] })
    },
  })

  const lowStock = (items ?? []).filter((i) => i.quantity <= i.reorder_level)
  const totalValue = (items ?? []).reduce((sum, i) => sum + i.quantity * i.unit_price, 0)

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Inventory
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {items?.length ?? 0} items · Total value ${totalValue.toFixed(2)}
          </p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowForm(true) }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium text-white"
          style={{ background: 'var(--text-primary)' }}
        >
          <Plus size={15} /> Add Item
        </button>
      </div>

      {lowStock.length > 0 && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-lg mb-4 text-sm"
          style={{ background: '#fff3e0', color: '#e65100' }}
        >
          <AlertTriangle size={16} />
          <span>
            {lowStock.length} item{lowStock.length > 1 ? 's' : ''} at or below reorder level
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center" style={{ color: 'var(--text-tertiary)' }}>
          Loading inventory...
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                <th className="text-left text-xs font-semibold px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Item</th>
                <th className="text-left text-xs font-semibold px-4 py-3" style={{ color: 'var(--text-secondary)' }}>SKU</th>
                <th className="text-left text-xs font-semibold px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Category</th>
                <th className="text-right text-xs font-semibold px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Qty</th>
                <th className="text-right text-xs font-semibold px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Unit Price</th>
                <th className="text-left text-xs font-semibold px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Supplier</th>
                <th className="text-right text-xs font-semibold px-4 py-3" style={{ color: 'var(--text-secondary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((item) => {
                const isLow = item.quantity <= item.reorder_level
                return (
                  <tr key={item.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                          style={{ background: 'var(--bg-subtle)' }}
                        >
                          <Package size={14} style={{ color: 'var(--text-secondary)' }} />
                        </div>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                      {item.sku}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                      {item.category}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: isLow ? '#e65100' : 'var(--text-primary)' }}
                      >
                        {item.quantity}
                      </span>
                      {isLow && (
                        <span className="text-xs ml-1" style={{ color: '#e65100' }}>(low)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm" style={{ color: 'var(--text-primary)' }}>
                      ${item.unit_price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {item.supplier}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setEditingItem(item); setShowForm(true) }}
                          className="p-1.5 rounded hover:bg-[var(--bg-hover)]"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete ${item.name}?`)) {
                              deleteMutation.mutate(item.id)
                            }
                          }}
                          className="p-1.5 rounded hover:bg-[var(--bg-hover)]"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <InventoryForm
          item={editingItem}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            queryClient.invalidateQueries({ queryKey: ['inventory'] })
            queryClient.invalidateQueries({ queryKey: ['low-stock'] })
          }}
        />
      )}
    </div>
  )
}

type FormProps = {
  item: InventoryItem | null
  onClose: () => void
  onSaved: () => void
}

function InventoryForm({ item, onClose, onSaved }: FormProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: item?.name ?? '',
    sku: item?.sku ?? '',
    category: item?.category ?? 'General',
    quantity: item?.quantity?.toString() ?? '0',
    unit_price: item?.unit_price?.toString() ?? '0',
    reorder_level: item?.reorder_level?.toString() ?? '10',
    supplier: item?.supplier ?? '',
    location: item?.location ?? '',
  })

  const set = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      id: item?.id,
      name: form.name,
      sku: form.sku || null,
      category: form.category,
      quantity: parseInt(form.quantity) || 0,
      unit_price: parseFloat(form.unit_price) || 0,
      reorder_level: parseInt(form.reorder_level) || 10,
      supplier: form.supplier || null,
      location: form.location || null,
    }

    try {
      await saveInventoryItemFn({ data: payload })
      setSaving(false)
      onSaved()
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 rounded-md border text-sm'
  const inputStyle = { borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text-primary)' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay"
      style={{ background: 'rgba(0,0,0,0.3)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg border modal-panel"
        style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            {item ? 'Edit Item' : 'Add Item'}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-hover)]">
            <Trash2 size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-md text-xs" style={{ background: '#ffebee', color: '#c62828' }}>
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Name</label>
              <input className={inputClass} style={inputStyle} value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>SKU</label>
              <input className={inputClass} style={inputStyle} value={form.sku} onChange={(e) => set('sku', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Quantity</label>
              <input type="number" className={inputClass} style={inputStyle} value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Unit Price</label>
              <input type="number" step="0.01" className={inputClass} style={inputStyle} value={form.unit_price} onChange={(e) => set('unit_price', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Reorder At</label>
              <input type="number" className={inputClass} style={inputStyle} value={form.reorder_level} onChange={(e) => set('reorder_level', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Category</label>
              <input className={inputClass} style={inputStyle} value={form.category} onChange={(e) => set('category', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Location</label>
              <input className={inputClass} style={inputStyle} value={form.location} onChange={(e) => set('location', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Supplier</label>
            <input className={inputClass} style={inputStyle} value={form.supplier} onChange={(e) => set('supplier', e.target.value)} />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium border" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-md text-sm font-medium text-white" style={{ background: 'var(--text-primary)' }}>
              {saving ? 'Saving...' : item ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
