import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { dbQuery } from '../../lib/dbClient'

export function AssetFormModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [category, setCategory] = useState<'system'|'electronics'|'other'>('system')
  const [assetTag, setAssetTag] = useState('')
  const [assetType, setAssetType] = useState('')
  const [modelName, setModelName] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  
  // system
  const [os, setOs] = useState('')
  const [ram, setRam] = useState('')
  const [storage, setStorage] = useState('')
  const [processor, setProcessor] = useState('')
  
  // electronics
  const [condition, setCondition] = useState('working')
  
  // other
  const [productNameId, setProductNameId] = useState('')
  const [newProductName, setNewProductName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [isNewProduct, setIsNewProduct] = useState(false)

  const { data: productNames = [] } = useQuery({
    queryKey: ['product_names'],
    queryFn: async () => {
      const res = await dbQuery('SELECT * FROM other_product_names ORDER BY name')
      return res
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    
    try {
      let finalProductId = productNameId

      if (category === 'other' && isNewProduct && newProductName) {
        const res = await dbQuery('INSERT INTO other_product_names (name, is_custom) VALUES ($1, true) RETURNING id', [newProductName])
        finalProductId = res[0].id
      }

      const payload = {
        category,
        asset_tag: assetTag || null,
        asset_type: assetType,
        model_name: modelName || null,
        purchase_date: purchaseDate || null,
        operating_system: category === 'system' ? os : null,
        ram: category === 'system' ? ram : null,
        storage_raw: category === 'system' ? storage : null,
        processor: category === 'system' ? processor : null,
        working_condition: category === 'electronics' ? condition : null,
        other_product_name_id: category === 'other' ? parseInt(finalProductId) : null,
        quantity: category === 'other' ? parseFloat(quantity) : null
      }

      const response = await fetch('/api/inventory/asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      qc.invalidateQueries({ queryKey: ['assets'] })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save asset')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    borderColor: 'var(--border)',
    background: 'var(--bg)',
    color: 'var(--text-primary)',
  }
  const inputCls = "w-full px-3 py-2.5 border rounded-lg text-sm outline-none transition-colors"
  const labelCls = "block text-[11px] font-medium mb-1.5"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-sm fade-in"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-lg border"
        style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b shrink-0 flex items-center justify-between"
          style={{ borderColor: 'var(--border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Add New Asset</h2>
          <button
            onClick={onClose}
            className="text-sm leading-none transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {error && (
            <div className="mb-4 p-3 text-sm rounded-lg border" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-hover)' }}>
              {error}
            </div>
          )}

          <form id="asset-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>Category</label>
                <select className={inputCls} style={inputStyle} value={category} onChange={e => setCategory(e.target.value as any)}>
                  <option value="system">System</option>
                  <option value="electronics">Electronics</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>Asset Tag <span style={{ color: 'var(--text-tertiary)' }}>(optional for Other)</span></label>
                <input required={category !== 'other'} className={inputCls} style={inputStyle} value={assetTag} onChange={e => setAssetTag(e.target.value)} placeholder="FAS_123" />
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>Asset Type</label>
                <input required className={inputCls} style={inputStyle} value={assetType} onChange={e => setAssetType(e.target.value)} placeholder="laptop, printer, etc." />
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>Model Name</label>
                <input className={inputCls} style={inputStyle} value={modelName} onChange={e => setModelName(e.target.value)} placeholder="HP Pavilion..." />
              </div>
            </div>

            <div className="border-t pt-5" style={{ borderColor: 'var(--border)' }}>
              <p className="text-[11px] font-medium mb-4 capitalize" style={{ color: 'var(--text-secondary)' }}>{category} details</p>

              {category === 'system' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>Operating System</label>
                    <input required className={inputCls} style={inputStyle} value={os} onChange={e => setOs(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>RAM (GB)</label>
                    <input required type="number" className={inputCls} style={inputStyle} value={ram} onChange={e => setRam(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>Storage</label>
                    <input required className={inputCls} style={inputStyle} value={storage} onChange={e => setStorage(e.target.value)} placeholder="1 TB SSD" />
                  </div>
                  <div>
                    <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>Processor</label>
                    <input required className={inputCls} style={inputStyle} value={processor} onChange={e => setProcessor(e.target.value)} />
                  </div>
                </div>
              )}

              {category === 'electronics' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>Working Condition</label>
                    <select className={inputCls} style={inputStyle} value={condition} onChange={e => setCondition(e.target.value)}>
                      <option value="working">Working</option>
                      <option value="not_working">Not Working</option>
                      <option value="in_repair">In Repair</option>
                    </select>
                  </div>
                </div>
              )}

              {category === 'other' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>Product Name</label>
                    {isNewProduct ? (
                      <div className="flex gap-2">
                        <input
                          required autoFocus
                          className={inputCls} style={inputStyle}
                          placeholder="Custom name"
                          value={newProductName}
                          onChange={e => setNewProductName(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setIsNewProduct(false)}
                          className="px-3 border rounded-lg text-xs"
                          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <select
                        required className={inputCls} style={inputStyle}
                        value={productNameId}
                        onChange={e => {
                          if (e.target.value === 'new') setIsNewProduct(true)
                          else setProductNameId(e.target.value)
                        }}
                      >
                        <option value="">Select a product...</option>
                        {productNames.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        <option value="new">+ Add new product</option>
                      </select>
                    )}
                  </div>
                  <div>
                    <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>Quantity</label>
                    <input required type="number" step="any" className={inputCls} style={inputStyle} value={quantity} onChange={e => setQuantity(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t shrink-0 flex gap-3 justify-end" style={{ borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] font-medium border transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="asset-form"
            disabled={saving}
            className="px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
            style={{ background: 'var(--text-primary)', color: 'var(--bg)' }}
          >
            {saving ? 'Saving...' : 'Add Asset'}
          </button>
        </div>
      </div>
    </div>
  )
}
