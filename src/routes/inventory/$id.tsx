import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ArrowLeft, Key, Clock, Shield, ShieldAlert, Monitor, User } from 'lucide-react'
import { dbQuery } from '../../lib/dbClient'
import { useAuth } from '../../lib/AuthContext'
import { EditAssetModal } from '../../components/inventory/EditAssetModal'

export const Route = createFileRoute('/inventory/$id')({
  component: AssetDetail,
})

function AssetDetail() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [showCreds, setShowCreds] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  // 1. Fetch asset details
  const { data: asset, isLoading } = useQuery({
    queryKey: ['asset', id],
    queryFn: async () => {
      const res = await dbQuery('SELECT a.*, e.first_name, e.last_name FROM assets a LEFT JOIN employees e ON a.allotted_employee_id = e.id WHERE a.id = $1', [id])
      const row = res[0]
      if (row) {
        row.owner_name = row.first_name ? `${row.first_name} ${row.last_name}` : null
      }
      return row
    }
  })

  // 2. Fetch audits timeline
  const { data: audits = [] } = useQuery({
    queryKey: ['asset-audits', id],
    queryFn: async () => {
      const res = await dbQuery('SELECT * FROM audits WHERE asset_id = $1 ORDER BY audit_date DESC, id DESC', [id])
      return res
    }
  })

  // 3. Fetch credentials (secure)
  const { data: creds, error: credsError } = useQuery({
    queryKey: ['asset-creds', id],
    queryFn: async () => {
      const response = await fetch('/api/inventory/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_id: id, user_id: user?.id })
      })
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      return data.data
    },
    retry: false,
    enabled: !!user?.id
  })

  if (isLoading) return <div className="p-10 text-gray-500">Loading asset...</div>
  if (!asset) return <div className="p-10 text-red-500">Asset not found.</div>

  return (
    <div className="fade-in max-w-4xl mx-auto h-[calc(100vh-100px)] overflow-y-auto pb-20 custom-scrollbar">
      <button onClick={() => navigate({ to: '/inventory' })} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 font-medium transition-colors">
        <ArrowLeft size={16} /> Back to Inventory
      </button>

      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between mb-6 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{asset.model_name || asset.asset_type}</h1>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                asset.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
              }`}>{asset.status}</span>
            </div>
            <p className="text-sm text-gray-500 font-mono">{asset.asset_tag || 'UNTAGGED'} · {asset.category}</p>
          </div>
          <button 
            onClick={() => setShowEdit(true)} 
            className="px-4 py-2 rounded-lg text-sm font-medium border text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Edit Details
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {asset.category === 'system' && (
            <>
              <div><p className="text-xs text-gray-500 mb-1">Processor</p><p className="text-sm font-medium">{asset.processor || '-'}</p></div>
              <div><p className="text-xs text-gray-500 mb-1">RAM</p><p className="text-sm font-medium">{asset.ram ? `${asset.ram} GB` : '-'}</p></div>
              <div><p className="text-xs text-gray-500 mb-1">Storage</p><p className="text-sm font-medium">{asset.storage_raw || '-'}</p></div>
              <div><p className="text-xs text-gray-500 mb-1">OS</p><p className="text-sm font-medium">{asset.operating_system || '-'}</p></div>
            </>
          )}
          {asset.category === 'electronics' && (
            <div><p className="text-xs text-gray-500 mb-1">Condition</p><p className="text-sm font-medium capitalize">{asset.working_condition?.replace('_', ' ') || '-'}</p></div>
          )}
          {asset.category === 'other' && (
            <div><p className="text-xs text-gray-500 mb-1">Quantity</p><p className="text-sm font-medium">{asset.quantity || '-'}</p></div>
          )}
          <div><p className="text-xs text-gray-500 mb-1">Allotted To</p><p className="text-sm font-medium flex items-center gap-2"><User size={14}/> {asset.owner_name || 'Unassigned'}</p></div>
          <div><p className="text-xs text-gray-500 mb-1">Purchase Date</p><p className="text-sm font-medium">{asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : '-'}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Key size={18} className="text-blue-600"/> Credentials</h2>
            {!credsError && (
              <button onClick={() => setShowCreds(!showCreds)} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                {showCreds ? 'Hide' : 'Reveal'}
              </button>
            )}
          </div>
          
          {credsError ? (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3 text-sm">
              <ShieldAlert size={18} />
              {credsError.message}
            </div>
          ) : !creds ? (
            <p className="text-sm text-gray-500 italic">No credentials stored for this asset.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">System Username</p>
                <p className="text-sm font-mono bg-gray-50 p-2 rounded border">{creds.username || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">System Password</p>
                <p className="text-sm font-mono bg-gray-50 p-2 rounded border">{showCreds ? (creds.password || '-') : '••••••••••••'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Outlook Account</p>
                <p className="text-sm font-mono bg-gray-50 p-2 rounded border">{creds.outlook_account || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Office Account</p>
                <p className="text-sm font-mono bg-gray-50 p-2 rounded border">{creds.office_account || '-'}</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Clock size={18} className="text-orange-500"/> Audit Timeline</h2>
          
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
            {audits.length === 0 ? (
              <p className="text-sm text-gray-500 italic text-center w-full relative z-10">No audits found.</p>
            ) : (
              audits.map((audit: any, idx: number) => (
                <div key={audit.id} className="relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-orange-500 border-4 border-white shadow flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-semibold text-gray-900">{new Date(audit.audit_date).toLocaleDateString()}</span>
                        <span className="text-xs font-medium text-gray-500">by {audit.auditor}</span>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 border" style={{ borderColor: 'var(--border)' }}>
                        <p><span className="font-medium">Condition:</span> {audit.condition_at_audit?.replace('_', ' ') || '-'}</p>
                        <p><span className="font-medium">User:</span> {audit.allotted_employee_at_audit || 'Unassigned'}</p>
                        {audit.observations && <p className="mt-1 text-gray-600"><span className="font-medium text-gray-800">Note:</span> {audit.observations}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {showEdit && <EditAssetModal asset={asset} onClose={() => setShowEdit(false)} />}
    </div>
  )
}
