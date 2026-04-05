import { useState } from 'react'
import { supabase } from './lib/supabase'
import { ClipboardList, TrendingUp, Home, PlusCircle, Target, ArrowLeft, Flame } from 'lucide-react'

// Hooks
import { useDailyLog } from './hooks/useDailyLog'
import { useSupplements } from './hooks/useSupplements'
import { useBodyStats } from './hooks/useBodyStats'
import { useTrainingLog } from './hooks/useTrainingLog'
import { useSkincare } from './hooks/useSkincare'

// Data
import { DAILY_TASKS, SUPPLEMENTS } from './data/tasks'
import { SKINCARE_STEPS } from './data/skincare'

// Components
import { ProgressTab } from './components/ProgressTab'
import { BodyStatsModal } from './components/BodyStatsModal'
import { WorkoutModal } from './components/WorkoutModal'

// Task groups
const TASK_GROUPS = [
  { label: '🌅 Morning', emoji: '🌅', taskIds: ['wash-am', 'gym', 'whey', 'skin-am', 'bfast', 'supp-am'] },
  { label: '☀️ Afternoon', emoji: '☀️', taskIds: ['lunch', 'supp-pm', 'spf', 'snack'] },
  { label: '🌙 Evening', emoji: '🌙', taskIds: ['dinner', 'skin-pm', 'keroliv', 'hair', 'magnesium', 'sleep'] },
]

// Circular progress ring (SVG)
function ProgressRing({ done, total }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const pct = total > 0 ? done / total : 0
  const offset = circ * (1 - pct)
  const isPerfect = done === total && total > 0

  const strokeColor = isPerfect ? '#34d399' : pct > 0.6 ? '#60a5fa' : '#475569'
  const glowColor = isPerfect ? 'drop-shadow(0 0 12px #34d39999)' : pct > 0.6 ? 'drop-shadow(0 0 8px #60a5fa66)' : 'none'

  return (
    <div className="relative flex items-center justify-center" style={{ width: 128, height: 128 }}>
      <svg width="128" height="128" style={{ transform: 'rotate(-90deg)', filter: glowColor }}>
        <circle cx="64" cy="64" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle
          cx="64" cy="64" r={r} fill="none"
          stroke={strokeColor} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.5s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        {isPerfect
          ? <span className="text-3xl">🎉</span>
          : <>
              <span className={`text-2xl font-black ${isPerfect ? 'text-emerald-400' : 'text-white'}`}>{done}</span>
              <span className="text-[10px] text-slate-500 font-medium">/ {total}</span>
            </>
        }
      </div>
    </div>
  )
}

// Single task row with animation
function TaskRow({ task, isDone, onToggle }) {
  return (
    <div
      onClick={onToggle}
      className={`flex items-start gap-4 border p-4 rounded-2xl transition-all duration-200 cursor-pointer select-none active:scale-[0.98]
        ${isDone
          ? 'bg-slate-800/30 border-slate-800/60 opacity-60'
          : 'bg-slate-800 border-slate-700/80 shadow-md hover:border-slate-600 hover:bg-slate-800/90'}`}
    >
      {/* Checkbox */}
      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 transition-all duration-200
        ${isDone ? 'border-emerald-500 bg-emerald-500 scale-110' : 'border-slate-500 bg-slate-900/50'}`}>
        {isDone && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-bold text-slate-500 shrink-0">{task.time}</span>
          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${task.colorColor} ${task.bgColor} shrink-0`}>
            {task.category.substring(0, 5)}
          </span>
        </div>
        <h3 className={`text-sm font-semibold transition-colors ${isDone ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
          {task.title}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5 leading-snug">{task.desc}</p>
      </div>
    </div>
  )
}

export default function Dashboard({ session }) {
  const [activeTab, setActiveTab] = useState('home')
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [showWorkoutModal, setShowWorkoutModal] = useState(false)

  const userId = session.user.id

  const { log, history, streak, loading: logLoading, toggleTask, updateDiet } = useDailyLog(userId)
  const { logs: suppLogs, loading: suppLoading, markSupplement } = useSupplements(userId)
  const { logs: skinLogs, loading: skinLoading, toggleSkincare } = useSkincare(userId)
  const { stats: bodyStats, loading: bodyLoading, addStat } = useBodyStats(userId)
  const { logs: trainingLogs, loading: trainLoading, addLog: addWorkout } = useTrainingLog(userId)

  const handleLogout = async () => await supabase.auth.signOut()

  const handleShare = async () => {
    const expires = new Date()
    expires.setDate(expires.getDate() + 30)
    const { data: existing } = await supabase.from('share_links').select('*').eq('user_id', session.user.id).eq('revoked', false).single()
    if (existing) { alert(`Your trainer link: ${window.location.origin}/share/${existing.token}`); return }
    const { data, error } = await supabase.from('share_links').insert({ user_id: session.user.id, expires_at: expires.toISOString() }).select().single()
    if (data) alert(`New trainer link:\n\n${window.location.origin}/share/${data.token}`)
    else alert('Error: ' + error?.message)
  }

  const completedCount = log?.completed_tasks?.length || 0
  const totalTasks = DAILY_TASKS.length
  const isPerfectDay = completedCount === totalTasks && totalTasks > 0
  const isNonVeg = log?.diet_choice === 'non-veg'
  const currentCalories = isNonVeg ? 1573 : 1450

  const todayDate = new Date()
  const formattedDate = todayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  const raceDate = new Date('2026-11-06')
  const daysToRace = Math.ceil((raceDate - todayDate) / (1000 * 60 * 60 * 24))

  const totalSwim = trainingLogs.reduce((sum, l) => sum + (l.swim_m || 0), 0)
  const totalBike = trainingLogs.reduce((sum, l) => sum + (l.bike_km || 0), 0)
  const totalRun = trainingLogs.reduce((sum, l) => sum + (l.run_km || 0), 0)

  const TABS = [['home', 'Home', Home], ['log', 'Log', ClipboardList], ['progress', 'Progress', TrendingUp]]

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans flex">

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-slate-900/80 border-r border-slate-800 sticky top-0 h-screen shrink-0 p-5">
        <div className="flex items-center gap-3 mb-8">
          <a href="/" className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={14} />
          </a>
          <div>
            <p className="text-xs font-black text-blue-400 tracking-wider uppercase">Health OS</p>
            <p className="text-[10px] text-slate-500">Life OS</p>
          </div>
        </div>
        <nav className="space-y-1 flex-1">
          {TABS.map(([tab, label, Icon]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${activeTab === tab ? 'bg-blue-500/10 text-blue-400' : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800'}`}>
              <Icon size={18} strokeWidth={activeTab === tab ? 2.5 : 1.8} />
              {label}
            </button>
          ))}
          <div className="pt-4 border-t border-slate-800 mt-4 space-y-1">
            <button onClick={handleShare} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:text-blue-400 hover:bg-slate-800 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Share with Trainer
            </button>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Log Out
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Area */}
      <div className="flex-1 min-w-0 flex flex-col pb-24 md:pb-0">
        {showStatsModal && <BodyStatsModal onClose={() => setShowStatsModal(false)} onSubmit={addStat} />}
        {showWorkoutModal && <WorkoutModal onClose={() => setShowWorkoutModal(false)} onSubmit={addWorkout} />}

        {/* Header */}
        <header className="px-5 py-4 border-b border-slate-800/60 bg-slate-900/90 backdrop-blur-md sticky top-0 z-10">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-3">
              <a href="/" className="md:hidden w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white border border-slate-700">
                <ArrowLeft size={15} />
              </a>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {isPerfectDay ? '🎉 Perfect Day!' : `Morning, Likith`}
                </h1>
                <p className="text-slate-400 text-xs mt-0.5">{formattedDate}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleShare} className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-blue-400 active:scale-95" title="Share">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              </button>
              <button onClick={handleLogout} className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-400 active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            </div>
          </div>

          {/* Progress Hero Row */}
          <div className={`rounded-2xl p-4 flex items-center gap-5 transition-all duration-500 ${isPerfectDay ? 'bg-gradient-to-r from-emerald-900/50 to-slate-800/50 border border-emerald-500/30' : 'bg-slate-800/60 border border-slate-700/40'}`}>
            <ProgressRing done={completedCount} total={totalTasks} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isPerfectDay ? 'text-emerald-400' : 'text-slate-400'}`}>
                {isPerfectDay ? 'All tasks complete!' : "Today's progress"}
              </p>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isPerfectDay ? 'bg-emerald-400' : 'bg-blue-500'}`}
                  style={{ width: `${(completedCount / totalTasks) * 100}%` }}
                />
              </div>
              <div className="flex gap-4">
                <div>
                  <p className={`text-xl font-black ${streak > 0 ? 'text-orange-400' : 'text-slate-500'}`}>
                    {streak > 0 && '🔥'} {streak}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Day streak</p>
                </div>
                <div>
                  <p className="text-xl font-black text-amber-400">{currentCalories}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Cal today</p>
                </div>
                <div>
                  <p className="text-xl font-black text-blue-400">{daysToRace}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">To Ironman</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-5 mt-5 max-w-4xl w-full mx-auto">

          {/* HOME TAB */}
          {activeTab === 'home' && (
            <div className="animate-in fade-in duration-300 pb-6">

              {/* Quick Actions */}
              <div className="flex gap-3 mb-5">
                <button onClick={() => setShowWorkoutModal(true)} className="flex-1 bg-slate-800/80 border border-slate-700 hover:bg-slate-700 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all active:scale-95">
                  <PlusCircle size={16} className="text-blue-400" /> Workout
                </button>
                <button onClick={() => setShowStatsModal(true)} className="flex-1 bg-slate-800/80 border border-slate-700 hover:bg-slate-700 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all active:scale-95">
                  <Target size={16} className="text-amber-400" /> Log Stats
                </button>
              </div>

              {/* Ironman mini-bar */}
              <div className="bg-gradient-to-br from-blue-900/30 to-slate-800/30 border border-blue-500/20 rounded-2xl p-4 mb-5">
                <p className="text-blue-300 text-xs font-bold uppercase tracking-wider mb-3">Ironman Goa 70.3 — Build</p>
                <div className="space-y-2">
                  {[
                    { label: 'Swim', val: totalSwim, target: 1900, unit: 'm' },
                    { label: 'Bike', val: totalBike, target: 90, unit: 'km' },
                    { label: 'Run', val: totalRun, target: 21.1, unit: 'km' },
                  ].map(({ label, val, target, unit }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-8 shrink-0">{label}</span>
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min((val/target)*100, 100)}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-500 w-16 text-right shrink-0">{val.toFixed(label==='Swim'?0:1)}/{target}{unit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Meal Toggle */}
              <div className="bg-slate-800/80 p-1 rounded-2xl flex border border-slate-700/60 shadow-inner mb-5">
                <button onClick={() => updateDiet('non-veg')} className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${isNonVeg ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-slate-400 hover:text-white border border-transparent'}`}>NON-VEG</button>
                <button onClick={() => updateDiet('veg')} className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${!isNonVeg ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-slate-400 hover:text-white border border-transparent'}`}>VEG</button>
              </div>

              {/* Grouped Checklist */}
              {logLoading ? (
                <div className="text-center text-slate-500 py-10">Loading tasks...</div>
              ) : (
                <div className="space-y-6">
                  {TASK_GROUPS.map(group => {
                    const groupTasks = DAILY_TASKS.filter(t => group.taskIds.includes(t.id))
                    const groupDone = groupTasks.filter(t => log?.completed_tasks?.includes(t.id)).length
                    const groupTotal = groupTasks.length
                    const groupComplete = groupDone === groupTotal

                    return (
                      <div key={group.label}>
                        <div className="flex items-center justify-between mb-3">
                          <h2 className={`text-sm font-bold uppercase tracking-wider ${groupComplete ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {group.label}
                          </h2>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${groupComplete ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                            {groupDone}/{groupTotal}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {groupTasks.map(task => (
                            <TaskRow
                              key={task.id}
                              task={task}
                              isDone={log?.completed_tasks?.includes(task.id)}
                              onToggle={() => toggleTask(task.id)}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* LOG TAB */}
          {activeTab === 'log' && (
            <div className="animate-in fade-in duration-300 pb-6">
              <h2 className="text-xl font-bold text-white mb-5">Supplement Tracker</h2>
              {suppLoading ? (
                <div className="text-center text-slate-500 py-4">Loading...</div>
              ) : (
                <div className="space-y-2 mb-8">
                  {SUPPLEMENTS.map(supp => {
                    const dbLog = suppLogs.find(l => l.supplement_name === supp.id)
                    const isTaken = dbLog?.taken || false
                    return (
                      <div key={supp.id} onClick={() => markSupplement(supp.id, !isTaken)}
                        className={`flex items-center gap-4 border p-4 rounded-2xl transition-all cursor-pointer select-none active:scale-[0.98] ${isTaken ? 'bg-slate-800/30 border-slate-800/60 opacity-60' : 'bg-slate-800 border-slate-700/80 shadow-md hover:border-slate-600'}`}>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${isTaken ? 'border-emerald-500 bg-emerald-500' : 'border-slate-500 bg-slate-900/50'}`}>
                          {isTaken && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                        <div className="flex-1">
                          <h3 className={`text-sm font-semibold ${isTaken ? 'text-slate-400 line-through' : 'text-slate-200'}`}>{supp.name}</h3>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-700 text-slate-300">{supp.dose}</span>
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-indigo-500/10 text-indigo-300">{supp.time}</span>
                            {supp.food === 'Yes' && <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-amber-500/10 text-amber-300">With food</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <h2 className="text-xl font-bold text-white mb-5">Skincare Routine</h2>
              {skinLoading ? (
                <div className="text-center text-slate-500 py-4">Loading...</div>
              ) : (
                <div className="space-y-2">
                  {SKINCARE_STEPS.map(step => {
                    const dbLog = skinLogs.find(l => l.step_name === step.id)
                    const isDone = dbLog?.completed || false
                    return (
                      <div key={step.id} onClick={() => toggleSkincare(step.id, !isDone)}
                        className={`flex items-center justify-between border p-4 rounded-2xl transition-all cursor-pointer select-none active:scale-[0.98] ${isDone ? 'bg-slate-800/30 border-slate-800/60 opacity-60' : 'bg-slate-800 border-slate-700/80 shadow-md hover:border-slate-600'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isDone ? 'border-pink-500 bg-pink-500' : 'border-slate-500 bg-slate-900/50'}`}>
                            {isDone && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <div>
                            <h3 className={`text-sm font-semibold ${isDone ? 'text-slate-400 line-through' : 'text-slate-200'}`}>{step.name}</h3>
                            <p className="text-xs text-slate-500">{step.product} · {step.when}</p>
                          </div>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded shrink-0">{step.type}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* PROGRESS TAB */}
          {activeTab === 'progress' && (
            <ProgressTab bodyStats={bodyStats} trainingLogs={trainingLogs} history={history} />
          )}

        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 w-full bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 px-6 py-3 pb-6 z-20">
        <div className="flex justify-between items-center max-w-sm mx-auto">
          {TABS.map(([tab, label, Icon]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex flex-col items-center gap-1 transition-colors ${activeTab === tab ? 'text-blue-400' : 'text-slate-500'}`}>
              <Icon size={22} strokeWidth={activeTab === tab ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
