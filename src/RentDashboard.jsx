import { useState, useMemo } from 'react'
import { ArrowLeft, Building2, Upload, Paperclip, CheckCircle2, History, PlusCircle } from 'lucide-react'
import { useRent } from './hooks/useRent'

export default function RentDashboard({ session }) {
  const userId = session.user.id
  const { properties, tenants, rentLogs, loading, addProperty, addTenant, createRentLog, logRentPayment } = useRent(userId)

  const [activeView, setActiveView] = useState('overview') // 'overview', 'properties', 'ledger'
  
  // Forms
  const [showPropForm, setShowPropForm] = useState(false)
  const [newProp, setNewProp] = useState({ name: '', address: '', property_type: 'Standalone' })
  
  const [showTenantForm, setShowTenantForm] = useState(false)
  const [newTenant, setNewTenant] = useState({ property_id: '', name: '', base_rent: '', advance_paid: '', annual_increment_pct: '5' })

  const [paymentForm, setPaymentForm] = useState({ tenantId: null, amount: '', adjustments: '0', file: null, notes: '' })

  // Current Month String "2026-04"
  const currentMonthDate = new Date()
  const currentMonth = currentMonthDate.toISOString().slice(0, 7)

  // Calculations
  const calculations = useMemo(() => {
    let totalExpected = 0
    let totalCollected = 0
    let totalAdvances = 0

    const enrichedTenants = tenants.map(tenant => {
      totalAdvances += Number(tenant.advance_paid)

      // Calculate rollover balance from previous months
      const tenantLogs = rentLogs.filter(l => l.tenant_id === tenant.id).sort((a,b) => a.month.localeCompare(b.month))
      
      let carryOverDeficit = 0
      
      // Calculate historical deficits strictly up to last month
      tenantLogs.forEach(log => {
        if (log.month < currentMonth) {
           const logBalance = Number(log.amount_expected) - Number(log.amount_paid) + Number(log.adjustments)
           carryOverDeficit += logBalance
        }
      })

      // Current month expectations
      const currentLog = tenantLogs.find(l => l.month === currentMonth)
      
      // The expected amount for this month is their base rent + historical deficit.
      const rawBaseRent = Number(tenant.base_rent)
      const expectedThisMonth = rawBaseRent + carryOverDeficit
      
      let collectedThisMonth = 0
      let status = 'Pending'
      let currentLogId = null
      let proofUrl = null

      if (currentLog) {
        currentLogId = currentLog.id
        collectedThisMonth = Number(currentLog.amount_paid)
        status = currentLog.status // Pending, Partial, Paid
        proofUrl = currentLog.proof_url
      }

      totalExpected += expectedThisMonth
      totalCollected += collectedThisMonth

      return {
        ...tenant,
        carryOverDeficit,
        expectedThisMonth,
        collectedThisMonth,
        currentLogId,
        status,
        proofUrl,
        balance: expectedThisMonth - collectedThisMonth + (currentLog ? Number(currentLog.adjustments) : 0)
      }
    })

    return { enrichedTenants, totalExpected, totalCollected, totalAdvances, totalOutstanding: totalExpected - totalCollected }
    
  }, [tenants, rentLogs, currentMonth])

  const { enrichedTenants, totalExpected, totalCollected, totalAdvances, totalOutstanding } = calculations

  const handleAddProp = (e) => {
    e.preventDefault()
    addProperty(newProp)
    setNewProp({ name: '', address: '', property_type: 'Standalone' })
    setShowPropForm(false)
  }

  const handleAddTenant = (e) => {
    e.preventDefault()
    addTenant({
      ...newTenant,
      base_rent: Number(newTenant.base_rent),
      advance_paid: Number(newTenant.advance_paid),
      annual_increment_pct: Number(newTenant.annual_increment_pct)
    })
    setNewTenant({ property_id: '', name: '', base_rent: '', advance_paid: '', annual_increment_pct: '5' })
    setShowTenantForm(false)
  }

  const submitPayment = async (e) => {
    e.preventDefault()
    const t = enrichedTenants.find(x => x.id === paymentForm.tenantId)
    if (!t) return

    const amtPaid = Number(paymentForm.amount)
    const adj = Number(paymentForm.adjustments)
    const totalPaidSoFar = t.collectedThisMonth + amtPaid
    
    // Determine status
    const expected = t.expectedThisMonth
    let newStatus = 'Pending'
    if (totalPaidSoFar > 0 && totalPaidSoFar < (expected + adj)) newStatus = 'Partial'
    if (totalPaidSoFar >= (expected + adj)) newStatus = 'Paid'

    if (t.currentLogId) {
      // Update existing
      await logRentPayment(t.currentLogId, {
        amount_paid: totalPaidSoFar,
        adjustments: (rentLogs.find(l=>l.id===t.currentLogId)?.adjustments || 0) + adj,
        status: newStatus,
        notes: paymentForm.notes
      }, paymentForm.file)
    } else {
      // Create new
      await createRentLog({
        tenant_id: t.id,
        month: currentMonth,
        amount_expected: expected,
        amount_paid: amtPaid,
        adjustments: adj,
        status: newStatus,
        notes: paymentForm.notes
      }, paymentForm.file)
    }
    
    setPaymentForm({ tenantId: null, amount: '', adjustments: '0', file: null, notes: '' })
  }

  if (loading) return <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center">Loading Real Estate Data...</div>

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans pb-24">
      {/* Header */}
      <header className="px-6 py-6 border-b border-slate-800/60 bg-slate-900/90 backdrop-blur-md sticky top-0 z-10 transition-all flex items-center gap-4">
          <a href="/" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700 active:scale-95">
            <ArrowLeft size={18} />
          </a>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Building2 size={24} className="text-emerald-500" />
              Rent OS
            </h1>
            <p className="text-slate-400 text-sm mt-1">Property Management & Financial Ledger</p>
          </div>
      </header>

      <main className="px-6 mt-6 max-w-5xl mx-auto">
        
        {/* Top Analytics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl">
            <p className="text-slate-400 text-xs mb-1 uppercase tracking-wider font-bold">Expected Revenue</p>
            <h3 className="text-2xl font-black text-white">₹{totalExpected.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-500 mt-1">Includes carry-over deficits</p>
          </div>
          <div className="bg-emerald-900/20 border-l-4 border-l-emerald-500 border border-slate-700/50 p-5 rounded-2xl relative overflow-hidden">
            <p className="text-emerald-400/80 text-xs mb-1 uppercase tracking-wider font-bold">Collected</p>
            <h3 className="text-2xl font-black text-emerald-400">₹{totalCollected.toLocaleString()}</h3>
            <div className="absolute bottom-0 left-0 h-1 bg-emerald-500/20 w-full">
               <div className="h-full bg-emerald-500" style={{width: `${Math.min((totalCollected/(totalExpected||1))*100, 100)}%`}}></div>
            </div>
          </div>
          <div className="bg-rose-900/20 border-l-4 border-l-rose-500 border border-slate-700/50 p-5 rounded-2xl">
            <p className="text-rose-400/80 text-xs mb-1 uppercase tracking-wider font-bold">Outstanding</p>
            <h3 className="text-2xl font-black text-rose-400">₹{totalOutstanding.toLocaleString()}</h3>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl">
            <p className="text-slate-400 text-xs mb-1 uppercase tracking-wider font-bold">Advances Held</p>
            <h3 className="text-xl font-bold text-slate-300">₹{totalAdvances.toLocaleString()}</h3>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex gap-3 mb-8 border-b border-slate-800 pb-4">
           <button onClick={() => setActiveView('overview')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${activeView === 'overview' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'}`}>Active Ledger</button>
           <button onClick={() => setActiveView('properties')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${activeView === 'properties' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'}`}>Properties Manage</button>
        </div>

        {/* VIEW: OVERVIEW / LEDGER */}
        {activeView === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-300">
             {enrichedTenants.map(tenant => {
               const prop = properties.find(p => p.id === tenant.property_id)
               const isPaying = paymentForm.tenantId === tenant.id
               
               return (
                 <div key={tenant.id} className={`bg-slate-800/60 border rounded-3xl p-6 transition-colors ${tenant.balance <= 0 ? 'border-emerald-500/30' : 'border-slate-700'}`}>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-700 text-slate-300">{prop?.name} ({prop?.property_type})</span>
                          {tenant.carryOverDeficit > 0 && <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-400">Deficit Rolled Over</span>}
                        </div>
                        <h3 className="text-xl font-bold text-white">{tenant.name}</h3>
                      </div>
                      <div className="text-right">
                         <p className="text-slate-400 text-xs mb-1">Status</p>
                         <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase
                           ${tenant.status === 'Paid' ? 'bg-emerald-500 text-slate-900' : 
                             tenant.status === 'Partial' ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-400'}`}>
                           {tenant.status}
                         </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                       <div>
                         <p className="text-[10px] text-slate-500 uppercase font-bold">Base Rent</p>
                         <p className="font-mono text-sm">₹{tenant.base_rent}</p>
                       </div>
                       <div>
                         <p className="text-[10px] text-slate-500 uppercase font-bold">Total Expected</p>
                         <p className="font-mono text-sm text-blue-400">₹{tenant.expectedThisMonth}</p>
                       </div>
                       <div>
                         <p className="text-[10px] text-slate-500 uppercase font-bold">Current Balance Due</p>
                         <p className={`font-mono font-bold ${tenant.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                           ₹{tenant.balance}
                         </p>
                       </div>
                    </div>

                    {/* Actions / Form */}
                    {!isPaying && tenant.balance > 0 && (
                      <button onClick={() => setPaymentForm({...paymentForm, tenantId: tenant.id})} className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-semibold py-3 flex items-center justify-center gap-2 rounded-xl transition-all border border-emerald-500/20">
                        <PlusCircle size={18} /> Record Payment
                      </button>
                    )}

                    {isPaying && (
                      <form onSubmit={submitPayment} className="bg-slate-900 p-5 rounded-2xl border border-emerald-500/30 space-y-4 shadow-xl">
                         <h4 className="font-bold text-emerald-400 flex items-center gap-2"><Upload size={16}/> Record Payment</h4>
                         
                         <div className="grid grid-cols-2 gap-4">
                           <div>
                             <label className="text-xs text-slate-400 block mb-1">Amount Given (₹)</label>
                             <input type="number" required value={paymentForm.amount} onChange={e=>setPaymentForm({...paymentForm, amount: e.target.value})} className="w-full bg-slate-800 border-slate-700 rounded-lg px-3 py-2 text-white" />
                           </div>
                           <div>
                             <label className="text-xs text-slate-400 block mb-1">Adjustments (+/-)</label>
                             <input type="number" value={paymentForm.adjustments} onChange={e=>setPaymentForm({...paymentForm, adjustments: e.target.value})} className="w-full bg-slate-800 border-slate-700 rounded-lg px-3 py-2 text-white" placeholder="e.g. -500 for repair" />
                           </div>
                         </div>
                         
                         <div>
                            <label className="text-xs text-slate-400 block mb-1">Attach Proof (Receipt/Screenshot)</label>
                            <input type="file" accept="image/*,.pdf" onChange={e => setPaymentForm({...paymentForm, file: e.target.files[0]})} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20" />
                         </div>

                         <div className="flex gap-2 pt-2">
                           <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-900/20">Save To Ledger</button>
                           <button type="button" onClick={() => setPaymentForm({tenantId: null})} className="px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl transition-all">Cancel</button>
                         </div>
                      </form>
                    )}

                    {tenant.proofUrl && (
                      <div className="mt-4 flex items-center gap-2">
                        <Paperclip size={14} className="text-slate-400" /> 
                        <a href={tenant.proofUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline">View Attached Receipt</a>
                      </div>
                    )}
                 </div>
               )
             })}
             {enrichedTenants.length === 0 && <div className="text-center py-20 text-slate-500">No tenants active. Go to Properties Manage to set them up.</div>}
          </div>
        )}

        {/* VIEW: PROPERTIES BUILDER */}
        {activeView === 'properties' && (
          <div className="space-y-8 animate-in fade-in duration-300">
             
             <div className="grid md:grid-cols-2 gap-8">
                {/* Add Property */}
                <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Building2 size={20}/> Add Building</h3>
                  <form onSubmit={handleAddProp} className="space-y-4">
                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white" placeholder="Name (e.g. Orion Tower)" value={newProp.name} onChange={e=>setNewProp({...newProp, name: e.target.value})} required />
                    <select className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white" value={newProp.property_type} onChange={e=>setNewProp({...newProp, property_type: e.target.value})}>
                      <option>Standalone</option>
                      <option>Commercial</option>
                      <option>Room</option>
                    </select>
                    <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg">Save Property</button>
                  </form>
                </div>

                {/* Add Tenant */}
                <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50">
                  <h3 className="text-xl font-bold mb-4">Add Tenant</h3>
                  <form onSubmit={handleAddTenant} className="space-y-4">
                    <select className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white" value={newTenant.property_id} onChange={e=>setNewTenant({...newTenant, property_id: e.target.value})} required>
                      <option value="">Select Building...</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white" placeholder="Tenant Name / Company" value={newTenant.name} onChange={e=>setNewTenant({...newTenant, name: e.target.value})} required />
                    
                    <div className="grid grid-cols-2 gap-3">
                      <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white" placeholder="Base Rent ₹" value={newTenant.base_rent} onChange={e=>setNewTenant({...newTenant, base_rent: e.target.value})} required />
                      <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white" placeholder="Advance ₹" value={newTenant.advance_paid} onChange={e=>setNewTenant({...newTenant, advance_paid: e.target.value})} />
                    </div>
                    <button disabled={properties.length===0} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg disabled:opacity-50">Assgin Tenant</button>
                  </form>
                </div>
             </div>

          </div>
        )}

      </main>
    </div>
  )
}
