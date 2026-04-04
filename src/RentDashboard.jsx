import { useState, useMemo } from 'react'
import { ArrowLeft, Building2, Upload, Paperclip, PlusCircle, Pencil, Trash2, CalendarDays, ChevronLeft, ChevronRight, X, Check, UserX, UserCheck } from 'lucide-react'
import { useRent } from './hooks/useRent'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function calcRentForYear(baseRent, pct, moveIn, year) {
  const from = new Date(moveIn).getFullYear()
  return Math.round(baseRent * Math.pow(1 + pct / 100, Math.max(0, year - from)))
}
function effRentForMonth(tenant, monthStr) {
  if (!tenant.move_in_date) return Number(tenant.base_rent)
  return calcRentForYear(Number(tenant.base_rent), Number(tenant.annual_increment_pct || 0), tenant.move_in_date, parseInt(monthStr))
}

// ── Inline Edit Row for Tenant ─────────────────────────────────────────────
function TenantEditForm({ tenant, properties, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: tenant.name, property_id: tenant.property_id,
    base_rent: tenant.base_rent, advance_paid: tenant.advance_paid,
    annual_increment_pct: tenant.annual_increment_pct || 0,
    move_in_date: tenant.move_in_date || '', is_active: tenant.is_active !== false
  })
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="space-y-3 bg-slate-900 p-4 rounded-2xl border border-blue-500/30">
      <p className="text-xs font-bold text-blue-400 mb-2">Editing: {tenant.name}</p>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="text-[10px] text-slate-400 block mb-1">Name</label>
          <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" /></div>
        <div><label className="text-[10px] text-slate-400 block mb-1">Building</label>
          <select value={form.property_id} onChange={e=>setForm({...form,property_id:e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm">
            {properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select></div>
        <div><label className="text-[10px] text-slate-400 block mb-1">Base Rent ₹</label>
          <input type="number" value={form.base_rent} onChange={e=>setForm({...form,base_rent:e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" /></div>
        <div><label className="text-[10px] text-slate-400 block mb-1">Advance ₹</label>
          <input type="number" value={form.advance_paid} onChange={e=>setForm({...form,advance_paid:e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" /></div>
        <div><label className="text-[10px] text-slate-400 block mb-1">Increment %/yr</label>
          <input type="number" step="0.5" value={form.annual_increment_pct} onChange={e=>setForm({...form,annual_increment_pct:e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" /></div>
        <div><label className="text-[10px] text-slate-400 block mb-1">Move-in Date</label>
          <input type="date" value={form.move_in_date} onChange={e=>setForm({...form,move_in_date:e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" /></div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.is_active} onChange={e=>setForm({...form,is_active:e.target.checked})} className="w-4 h-4 accent-emerald-500" />
        <span className="text-sm text-slate-300">Tenant is Active</span>
      </label>
      <div className="flex gap-2"><button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-xl text-sm"><Check size={14} className="inline mr-1"/>Save</button>
        <button type="button" onClick={onCancel} className="px-4 bg-slate-700 text-white rounded-xl text-sm">Cancel</button></div>
    </form>
  )
}

// ── Inline Edit for Property ───────────────────────────────────────────────
function PropEditForm({ prop, onSave, onCancel }) {
  const [form, setForm] = useState({ name: prop.name, address: prop.address || '', property_type: prop.property_type })
  return (
    <form onSubmit={e=>{e.preventDefault();onSave(form)}} className="space-y-2 mt-3 bg-slate-900 p-3 rounded-xl border border-blue-500/30">
      <div className="grid grid-cols-2 gap-2">
        <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Building name" className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs" />
        <select value={form.property_type} onChange={e=>setForm({...form,property_type:e.target.value})} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs">
          <option>Standalone</option><option>Commercial</option><option>Room</option>
        </select>
      </div>
      <input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Address" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs" />
      <div className="flex gap-2"><button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-1.5 rounded-lg text-xs"><Check size={12} className="inline mr-1"/>Save</button>
        <button type="button" onClick={onCancel} className="px-3 bg-slate-700 text-white rounded-lg text-xs">Cancel</button></div>
    </form>
  )
}

// ── Calendar Month Pay Modal ───────────────────────────────────────────────
function CalModal({ modal, onClose, onSubmit }) {
  const { tenant, monthStr, existingLog } = modal
  const [amount, setAmount] = useState('')
  const [adj, setAdj] = useState('0')
  const [notes, setNotes] = useState(existingLog?.notes || '')
  const [file, setFile] = useState(null)
  const [markPaid, setMarkPaid] = useState(false)

  const effExp = effRentForMonth(tenant, monthStr)
  const alreadyPaid = existingLog ? Number(existingLog.amount_paid) : 0
  const remaining = effExp - alreadyPaid - Number(existingLog?.adjustments || 0)

  const handleSubmit = (e) => {
    e.preventDefault()
    const payAmt = markPaid ? Math.max(remaining, 0) : Number(amount)
    onSubmit({ amount: payAmt, adj: Number(adj), notes, file, existingLog, monthStr, tenant })
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">{tenant.name}</h3>
            <p className="text-emerald-400 text-sm font-mono">{monthStr}</p>
            <p className="text-slate-500 text-xs mt-0.5">Expected: ₹{effExp.toLocaleString()}</p>
            {alreadyPaid > 0 && <p className="text-amber-400 text-xs">Already logged: ₹{alreadyPaid.toLocaleString()}</p>}
            {remaining > 0 && <p className="text-rose-400 text-xs">Still due: ₹{remaining.toLocaleString()}</p>}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1 rounded-lg"><X size={20}/></button>
        </div>

        {existingLog?.status === 'Paid' ? (
          <div className="text-center py-3">
            <p className="text-emerald-400 font-bold text-lg mb-1">✓ Fully Paid</p>
            <p className="text-slate-400 text-sm">₹{alreadyPaid.toLocaleString()} collected</p>
            {existingLog.notes && <p className="text-slate-500 text-xs mt-1 italic">{existingLog.notes}</p>}
            {existingLog.proof_url && <a href={existingLog.proof_url} target="_blank" rel="noreferrer" className="text-blue-400 text-xs flex items-center gap-1 justify-center mt-2"><Paperclip size={12}/> View Receipt</a>}
            <button onClick={onClose} className="mt-4 w-full bg-slate-800 text-white py-2.5 rounded-xl font-semibold text-sm">Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Quick-mark-paid toggle */}
            <label className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl cursor-pointer">
              <input type="checkbox" checked={markPaid} onChange={e=>setMarkPaid(e.target.checked)} className="w-4 h-4 accent-emerald-500"/>
              <span className="text-emerald-400 text-sm font-semibold">Mark as Fully Paid (₹{Math.max(remaining,0).toLocaleString()})</span>
            </label>
            {!markPaid && (
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-slate-400 block mb-1">Amount (₹)</label>
                  <input type="number" required value={amount} onChange={e=>setAmount(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm" placeholder="e.g. 5000"/></div>
                <div><label className="text-xs text-slate-400 block mb-1">Adjustment (+/-)</label>
                  <input type="number" value={adj} onChange={e=>setAdj(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm" placeholder="-500"/></div>
              </div>
            )}
            <div><label className="text-xs text-slate-400 block mb-1">Notes (Cash/UPI/Cheque)</label>
              <input value={notes} onChange={e=>setNotes(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm" placeholder="Optional"/></div>
            <div><label className="text-xs text-slate-400 block mb-1">Attach Receipt</label>
              <input type="file" accept="image/*,.pdf" onChange={e=>setFile(e.target.files[0])} className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/10 file:text-emerald-400"/></div>
            <div className="flex gap-2 pt-1">
              <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-sm">Save to Ledger</button>
              <button type="button" onClick={onClose} className="px-4 bg-slate-800 text-white font-bold py-3 rounded-xl text-sm">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function RentDashboard({ session }) {
  const userId = session.user.id
  const { properties, tenants, rentLogs, loading, addProperty, updateProperty, deleteProperty, addTenant, updateTenant, deleteTenant, logRentPayment, createRentLog, deleteRentLog } = useRent(userId)

  const [activeView, setActiveView] = useState('overview')
  const [showInactive, setShowInactive] = useState(false)
  const [editTenantId, setEditTenantId] = useState(null)
  const [editPropId, setEditPropId] = useState(null)
  const [calModal, setCalModal] = useState(null)
  const [calYear, setCalYear] = useState(new Date().getFullYear())

  const [newProp, setNewProp] = useState({ name: '', address: '', property_type: 'Standalone' })
  const [newTenant, setNewTenant] = useState({ property_id: '', name: '', base_rent: '', advance_paid: '', annual_increment_pct: '5', move_in_date: new Date().toISOString().slice(0,10) })

  const today = new Date()
  const currentMonth = today.toISOString().slice(0, 7)
  const [payForm, setPayForm] = useState({ tenantId: null, month: currentMonth, amount: '', adjustments: '0', file: null, notes: '' })
  const [editLog, setEditLog] = useState(null)

  // ── Tenants split ──────────────────────────────────────────────────────
  const activeTenants = tenants.filter(t => t.is_active !== false)
  const inactiveTenants = tenants.filter(t => t.is_active === false)
  const displayedTenants = showInactive ? inactiveTenants : activeTenants

  // ── Overview calculations ──────────────────────────────────────────────
  const calculations = useMemo(() => {
    let totalExpected = 0, totalCollected = 0, totalAdvances = 0
    const enriched = activeTenants.map(tenant => {
      totalAdvances += Number(tenant.advance_paid)
      const tLogs = rentLogs.filter(l => l.tenant_id === tenant.id).sort((a,b) => a.month.localeCompare(b.month))
      let deficit = 0
      tLogs.forEach(log => {
        if (log.month < currentMonth) {
          deficit += effRentForMonth(tenant, log.month) - Number(log.amount_paid) - Number(log.adjustments)
        }
      })
      const effRent = effRentForMonth(tenant, currentMonth)
      const expectedThisMonth = effRent + Math.max(0, deficit)
      const curLog = tLogs.find(l => l.month === currentMonth)
      const paid = curLog ? Number(curLog.amount_paid) : 0
      const adjThisMonth = curLog ? Number(curLog.adjustments) : 0
      totalExpected += expectedThisMonth
      totalCollected += paid
      return { ...tenant, effRent, expectedThisMonth, collectedThisMonth: paid, currentLogId: curLog?.id || null, status: curLog?.status || 'Pending', proofUrl: curLog?.proof_url || null, balance: expectedThisMonth - paid - adjThisMonth, carryOverDeficit: deficit, tenantLogs: tLogs }
    })
    return { enriched, totalExpected, totalCollected, totalAdvances, totalOutstanding: totalExpected - totalCollected }
  }, [activeTenants, rentLogs, currentMonth])

  const { enriched, totalExpected, totalCollected, totalAdvances, totalOutstanding } = calculations

  // ── Calendar data ──────────────────────────────────────────────────────
  const calData = useMemo(() => tenants.map(tenant => {
    const prop = properties.find(p => p.id === tenant.property_id)
    const months = MONTHS.map((label, idx) => {
      const monthStr = `${calYear}-${String(idx + 1).padStart(2, '0')}`
      const log = rentLogs.find(l => l.tenant_id === tenant.id && l.month === monthStr)
      const isFuture = monthStr > currentMonth
      let status = 'none'
      if (isFuture) status = 'future'
      else if (log?.status === 'Paid') status = 'paid'
      else if (log?.status === 'Partial') status = 'partial'
      else status = 'unpaid'
      return { label, monthStr, status, log }
    })
    return { tenant, prop, months }
  }), [tenants, rentLogs, calYear, properties, currentMonth])

  // ── Payment submit (Active Ledger) ──────────────────────────────────────
  const submitPayment = async (e) => {
    e.preventDefault()
    const t = enriched.find(x => x.id === payForm.tenantId)
    if (!t) return
    const amt = Number(payForm.amount), adj = Number(payForm.adjustments)
    const eff = effRentForMonth(t, payForm.month)
    const existing = rentLogs.find(l => l.tenant_id === t.id && l.month === payForm.month)
    const totalPaid = (existing ? Number(existing.amount_paid) : 0) + amt
    const status = totalPaid <= 0 ? 'Pending' : totalPaid >= eff - adj ? 'Paid' : 'Partial'
    if (existing) await logRentPayment(existing.id, { amount_paid: totalPaid, adjustments: Number(existing.adjustments) + adj, status, notes: payForm.notes }, payForm.file)
    else await createRentLog({ tenant_id: t.id, month: payForm.month, amount_expected: eff, amount_paid: amt, adjustments: adj, status, notes: payForm.notes }, payForm.file)
    setPayForm({ tenantId: null, month: currentMonth, amount: '', adjustments: '0', file: null, notes: '' })
  }

  // ── Calendar modal submit ─────────────────────────────────────────────
  const submitCalPayment = async ({ amount, adj, notes, file, existingLog, monthStr, tenant }) => {
    const eff = effRentForMonth(tenant, monthStr)
    const totalPaid = (existingLog ? Number(existingLog.amount_paid) : 0) + amount
    const totalAdj = (existingLog ? Number(existingLog.adjustments) : 0) + adj
    const status = totalPaid <= 0 ? 'Pending' : totalPaid >= eff - totalAdj ? 'Paid' : 'Partial'
    if (existingLog) await logRentPayment(existingLog.id, { amount_paid: totalPaid, adjustments: totalAdj, status, notes }, file)
    else await createRentLog({ tenant_id: tenant.id, month: monthStr, amount_expected: eff, amount_paid: amount, adjustments: adj, status, notes }, file)
    setCalModal(null)
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    await logRentPayment(editLog.id, { amount_paid: Number(editLog.amount_paid), adjustments: Number(editLog.adjustments), notes: editLog.notes, status: Number(editLog.amount_paid) <= 0 ? 'Pending' : 'Partial' })
    setEditLog(null)
  }

  const cellStyle = (s) => {
    if (s === 'paid') return 'bg-emerald-500 text-slate-900 hover:bg-emerald-400 cursor-pointer'
    if (s === 'partial') return 'bg-amber-400 text-slate-900 hover:bg-amber-300 cursor-pointer'
    if (s === 'unpaid') return 'bg-rose-500/80 text-white hover:bg-rose-500 cursor-pointer'
    if (s === 'future') return 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'
    return 'bg-slate-700 text-slate-400 cursor-pointer hover:bg-slate-600'
  }

  const TABS = [['overview','Ledger','📋'],['calendar','Calendar','📅'],['properties','Manage','🏠']]

  if (loading) return (
    <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center">
      <Building2 size={40} className="text-emerald-400 animate-pulse" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans flex">
      {calModal && <CalModal modal={calModal} onClose={() => setCalModal(null)} onSubmit={submitCalPayment} />}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-slate-900/80 border-r border-slate-800 sticky top-0 h-screen shrink-0 p-5">
        <div className="flex items-center gap-3 mb-8">
          <a href="/" className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"><ArrowLeft size={14}/></a>
          <div><p className="text-xs font-black text-emerald-400 tracking-wider uppercase">Rent OS</p><p className="text-[10px] text-slate-500">Life OS</p></div>
        </div>
        <nav className="space-y-1 flex-1">
          {TABS.map(([v, label, icon]) => (
            <button key={v} onClick={() => setActiveView(v)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${activeView === v ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800'}`}>
              <span>{icon}</span> {label}
            </button>
          ))}
        </nav>
        <a href="/" className="flex items-center gap-2 text-slate-500 hover:text-rose-400 text-sm font-semibold px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors"><ArrowLeft size={16}/> Back to Hub</a>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col pb-20 md:pb-0 overflow-auto">
        <header className="px-5 py-4 border-b border-slate-800/60 bg-slate-900/90 backdrop-blur-md sticky top-0 z-10 flex items-center gap-4">
          <a href="/" className="md:hidden w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700 active:scale-95"><ArrowLeft size={18}/></a>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2"><Building2 size={22} className="text-emerald-500"/> Rent OS</h1>
            <p className="text-slate-400 text-xs mt-0.5">Property Management & Financial Ledger</p>
          </div>
        </header>

        <main className="px-5 mt-5 max-w-6xl w-full mx-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              ['Expected', `₹${totalExpected.toLocaleString()}`, 'text-white', 'bg-slate-800/40 border-slate-700/50'],
              ['Collected', `₹${totalCollected.toLocaleString()}`, 'text-emerald-400', 'bg-emerald-900/20 border-l-4 border-l-emerald-500 border-slate-700/50'],
              ['Outstanding', `₹${totalOutstanding.toLocaleString()}`, 'text-rose-400', 'bg-rose-900/20 border-l-4 border-l-rose-500 border-slate-700/50'],
              ['Advances', `₹${totalAdvances.toLocaleString()}`, 'text-slate-300', 'bg-slate-800/40 border-slate-700/50']
            ].map(([label, val, color, bg]) => (
              <div key={label} className={`${bg} border p-4 rounded-2xl`}>
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">{label}</p>
                <h3 className={`text-xl font-black ${color}`}>{val}</h3>
              </div>
            ))}
          </div>

          {/* Mobile tabs */}
          <div className="md:hidden flex gap-2 mb-5 border-b border-slate-800 pb-4 overflow-x-auto">
            {TABS.map(([v,label]) => (
              <button key={v} onClick={() => setActiveView(v)} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${activeView===v?'bg-emerald-500/20 text-emerald-400':'text-slate-400 hover:text-white'}`}>{label}</button>
            ))}
          </div>

          {/* ── OVERVIEW ── */}
          {activeView === 'overview' && (
            <div className="pb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-300">{showInactive ? 'Inactive Tenants' : `Active Tenants (${activeTenants.length})`}</h2>
                <button onClick={() => setShowInactive(s => !s)} className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-colors ${showInactive ? 'bg-slate-700 text-slate-300' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                  {showInactive ? 'Show Active' : `Inactive (${inactiveTenants.length})`}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {(showInactive ? inactiveTenants : enriched).map(tenant => {
                  const t = showInactive ? tenant : tenant
                  const prop = properties.find(p => p.id === t.property_id)
                  const isPaying = payForm.tenantId === t.id
                  const isEditing = editTenantId === t.id

                  return (
                    <div key={t.id} className={`bg-slate-800/60 border rounded-3xl p-5 transition-colors ${!showInactive && t.balance<=0 ? 'border-emerald-500/30' : 'border-slate-700'} ${showInactive ? 'opacity-60' : ''}`}>
                      {isEditing ? (
                        <TenantEditForm tenant={t} properties={properties}
                          onSave={async (form) => { await updateTenant(t.id, { ...form, base_rent: Number(form.base_rent), advance_paid: Number(form.advance_paid), annual_increment_pct: Number(form.annual_increment_pct) }); setEditTenantId(null) }}
                          onCancel={() => setEditTenantId(null)} />
                      ) : (
                        <>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="flex flex-wrap gap-1.5 mb-1">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-700 text-slate-300">{prop?.name} · {prop?.property_type}</span>
                                {!showInactive && t.carryOverDeficit > 0 && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400">Deficit Rolled</span>}
                              </div>
                              <h3 className="text-lg font-bold text-white">{t.name}</h3>
                              {t.annual_increment_pct > 0 && <p className="text-[10px] text-emerald-400 mt-0.5">{t.annual_increment_pct}%/yr · ₹{showInactive ? Number(t.base_rent).toLocaleString() : t.effRent.toLocaleString()}/mo</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              {!showInactive && <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${t.status==='Paid'?'bg-emerald-500 text-slate-900':t.status==='Partial'?'bg-amber-500 text-slate-900':'bg-slate-700 text-slate-400'}`}>{t.status}</span>}
                              <button onClick={() => setEditTenantId(t.id)} className="text-slate-500 hover:text-blue-400 transition-colors p-1"><Pencil size={14}/></button>
                              <button onClick={() => updateTenant(t.id, { is_active: t.is_active === false })} className="text-slate-500 hover:text-amber-400 transition-colors p-1" title={t.is_active===false ? 'Reactivate' : 'Deactivate'}>
                                {t.is_active===false ? <UserCheck size={15}/> : <UserX size={15}/>}
                              </button>
                              <button onClick={() => { if(confirm(`Delete ${t.name}?`)) deleteTenant(t.id) }} className="text-slate-500 hover:text-rose-400 transition-colors p-1"><Trash2 size={14}/></button>
                            </div>
                          </div>

                          {!showInactive && (
                            <>
                              <div className="grid grid-cols-3 gap-3 mb-4 bg-slate-900/50 p-3 rounded-2xl border border-slate-800 text-sm">
                                <div><p className="text-[10px] text-slate-500 uppercase font-bold">Eff. Rent</p><p className="font-mono">₹{t.effRent.toLocaleString()}</p></div>
                                <div><p className="text-[10px] text-slate-500 uppercase font-bold">Total Due</p><p className="font-mono text-blue-400">₹{t.expectedThisMonth.toLocaleString()}</p></div>
                                <div><p className="text-[10px] text-slate-500 uppercase font-bold">Balance</p><p className={`font-mono font-bold ${t.balance>0?'text-rose-400':'text-emerald-400'}`}>₹{t.balance.toLocaleString()}</p></div>
                              </div>
                              {!isPaying && <button onClick={() => setPayForm({...payForm, tenantId: t.id, month: currentMonth})} className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-semibold py-2.5 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 mb-3 transition-all"><PlusCircle size={16}/> Record Payment</button>}
                              {isPaying && (
                                <form onSubmit={submitPayment} className="bg-slate-900 p-4 rounded-2xl border border-emerald-500/30 space-y-3 shadow-xl mb-3">
                                  <h4 className="font-bold text-emerald-400 text-sm flex items-center gap-2"><Upload size={14}/> Record Payment</h4>
                                  <div><label className="text-xs text-slate-400 block mb-1">Month / Year</label>
                                    <input type="month" required value={payForm.month} onChange={e=>setPayForm({...payForm,month:e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"/></div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div><label className="text-xs text-slate-400 block mb-1">Amount (₹)</label><input type="number" required value={payForm.amount} onChange={e=>setPayForm({...payForm,amount:e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"/></div>
                                    <div><label className="text-xs text-slate-400 block mb-1">Adjust (+/-)</label><input type="number" value={payForm.adjustments} onChange={e=>setPayForm({...payForm,adjustments:e.target.value})} placeholder="-500" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"/></div>
                                  </div>
                                  <div><label className="text-xs text-slate-400 block mb-1">Notes</label><input value={payForm.notes} onChange={e=>setPayForm({...payForm,notes:e.target.value})} placeholder="Cash/UPI" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"/></div>
                                  <div><label className="text-xs text-slate-400 block mb-1">Attach Proof</label><input type="file" accept="image/*,.pdf" onChange={e=>setPayForm({...payForm,file:e.target.files[0]})} className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/10 file:text-emerald-400"/></div>
                                  <div className="flex gap-2"><button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-sm">Save</button>
                                    <button type="button" onClick={()=>setPayForm({tenantId:null,month:currentMonth,amount:'',adjustments:'0',file:null,notes:''})} className="px-4 bg-slate-800 text-white font-bold py-2.5 rounded-xl text-sm">Cancel</button></div>
                                </form>
                              )}
                              {t.tenantLogs.length > 0 && (
                                <details className="mt-2">
                                  <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 select-none">History ({t.tenantLogs.length} records)</summary>
                                  <div className="mt-3 space-y-2">
                                    {t.tenantLogs.map(log => {
                                      const isEd = editLog?.id === log.id
                                      return (
                                        <div key={log.id} className="bg-slate-900 rounded-xl p-3 border border-slate-800">
                                          {isEd ? (
                                            <form onSubmit={handleSaveEdit} className="space-y-2">
                                              <div className="grid grid-cols-2 gap-2">
                                                <div><label className="text-[10px] text-slate-500">Amount</label><input type="number" value={editLog.amount_paid} onChange={e=>setEditLog({...editLog,amount_paid:e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs"/></div>
                                                <div><label className="text-[10px] text-slate-500">Adj</label><input type="number" value={editLog.adjustments} onChange={e=>setEditLog({...editLog,adjustments:e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs"/></div>
                                              </div>
                                              <input value={editLog.notes||''} placeholder="Notes" onChange={e=>setEditLog({...editLog,notes:e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs"/>
                                              <div className="flex gap-2"><button type="submit" className="flex-1 bg-blue-600 text-white text-xs rounded-lg py-1.5 font-bold">Save</button><button type="button" onClick={()=>setEditLog(null)} className="px-3 bg-slate-700 text-white text-xs rounded-lg py-1.5">Cancel</button></div>
                                            </form>
                                          ) : (
                                            <div className="flex justify-between items-center">
                                              <div>
                                                <div className="flex items-center gap-2"><span className="text-xs font-mono font-bold text-white">{log.month}</span>
                                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${log.status==='Paid'?'bg-emerald-500/20 text-emerald-400':log.status==='Partial'?'bg-amber-500/20 text-amber-400':'bg-slate-700 text-slate-400'}`}>{log.status}</span></div>
                                                <p className="text-[10px] text-slate-400">Paid ₹{Number(log.amount_paid).toLocaleString()}{Number(log.adjustments)!==0&&` · Adj ${Number(log.adjustments)>0?'+':''}${Number(log.adjustments)}`}{log.notes&&` · ${log.notes}`}</p>
                                                {log.proof_url && <a href={log.proof_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 flex items-center gap-1 mt-0.5"><Paperclip size={10}/> Receipt</a>}
                                              </div>
                                              <div className="flex gap-2"><button onClick={()=>setEditLog({id:log.id,amount_paid:log.amount_paid,adjustments:log.adjustments,notes:log.notes})} className="text-slate-500 hover:text-blue-400"><Pencil size={14}/></button><button onClick={()=>deleteRentLog(log.id)} className="text-slate-500 hover:text-rose-400"><Trash2 size={14}/></button></div>
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </details>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
                {displayedTenants.length === 0 && <div className="col-span-2 text-center py-20 text-slate-500 border border-dashed border-slate-700 rounded-3xl">{showInactive ? 'No inactive tenants.' : 'No active tenants. Go to Manage → Add Tenant.'}</div>}
              </div>
            </div>
          )}

          {/* ── YEARLY CALENDAR ── */}
          {activeView === 'calendar' && (
            <div className="space-y-6 pb-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div><h2 className="text-lg font-bold text-white flex items-center gap-2"><CalendarDays size={20} className="text-emerald-400"/> Annual Tracker</h2>
                  <p className="text-slate-500 text-xs mt-0.5">Tap any month to log or view payment</p></div>
                <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2">
                  <button onClick={()=>setCalYear(y=>y-1)} className="text-slate-400 hover:text-white"><ChevronLeft size={18}/></button>
                  <span className="text-white font-bold text-sm px-2">{calYear}</span>
                  <button onClick={()=>setCalYear(y=>y+1)} className="text-slate-400 hover:text-white"><ChevronRight size={18}/></button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-[10px] font-bold uppercase">
                {[['bg-emerald-500','Paid'],['bg-amber-400','Partial'],['bg-rose-500/80','Unpaid'],['bg-slate-800','Future']].map(([cls,label])=>(
                  <span key={label} className="flex items-center gap-1.5"><span className={`w-3 h-3 rounded-sm ${cls}`}/><span className="text-slate-400">{label}</span></span>
                ))}
              </div>
              {calData.map(({ tenant, prop, months }) => (
                <div key={tenant.id} className={`bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 ${tenant.is_active===false ? 'opacity-50' : ''}`}>
                  <div className="flex justify-between items-center mb-4">
                    <div><h3 className="font-bold text-white flex items-center gap-2">{tenant.name}{tenant.is_active===false && <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-400">Inactive</span>}</h3>
                      <p className="text-[10px] text-slate-500">{prop?.name} · {prop?.property_type}</p></div>
                    <div className="text-right text-xs text-slate-400">
                      <p>Base: ₹{Number(tenant.base_rent).toLocaleString()}</p>
                      <p className="text-emerald-400">{calYear}: ₹{calcRentForYear(Number(tenant.base_rent), Number(tenant.annual_increment_pct||0), tenant.move_in_date||`${calYear}-01-01`, calYear).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
                    {months.map(({ label, monthStr, status, log }) => (
                      <div key={monthStr} className="relative group">
                        <button onClick={() => status !== 'future' && setCalModal({ tenant, monthStr, existingLog: log || null })} disabled={status==='future'}
                          className={`w-full rounded-lg py-2.5 text-[10px] font-bold text-center transition-all active:scale-95 ${cellStyle(status)}`}>
                          {label}
                        </button>
                        {log && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-[10px] text-slate-300 whitespace-nowrap z-40 opacity-0 group-hover:opacity-100 pointer-events-none shadow-xl">
                            ₹{Number(log.amount_paid).toLocaleString()} {log.status}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {calData.length === 0 && <div className="text-center py-20 text-slate-500 border border-dashed border-slate-700 rounded-3xl">Add tenants to see calendar.</div>}
            </div>
          )}

          {/* ── MANAGE PROPERTIES & TENANTS ── */}
          {activeView === 'properties' && (
            <div className="space-y-8 pb-6 animate-in fade-in duration-300">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Add Property */}
                <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Building2 size={18}/> Add Building</h3>
                  <form onSubmit={e=>{e.preventDefault();addProperty(newProp);setNewProp({name:'',address:'',property_type:'Standalone'})}} className="space-y-3">
                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" placeholder="Building name" value={newProp.name} onChange={e=>setNewProp({...newProp,name:e.target.value})} required/>
                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" placeholder="Address" value={newProp.address} onChange={e=>setNewProp({...newProp,address:e.target.value})}/>
                    <select className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" value={newProp.property_type} onChange={e=>setNewProp({...newProp,property_type:e.target.value})}>
                      <option>Standalone</option><option>Commercial</option><option>Room</option>
                    </select>
                    <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-sm">Save Building</button>
                  </form>
                </div>
                {/* Add Tenant */}
                <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50">
                  <h3 className="text-lg font-bold mb-4">Add Tenant</h3>
                  <form onSubmit={e=>{e.preventDefault();addTenant({...newTenant,base_rent:Number(newTenant.base_rent),advance_paid:Number(newTenant.advance_paid),annual_increment_pct:Number(newTenant.annual_increment_pct)});setNewTenant({property_id:'',name:'',base_rent:'',advance_paid:'',annual_increment_pct:'5',move_in_date:today.toISOString().slice(0,10)})}} className="space-y-3">
                    <select className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" value={newTenant.property_id} onChange={e=>setNewTenant({...newTenant,property_id:e.target.value})} required>
                      <option value="">Select Building...</option>{properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" placeholder="Tenant Name / Company" value={newTenant.name} onChange={e=>setNewTenant({...newTenant,name:e.target.value})} required/>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" placeholder="Base Rent ₹" value={newTenant.base_rent} onChange={e=>setNewTenant({...newTenant,base_rent:e.target.value})} required/>
                      <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" placeholder="Advance ₹" value={newTenant.advance_paid} onChange={e=>setNewTenant({...newTenant,advance_paid:e.target.value})}/>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-[10px] text-slate-400 block mb-1">Increment %/yr</label><input type="number" step="0.5" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" placeholder="5" value={newTenant.annual_increment_pct} onChange={e=>setNewTenant({...newTenant,annual_increment_pct:e.target.value})}/></div>
                      <div><label className="text-[10px] text-slate-400 block mb-1">Move-in Date</label><input type="date" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" value={newTenant.move_in_date} onChange={e=>setNewTenant({...newTenant,move_in_date:e.target.value})}/></div>
                    </div>
                    <button disabled={properties.length===0} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50">Assign Tenant</button>
                  </form>
                </div>
              </div>

              {/* All Properties with edit */}
              {properties.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">All Buildings</h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {properties.map(prop => {
                      const propTenants = tenants.filter(t => t.property_id === prop.id)
                      const isEd = editPropId === prop.id
                      return (
                        <div key={prop.id} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <p className="font-bold text-white">{prop.name}</p>
                              <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded font-medium text-slate-300">{prop.property_type}</span>
                            </div>
                            <div className="flex gap-1">
                              <button onClick={()=>setEditPropId(isEd?null:prop.id)} className="text-slate-500 hover:text-blue-400 p-1"><Pencil size={13}/></button>
                              <button onClick={()=>{ if(confirm(`Delete ${prop.name} and all its data?`)) deleteProperty(prop.id) }} className="text-slate-500 hover:text-rose-400 p-1"><Trash2 size={13}/></button>
                            </div>
                          </div>
                          {prop.address && <p className="text-xs text-slate-500 mb-2">{prop.address}</p>}
                          {isEd && <PropEditForm prop={prop} onSave={async(form)=>{await updateProperty(prop.id,form);setEditPropId(null)}} onCancel={()=>setEditPropId(null)}/>}
                          {propTenants.length > 0 ? (
                            <div className="mt-3 space-y-2">
                              {propTenants.map(t => {
                                const isTenantEd = editTenantId === t.id
                                return (
                                  <div key={t.id} className={`rounded-xl border p-3 transition-colors ${t.is_active===false ? 'bg-slate-900/30 border-slate-800 opacity-60' : 'bg-slate-900/60 border-slate-700'}`}>
                                    {isTenantEd ? (
                                      <TenantEditForm tenant={t} properties={properties}
                                        onSave={async(form) => { await updateTenant(t.id, { ...form, base_rent: Number(form.base_rent), advance_paid: Number(form.advance_paid), annual_increment_pct: Number(form.annual_increment_pct) }); setEditTenantId(null) }}
                                        onCancel={() => setEditTenantId(null)} />
                                    ) : (
                                      <div>
                                        <div className="flex justify-between items-center">
                                          <div>
                                            <p className={`text-sm font-semibold ${t.is_active===false ? 'text-slate-500 line-through' : 'text-white'}`}>{t.name}</p>
                                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                                              <span className="text-[10px] text-emerald-400 font-mono">₹{Number(t.base_rent).toLocaleString()}/mo</span>
                                              {t.annual_increment_pct > 0 && <span className="text-[10px] text-blue-400">{t.annual_increment_pct}%/yr</span>}
                                              {t.advance_paid > 0 && <span className="text-[10px] text-amber-400">Adv ₹{Number(t.advance_paid).toLocaleString()}</span>}
                                              {t.move_in_date && <span className="text-[10px] text-slate-500">Since {t.move_in_date}</span>}
                                            </div>
                                          </div>
                                          <div className="flex gap-1.5 ml-3 shrink-0">
                                            <button onClick={() => setEditTenantId(t.id)} className="text-slate-500 hover:text-blue-400 p-1 transition-colors" title="Edit tenant"><Pencil size={13}/></button>
                                            <button onClick={() => updateTenant(t.id, { is_active: t.is_active === false })} className="text-slate-500 hover:text-amber-400 p-1 transition-colors" title={t.is_active===false?'Reactivate':'Deactivate'}>
                                              {t.is_active===false ? <UserCheck size={13}/> : <UserX size={13}/>}
                                            </button>
                                            <button onClick={() => { if(confirm(`Delete ${t.name}?`)) deleteTenant(t.id) }} className="text-slate-500 hover:text-rose-400 p-1 transition-colors"><Trash2 size={13}/></button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          ) : <p className="text-xs text-slate-600 italic mt-2">No tenants assigned</p>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 px-6 py-3 pb-6 z-20">
        <div className="flex justify-around items-center max-w-sm mx-auto">
          {TABS.map(([v,label,icon])=>(
            <button key={v} onClick={()=>setActiveView(v)} className={`flex flex-col items-center gap-1 transition-colors ${activeView===v?'text-emerald-400':'text-slate-500'}`}>
              <span className="text-xl">{icon}</span>
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
