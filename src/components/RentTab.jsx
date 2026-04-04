import { useState } from 'react'

export default function RentTab({ properties, tenants, rentLogs, addProperty, addTenant, createRentLog, logRentPayment }) {
  const [showPropertyForm, setShowPropertyForm] = useState(false)
  const [showTenantForm, setShowTenantForm] = useState(false)

  // Forms
  const [newProp, setNewProp] = useState({ name: '', address: '' })
  const [newTenant, setNewTenant] = useState({ property_id: '', name: '', monthly_rent: '', advance_paid: '' })

  const handleAddProp = (e) => {
    e.preventDefault()
    if (!newProp.name) return
    addProperty(newProp)
    setNewProp({ name: '', address: '' })
    setShowPropertyForm(false)
  }

  const handleAddTenant = (e) => {
    e.preventDefault()
    if (!newTenant.name || !newTenant.property_id) return
    addTenant({
      ...newTenant,
      monthly_rent: Number(newTenant.monthly_rent) || 0,
      advance_paid: Number(newTenant.advance_paid) || 0
    })
    setNewTenant({ property_id: '', name: '', monthly_rent: '', advance_paid: '' })
    setShowTenantForm(false)
  }

  const handlePayRent = (tenant) => {
    // Basic auto-log for current month MVP
    const currentMonth = new Date().toISOString().slice(0, 7) // "YYYY-MM"
    createRentLog({
      tenant_id: tenant.id,
      month: currentMonth,
      amount_paid: tenant.monthly_rent,
      status: 'Paid',
      payment_date: new Date().toISOString()
    })
  }

  // Analytics
  const currentMonth = new Date().toISOString().slice(0, 7)
  const monthlyLogs = rentLogs.filter(l => l.month === currentMonth)
  
  const expectedRent = tenants.reduce((acc, t) => acc + Number(t.monthly_rent), 0)
  const collectedRent = monthlyLogs.reduce((acc, l) => acc + Number(l.amount_paid), 0)
  const outstandingRent = expectedRent - collectedRent
  const totalAdvances = tenants.reduce((acc, t) => acc + Number(t.advance_paid), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl">
          <p className="text-slate-400 text-xs mb-1">Expected this Month</p>
          <h3 className="text-xl font-bold text-white">₹{expectedRent.toLocaleString()}</h3>
        </div>
        <div className="bg-slate-800/40 border-l-4 border-l-green-500 border border-slate-700/50 p-4 rounded-xl">
          <p className="text-slate-400 text-xs mb-1">Collected</p>
          <h3 className="text-xl font-bold text-green-400">₹{collectedRent.toLocaleString()}</h3>
        </div>
        <div className="bg-slate-800/40 border-l-4 border-l-red-500 border border-slate-700/50 p-4 rounded-xl">
          <p className="text-slate-400 text-xs mb-1">Outstanding</p>
          <h3 className="text-xl font-bold text-red-400">₹{outstandingRent.toLocaleString()}</h3>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl">
          <p className="text-slate-400 text-xs mb-1">Total Advances Held</p>
          <h3 className="text-xl font-bold text-blue-400">₹{totalAdvances.toLocaleString()}</h3>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <button onClick={() => setShowPropertyForm(!showPropertyForm)} className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-600/30 transition-colors">
          + Add Building/Property
        </button>
        <button onClick={() => setShowTenantForm(!showTenantForm)} className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-600/30 transition-colors disabled:opacity-50" disabled={properties.length === 0}>
          + Add Tenant
        </button>
      </div>

      {showPropertyForm && (
        <form onSubmit={handleAddProp} className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-4">
          <h4 className="font-bold text-white mb-2">New Property</h4>
          <input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" placeholder="Property Name (e.g., Block A)" value={newProp.name} onChange={e => setNewProp({...newProp, name: e.target.value})} required />
          <input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" placeholder="Location Details" value={newProp.address} onChange={e => setNewProp({...newProp, address: e.target.value})} />
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm w-full font-bold">Save Property</button>
        </form>
      )}

      {showTenantForm && (
        <form onSubmit={handleAddTenant} className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-4">
          <h4 className="font-bold text-white mb-2">New Tenant</h4>
          <select className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" value={newTenant.property_id} onChange={e => setNewTenant({...newTenant, property_id: e.target.value})} required>
            <option value="">Select Building</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" placeholder="Tenant Name / Unit #" value={newTenant.name} onChange={e => setNewTenant({...newTenant, name: e.target.value})} required />
          <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" placeholder="Monthly Rent Expected (₹)" value={newTenant.monthly_rent} onChange={e => setNewTenant({...newTenant, monthly_rent: e.target.value})} required />
          <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" placeholder="Advance Deposit Taken (₹)" value={newTenant.advance_paid} onChange={e => setNewTenant({...newTenant, advance_paid: e.target.value})} />
          <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm w-full font-bold">Save Tenant</button>
        </form>
      )}

      {/* Buildings & Tenants List */}
      <div className="space-y-6">
        {properties.map(property => {
          const propertyTenants = tenants.filter(t => t.property_id === property.id)
          return (
            <div key={property.id} className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                🏠 {property.name}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {propertyTenants.map(tenant => {
                  const hasPaidThisMonth = monthlyLogs.some(l => l.tenant_id === tenant.id && l.status === 'Paid')
                  
                  return (
                    <div key={tenant.id} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-blue-400">{tenant.name}</h4>
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${hasPaidThisMonth ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {hasPaidThisMonth ? '✓ Paid' : '! Pending'}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400 space-y-1 mb-4">
                        <p>Rent: <span className="text-white font-mono">₹{tenant.monthly_rent}</span>/mo</p>
                        <p>Advance: <span className="text-white font-mono">₹{tenant.advance_paid}</span></p>
                      </div>

                      {!hasPaidThisMonth && (
                        <button 
                          onClick={() => handlePayRent(tenant)}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
                        >
                          Mark Rent Paid
                        </button>
                      )}
                    </div>
                  )
                })}
                {propertyTenants.length === 0 && (
                  <p className="text-slate-500 text-sm italic col-span-full">No tenants added to this building yet.</p>
                )}
              </div>
            </div>
          )
        })}
        {properties.length === 0 && (
          <div className="text-center py-10 border border-dashed border-slate-700 rounded-2xl">
            <p className="text-slate-500 mb-2">Start by adding a building to track rent!</p>
          </div>
        )}
      </div>
    </div>
  )
}
