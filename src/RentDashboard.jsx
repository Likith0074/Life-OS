import { useState, useMemo } from 'react'
import { ArrowLeft, Building2, Upload, Paperclip, PlusCircle, Pencil, Trash2, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRent } from './hooks/useRent'

// ── helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

/** Compound-interest rent for a specific year relative to move-in year */
function calcRentForYear(baseRent, annualPct, moveInDate, targetYear) {
  const moveInYear = new Date(moveInDate).getFullYear()
  const yearsElapsed = Math.max(0, targetYear - moveInYear)
  return Math.round(baseRent * Math.pow(1 + annualPct / 100, yearsElapsed))
}

/** Effective rent for a specific month string "YYYY-MM" */
function effectiveRentForMonth(tenant, monthStr) {
  if (!tenant.move_in_date) return Number(tenant.base_rent)
  const year = parseInt(monthStr.slice(0, 4))
  return calcRentForYear(Number(tenant.base_rent), Number(tenant.annual_increment_pct || 0), tenant.move_in_date, year)
}

// ── main component ─────────────────────────────────────────────────────────

export default function RentDashboard({ session }) {
  const userId = session.user.id
  const {
    properties, tenants, rentLogs, loading,
    addProperty, addTenant, createRentLog, logRentPayment, deleteRentLog
  } = useRent(userId)

  const [activeView, setActiveView] = useState('overview') // overview | calendar | properties

  // ── Property form ──
  const [newProp, setNewProp] = useState({ name: '', address: '', property_type: 'Standalone' })

  // ── Tenant form ──
  const [newTenant, setNewTenant] = useState({
    property_id: '', name: '', base_rent: '', advance_paid: '',
    annual_increment_pct: '5', move_in_date: new Date().toISOString().slice(0,10)
  })

  // ── Payment form ──
  const today = new Date()
  const currentMonth = today.toISOString().slice(0, 7)
  const [paymentForm, setPaymentForm] = useState({
    tenantId: null, month: currentMonth, amount: '', adjustments: '0', file: null, notes: ''
  })

  // ── Edit log state ──
  const [editLog, setEditLog] = useState(null) // { id, amount_paid, adjustments, notes }

  // ── Calendar year ──
  const [calYear, setCalYear] = useState(today.getFullYear())

  // ── Enriched tenant calculations (current month only for overview) ──────
  const calculations = useMemo(() => {
    let totalExpected = 0, totalCollected = 0, totalAdvances = 0

    const enrichedTenants = tenants.map(tenant => {
      totalAdvances += Number(tenant.advance_paid)

      const tenantLogs = rentLogs
        .filter(l => l.tenant_id === tenant.id)
        .sort((a, b) => a.month.localeCompare(b.month))

      // Rollover deficit: sum of (expected - paid + adjustments) for all months < current
      let carryOverDeficit = 0
      tenantLogs.forEach(log => {
        if (log.month < currentMonth) {
          const eff = effectiveRentForMonth(tenant, log.month)
          carryOverDeficit += eff - Number(log.amount_paid) - Number(log.adjustments)
        }
      })

      const effRent = effectiveRentForMonth(tenant, currentMonth)
      const expectedThisMonth = effRent + Math.max(0, carryOverDeficit)
      
      const currentLog = tenantLogs.find(l => l.month === currentMonth)
      const collectedThisMonth = currentLog ? Number(currentLog.amount_paid) : 0
      const adjustmentsThisMonth = currentLog ? Number(currentLog.adjustments) : 0
      const status = currentLog?.status || 'Pending'

      totalExpected += expectedThisMonth
      totalCollected += collectedThisMonth

      return {
        ...tenant,
        carryOverDeficit,
        effRent,
        expectedThisMonth,
        collectedThisMonth,
        currentLogId: currentLog?.id || null,
        status,
        proofUrl: currentLog?.proof_url || null,
        balance: expectedThisMonth - collectedThisMonth - adjustmentsThisMonth,
        tenantLogs
      }
    })

    return { enrichedTenants, totalExpected, totalCollected, totalAdvances, totalOutstanding: totalExpected - totalCollected }
  }, [tenants, rentLogs, currentMonth])

  const { enrichedTenants, totalExpected, totalCollected, totalAdvances, totalOutstanding } = calculations

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddProp = (e) => {
    e.preventDefault()
    addProperty(newProp)
    setNewProp({ name: '', address: '', property_type: 'Standalone' })
  }

  const handleAddTenant = (e) => {
    e.preventDefault()
    addTenant({
      ...newTenant,
      base_rent: Number(newTenant.base_rent),
      advance_paid: Number(newTenant.advance_paid),
      annual_increment_pct: Number(newTenant.annual_increment_pct)
    })
    setNewTenant({ property_id: '', name: '', base_rent: '', advance_paid: '', annual_increment_pct: '5', move_in_date: today.toISOString().slice(0,10) })
  }

  const submitPayment = async (e) => {
    e.preventDefault()
    const t = enrichedTenants.find(x => x.id === paymentForm.tenantId)
    if (!t) return

    const targetMonth = paymentForm.month
    const amtPaid = Number(paymentForm.amount)
    const adj = Number(paymentForm.adjustments)
    const effExpected = effectiveRentForMonth(t, targetMonth)

    // Check if a log already exists for this month
    const existingLog = rentLogs.find(l => l.tenant_id === t.id && l.month === targetMonth)

    const totalPaid = (existingLog ? Number(existingLog.amount_paid) : 0) + amtPaid
    let newStatus = 'Pending'
    if (totalPaid > 0 && totalPaid < effExpected - adj) newStatus = 'Partial'
    if (totalPaid >= effExpected - adj) newStatus = 'Paid'

    if (existingLog) {
      await logRentPayment(existingLog.id, {
        amount_paid: totalPaid,
        adjustments: Number(existingLog.adjustments) + adj,
        status: newStatus,
        notes: paymentForm.notes
      }, paymentForm.file)
    } else {
      await createRentLog({
        tenant_id: t.id,
        month: targetMonth,
        amount_expected: effExpected,
        amount_paid: amtPaid,
        adjustments: adj,
        status: newStatus,
        notes: paymentForm.notes
      }, paymentForm.file)
    }
    setPaymentForm({ tenantId: null, month: currentMonth, amount: '', adjustments: '0', file: null, notes: '' })
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    await logRentPayment(editLog.id, {
      amount_paid: Number(editLog.amount_paid),
      adjustments: Number(editLog.adjustments),
      notes: editLog.notes,
      status: Number(editLog.amount_paid) <= 0 ? 'Pending' : 'Partial'
    })
    setEditLog(null)
  }

  // ── Calendar helpers ──────────────────────────────────────────────────────
  const calendarData = useMemo(() => {
    return tenants.map(tenant => {
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
      const prop = properties.find(p => p.id === tenant.property_id)
      return { tenant, prop, months }
    })
  }, [tenants, rentLogs, calYear, properties, currentMonth])

  // ── Status color util ──
  const statusCell = (s) => {
    if (s === 'paid') return 'bg-emerald-500 text-slate-900'
    if (s === 'partial') return 'bg-amber-400 text-slate-900'
    if (s === 'future') return 'bg-slate-800 text-slate-600'
    if (s === 'unpaid') return 'bg-rose-500/80 text-white'
    return 'bg-slate-800 text-slate-500'
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center">
      <div className="text-center">
        <Building2 size={40} className="text-emerald-400 mx-auto mb-4 animate-pulse" />
        <p className="text-slate-400">Loading Real Estate Data...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans pb-24">

      {/* Header */}
      <header className="px-5 py-5 border-b border-slate-800/60 bg-slate-900/90 backdrop-blur-md sticky top-0 z-10 flex items-center gap-4">
        <a href="/" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700 active:scale-95">
          <ArrowLeft size={18} />
        </a>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 size={22} className="text-emerald-500" /> Rent OS
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">Property Management & Financial Ledger</p>
        </div>
      </header>

      <main className="px-5 mt-5 max-w-5xl mx-auto">

        {/* Analytics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-2xl">
            <p className="text-slate-400 text-[10px] mb-1 uppercase tracking-wider font-bold">Expected</p>
            <h3 className="text-xl font-black text-white">₹{totalExpected.toLocaleString()}</h3>
            <p className="text-[9px] text-slate-500 mt-0.5">Incl. carry-over & increments</p>
          </div>
          <div className="bg-emerald-900/20 border-l-4 border-l-emerald-500 border border-slate-700/50 p-4 rounded-2xl relative overflow-hidden">
            <p className="text-emerald-400/80 text-[10px] mb-1 uppercase tracking-wider font-bold">Collected</p>
            <h3 className="text-xl font-black text-emerald-400">₹{totalCollected.toLocaleString()}</h3>
            <div className="absolute bottom-0 left-0 h-1 bg-emerald-500/20 w-full">
              <div className="h-full bg-emerald-500" style={{ width: `${Math.min((totalCollected / (totalExpected || 1)) * 100, 100)}%` }} />
            </div>
          </div>
          <div className="bg-rose-900/20 border-l-4 border-l-rose-500 border border-slate-700/50 p-4 rounded-2xl">
            <p className="text-rose-400/80 text-[10px] mb-1 uppercase tracking-wider font-bold">Outstanding</p>
            <h3 className="text-xl font-black text-rose-400">₹{totalOutstanding.toLocaleString()}</h3>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-2xl">
            <p className="text-slate-400 text-[10px] mb-1 uppercase tracking-wider font-bold">Advances Held</p>
            <h3 className="text-lg font-bold text-slate-300">₹{totalAdvances.toLocaleString()}</h3>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 mb-6 border-b border-slate-800 pb-4 overflow-x-auto">
          {[['overview','Active Ledger'], ['calendar','Yearly Calendar'], ['properties','Manage Properties']].map(([v, label]) => (
            <button key={v} onClick={() => setActiveView(v)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${activeView === v ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── ACTIVE LEDGER ─────────────────────────────────────────────── */}
        {activeView === 'overview' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {enrichedTenants.map(tenant => {
              const prop = properties.find(p => p.id === tenant.property_id)
              const isPaying = paymentForm.tenantId === tenant.id

              return (
                <div key={tenant.id} className={`bg-slate-800/60 border rounded-3xl p-5 transition-colors ${tenant.balance <= 0 ? 'border-emerald-500/30' : 'border-slate-700'}`}>

                  {/* Tenant header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-700 text-slate-300">
                          {prop?.name} · {prop?.property_type}
                        </span>
                        {tenant.carryOverDeficit > 0 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-400">Deficit Rolled Over</span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white">{tenant.name}</h3>
                      {tenant.annual_increment_pct > 0 && (
                        <p className="text-[10px] text-emerald-400 mt-0.5 font-medium">
                          {tenant.annual_increment_pct}% annual increment · Current rate ₹{tenant.effRent}/mo
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase mt-1
                      ${tenant.status === 'Paid' ? 'bg-emerald-500 text-slate-900' :
                        tenant.status === 'Partial' ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-400'}`}>
                      {tenant.status}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3 mb-4 bg-slate-900/50 p-3 rounded-2xl border border-slate-800 text-sm">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Effective Rent</p>
                      <p className="font-mono">₹{tenant.effRent.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Total Due</p>
                      <p className="font-mono text-blue-400">₹{tenant.expectedThisMonth.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Balance</p>
                      <p className={`font-mono font-bold ${tenant.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        ₹{tenant.balance.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Record Payment button */}
                  {!isPaying && (
                    <button onClick={() => setPaymentForm({ ...paymentForm, tenantId: tenant.id, month: currentMonth })}
                      className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-semibold py-2.5 flex items-center justify-center gap-2 rounded-xl transition-all border border-emerald-500/20 mb-3">
                      <PlusCircle size={16} /> Record Payment
                    </button>
                  )}

                  {/* Payment form */}
                  {isPaying && (
                    <form onSubmit={submitPayment} className="bg-slate-900 p-4 rounded-2xl border border-emerald-500/30 space-y-4 shadow-xl mb-3">
                      <h4 className="font-bold text-emerald-400 flex items-center gap-2 text-sm"><Upload size={14} /> Record Payment</h4>

                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Month / Year</label>
                        <input type="month" required value={paymentForm.month}
                          onChange={e => setPaymentForm({ ...paymentForm, month: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Amount (₹)</label>
                          <input type="number" required value={paymentForm.amount}
                            onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Adjustments (+/-)</label>
                          <input type="number" value={paymentForm.adjustments}
                            onChange={e => setPaymentForm({ ...paymentForm, adjustments: e.target.value })}
                            placeholder="-500 repair"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Notes</label>
                        <input value={paymentForm.notes}
                          onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                          placeholder="Optional note"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
                      </div>

                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Attach Proof</label>
                        <input type="file" accept="image/*,.pdf"
                          onChange={e => setPaymentForm({ ...paymentForm, file: e.target.files[0] })}
                          className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/10 file:text-emerald-400" />
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all">
                          Save To Ledger
                        </button>
                        <button type="button" onClick={() => setPaymentForm({ tenantId: null, month: currentMonth, amount: '', adjustments: '0', file: null, notes: '' })}
                          className="px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all">
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* History of logs */}
                  {tenant.tenantLogs.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 select-none">
                        View full payment history ({tenant.tenantLogs.length} records)
                      </summary>
                      <div className="mt-3 space-y-2">
                        {tenant.tenantLogs.map(log => {
                          const isEditing = editLog?.id === log.id
                          return (
                            <div key={log.id} className="bg-slate-900 rounded-xl p-3 border border-slate-800">
                              {isEditing ? (
                                <form onSubmit={handleSaveEdit} className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] text-slate-500">Amount Paid</label>
                                      <input type="number" value={editLog.amount_paid}
                                        onChange={e => setEditLog({ ...editLog, amount_paid: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs" />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-slate-500">Adjustments</label>
                                      <input type="number" value={editLog.adjustments}
                                        onChange={e => setEditLog({ ...editLog, adjustments: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs" />
                                    </div>
                                  </div>
                                  <input value={editLog.notes || ''} placeholder="Notes"
                                    onChange={e => setEditLog({ ...editLog, notes: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs" />
                                  <div className="flex gap-2">
                                    <button type="submit" className="flex-1 bg-blue-600 text-white text-xs rounded-lg py-1.5 font-bold">Save</button>
                                    <button type="button" onClick={() => setEditLog(null)} className="px-3 bg-slate-700 text-white text-xs rounded-lg py-1.5">Cancel</button>
                                  </div>
                                </form>
                              ) : (
                                <div className="flex justify-between items-center">
                                  <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="text-xs font-mono font-bold text-white">{log.month}</span>
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase
                                        ${log.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-400' :
                                          log.status === 'Partial' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'}`}>
                                        {log.status}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400">
                                      Paid ₹{Number(log.amount_paid).toLocaleString()}
                                      {Number(log.adjustments) !== 0 && ` · Adj ${Number(log.adjustments) > 0 ? '+' : ''}${Number(log.adjustments)}`}
                                      {log.notes && ` · ${log.notes}`}
                                    </p>
                                    {log.proof_url && (
                                      <a href={log.proof_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 flex items-center gap-1 mt-0.5">
                                        <Paperclip size={10} /> Receipt
                                      </a>
                                    )}
                                  </div>
                                  <div className="flex gap-2 ml-2">
                                    <button onClick={() => setEditLog({ id: log.id, amount_paid: log.amount_paid, adjustments: log.adjustments, notes: log.notes })}
                                      className="text-slate-500 hover:text-blue-400 transition-colors">
                                      <Pencil size={14} />
                                    </button>
                                    <button onClick={() => deleteRentLog(log.id)}
                                      className="text-slate-500 hover:text-rose-400 transition-colors">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </details>
                  )}
                </div>
              )
            })}
            {enrichedTenants.length === 0 && (
              <div className="text-center py-20 text-slate-500 border border-dashed border-slate-700 rounded-3xl">
                No tenants yet. Go to "Manage Properties" to set them up.
              </div>
            )}
          </div>
        )}

        {/* ── YEARLY CALENDAR ───────────────────────────────────────────── */}
        {activeView === 'calendar' && (
          <div className="animate-in fade-in duration-300 space-y-6">

            {/* Year selector */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CalendarDays size={20} className="text-emerald-400" /> Annual Rent Tracker
              </h2>
              <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2">
                <button onClick={() => setCalYear(y => y - 1)} className="text-slate-400 hover:text-white transition-colors">
                  <ChevronLeft size={18} />
                </button>
                <span className="text-white font-bold text-sm px-2">{calYear}</span>
                <button onClick={() => setCalYear(y => y + 1)} className="text-slate-400 hover:text-white transition-colors">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-wide">
              {[['bg-emerald-500','Paid'],['bg-amber-400','Partial'],['bg-rose-500/80','Unpaid'],['bg-slate-800 border border-slate-700','Future']].map(([cls, label]) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded-sm ${cls}`} />
                  <span className="text-slate-400">{label}</span>
                </span>
              ))}
            </div>

            {calendarData.map(({ tenant, prop, months }) => (
              <div key={tenant.id} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-bold text-white">{tenant.name}</h3>
                    <p className="text-[10px] text-slate-500">{prop?.name} · {prop?.property_type}</p>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <p>Base: ₹{Number(tenant.base_rent).toLocaleString()}</p>
                    <p className="text-emerald-400">{calYear} Rate: ₹{calcRentForYear(Number(tenant.base_rent), Number(tenant.annual_increment_pct || 0), tenant.move_in_date || `${calYear}-01-01`, calYear).toLocaleString()}</p>
                  </div>
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                  {months.map(({ label, monthStr, status, log }) => (
                    <div key={monthStr} className="relative group">
                      <div className={`${statusCell(status)} text-center rounded-lg py-2 text-[10px] font-bold cursor-default transition-transform hover:scale-105`}>
                        {label}
                      </div>
                      {/* Tooltip on hover */}
                      {log && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-[10px] text-slate-300 whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity shadow-xl pointer-events-none">
                          ₹{Number(log.amount_paid).toLocaleString()} paid
                          {log.notes && <><br />{log.notes}</>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {calendarData.length === 0 && (
              <div className="text-center py-20 text-slate-500 border border-dashed border-slate-700 rounded-3xl">
                Add tenants to see the Yearly Calendar.
              </div>
            )}
          </div>
        )}

        {/* ── MANAGE PROPERTIES ─────────────────────────────────────────── */}
        {activeView === 'properties' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid md:grid-cols-2 gap-6">

              {/* Add Property */}
              <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Building2 size={18} /> Add Building</h3>
                <form onSubmit={handleAddProp} className="space-y-3">
                  <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm"
                    placeholder="Name (e.g. MG Road Block)" value={newProp.name}
                    onChange={e => setNewProp({ ...newProp, name: e.target.value })} required />
                  <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm"
                    placeholder="Address / Location" value={newProp.address}
                    onChange={e => setNewProp({ ...newProp, address: e.target.value })} />
                  <select className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm"
                    value={newProp.property_type} onChange={e => setNewProp({ ...newProp, property_type: e.target.value })}>
                    <option>Standalone</option>
                    <option>Commercial</option>
                    <option>Room</option>
                  </select>
                  <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg text-sm">
                    Save Property
                  </button>
                </form>
              </div>

              {/* Add Tenant */}
              <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50">
                <h3 className="text-lg font-bold mb-4">Add Tenant</h3>
                <form onSubmit={handleAddTenant} className="space-y-3">
                  <select className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm"
                    value={newTenant.property_id} onChange={e => setNewTenant({ ...newTenant, property_id: e.target.value })} required>
                    <option value="">Select Building...</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm"
                    placeholder="Tenant Name / Company" value={newTenant.name}
                    onChange={e => setNewTenant({ ...newTenant, name: e.target.value })} required />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm"
                      placeholder="Base Rent ₹" value={newTenant.base_rent}
                      onChange={e => setNewTenant({ ...newTenant, base_rent: e.target.value })} required />
                    <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm"
                      placeholder="Advance ₹" value={newTenant.advance_paid}
                      onChange={e => setNewTenant({ ...newTenant, advance_paid: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Annual Increment %</label>
                      <input type="number" step="0.5" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm"
                        placeholder="e.g. 5" value={newTenant.annual_increment_pct}
                        onChange={e => setNewTenant({ ...newTenant, annual_increment_pct: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Move-in Date</label>
                      <input type="date" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm"
                        value={newTenant.move_in_date}
                        onChange={e => setNewTenant({ ...newTenant, move_in_date: e.target.value })} />
                    </div>
                  </div>
                  <button disabled={properties.length === 0}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg disabled:opacity-50 text-sm">
                    Assign Tenant
                  </button>
                </form>
              </div>
            </div>

            {/* Current Properties + Tenants summary */}
            {properties.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-white mb-4">All Properties</h3>
                <div className="space-y-4">
                  {properties.map(prop => {
                    const propTenants = tenants.filter(t => t.property_id === prop.id)
                    return (
                      <div key={prop.id} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
                        <p className="font-bold text-white mb-1">{prop.name}
                          <span className="ml-2 text-[10px] bg-slate-700 px-2 py-0.5 rounded font-medium text-slate-300">{prop.property_type}</span>
                        </p>
                        {prop.address && <p className="text-xs text-slate-500 mb-2">{prop.address}</p>}
                        {propTenants.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {propTenants.map(t => (
                              <span key={t.id} className="text-xs bg-slate-700 px-3 py-1 rounded-full text-slate-300">
                                {t.name} · ₹{Number(t.base_rent).toLocaleString()}/mo
                              </span>
                            ))}
                          </div>
                        ) : <p className="text-xs text-slate-600 italic">No tenants assigned</p>}
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
  )
}
