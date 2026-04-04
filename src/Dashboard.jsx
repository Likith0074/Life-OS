import { useState } from 'react'
import { supabase } from './lib/supabase'
import { Check, ClipboardList, TrendingUp, Home, PlusCircle, Target, ArrowLeft } from 'lucide-react'

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

export default function Dashboard({ session }) {
  const [activeTab, setActiveTab] = useState('home')
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [showWorkoutModal, setShowWorkoutModal] = useState(false)
  
  const userId = session.user.id

  // Data fetching
  const { log, loading: logLoading, toggleTask, updateDiet } = useDailyLog(userId)
  const { logs: suppLogs, loading: suppLoading, markSupplement } = useSupplements(userId)
  const { logs: skinLogs, loading: skinLoading, toggleSkincare } = useSkincare(userId)
  const { stats: bodyStats, loading: bodyLoading, addStat } = useBodyStats(userId)
  const { logs: trainingLogs, loading: trainLoading, addLog: addWorkout } = useTrainingLog(userId)


  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleShare = async () => {
    const expires = new Date()
    expires.setDate(expires.getDate() + 30) // Expires in 30 days
    
    // Check if active link exists
    const { data: existing } = await supabase.from('share_links').select('*').eq('user_id', session.user.id).eq('revoked', false).single()
    
    if (existing) {
      alert(`Your trainer link: ${window.location.origin}/share/${existing.token}`)
      return
    }

    const { data, error } = await supabase.from('share_links').insert({ 
      user_id: session.user.id, 
      expires_at: expires.toISOString() 
    }).select().single()
    
    if (data) {
      alert(`New trainer link generated:\n\n${window.location.origin}/share/${data.token}`)
    } else {
      alert('Error creating link: ' + error?.message)
    }
  }

  // Calculate stats
  const completedCount = log?.completed_tasks?.length || 0
  const isNonVeg = log?.diet_choice === 'non-veg'
  const currentCalories = isNonVeg ? 1573 : 1450 // Hardcoded MVP

  const todayDate = new Date()
  const options = { weekday: 'long', month: 'short', day: 'numeric' }
  const formattedDate = todayDate.toLocaleDateString('en-US', options)

  const raceDate = new Date('2026-11-06')
  const daysToRace = Math.ceil((raceDate - todayDate) / (1000 * 60 * 60 * 24))

  // Ironman Progress bars calculations (summary across all logs)
  const totalSwim = trainingLogs.reduce((sum, l) => sum + (l.swim_m || 0), 0)
  const totalBike = trainingLogs.reduce((sum, l) => sum + (l.bike_km || 0), 0)
  const totalRun = trainingLogs.reduce((sum, l) => sum + (l.run_km || 0), 0)

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans flex">
      {/* Desktop Sidebar Nav */}
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
          {[['home', 'Home', Home], ['log', 'Log', ClipboardList], ['progress', 'Progress', TrendingUp]].map(([tab, label, Icon]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === tab ? 'bg-blue-500/10 text-blue-400' : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800'
              }`}>
              <Icon size={18} strokeWidth={activeTab === tab ? 2.5 : 1.8} />
              {label}
            </button>
          ))}

          <div className="pt-4 border-t border-slate-800 mt-4 space-y-1">
            <button onClick={handleShare}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:text-blue-400 hover:bg-slate-800 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
              Share with Trainer
            </button>
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              Log Out
            </button>
          </div>
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex-1 min-w-0 flex flex-col pb-24 md:pb-0">

      
      {/* Modals */}
      {showStatsModal && <BodyStatsModal onClose={() => setShowStatsModal(false)} onSubmit={addStat} />}
      {showWorkoutModal && <WorkoutModal onClose={() => setShowWorkoutModal(false)} onSubmit={addWorkout} />}

      {/* Header */}
      <header className="px-5 py-5 border-b border-slate-800/60 bg-slate-900/90 backdrop-blur-md sticky top-0 z-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <a href="/" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <ArrowLeft size={16} />
              </a>
              <h1 className="text-2xl font-bold text-white tracking-tight">Morning, Likith</h1>
            </div>
            <p className="text-slate-400 text-sm mt-1">{formattedDate}</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-blue-400 active:scale-95 transition-transform"
              title="Share with Trainer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            </button>
            <button 
              onClick={handleLogout}
              className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-300 active:scale-95 transition-transform"
              title="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </button>
          </div>
        </div>
        
        {/* Ironman Widget */}
        <div className="bg-gradient-to-br from-blue-900/40 to-slate-800/40 border border-blue-500/20 rounded-2xl p-5 shadow-lg shadow-blue-900/10">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-blue-300 text-xs font-semibold uppercase tracking-wider mb-1">Ironman Goa 70.3</p>
              <div className="text-3xl font-black text-white tracking-tighter">{daysToRace} <span className="text-lg text-blue-200/60 font-medium tracking-normal">Days</span></div>
            </div>
            <div className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-medium border border-blue-500/30">
              Foundation Phase
            </div>
          </div>
          
          <div className="space-y-2 mt-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-400 w-8">Swim</span>
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{width: `${Math.min((totalSwim/1900)*100, 100)}%`}}></div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-400 w-8">Bike</span>
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{width: `${Math.min((totalBike/90)*100, 100)}%`}}></div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-400 w-8">Run</span>
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{width: `${Math.min((totalRun/21.1)*100, 100)}%`}}></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Areas */}
      <main className="px-5 mt-6 max-w-4xl w-full mx-auto">
        
        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* Quick Actions */}
            <div className="flex gap-3 mb-6">
              <button onClick={() => setShowWorkoutModal(true)} className="flex-1 bg-slate-800/80 border border-slate-700 hover:bg-slate-700 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all">
                <PlusCircle size={16} className="text-blue-400" /> Workout
              </button>
              <button onClick={() => setShowStatsModal(true)} className="flex-1 bg-slate-800/80 border border-slate-700 hover:bg-slate-700 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all">
                <Target size={16} className="text-amber-400" /> Log Stats
              </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-4 gap-3 mb-8">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-3 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-white">{completedCount}/{DAILY_TASKS.length}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wide mt-1">Tasks</span>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-3 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-white">4</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wide mt-1">Streak</span>
              </div>
              <div className="bg-amber-900/20 border border-amber-500/20 rounded-2xl p-3 flex flex-col items-center justify-center col-span-2 relative overflow-hidden group">
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-amber-400">{currentCalories}</span>
                  <span className="text-xs text-amber-400/50">/2100</span>
                </div>
                <span className="text-[10px] text-amber-400/70 uppercase tracking-wide mt-1">Calories</span>
                <div className="absolute bottom-0 left-0 h-1 bg-amber-500/30 w-full">
                  <div className="h-full bg-amber-500 rounded-r" style={{width: `${(currentCalories/2100)*100}%`}}></div>
                </div>
              </div>
            </div>

            {/* Meal Toggle */}
            <div className="mb-10">
              <div className="bg-slate-800/80 p-1 rounded-2xl flex border border-slate-700/60 shadow-inner">
                <button 
                  onClick={() => updateDiet('non-veg')}
                  className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all focus:outline-none ${isNonVeg ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-sm' : 'text-slate-400 hover:text-white border border-transparent'}`}
                >
                  NON-VEG
                </button>
                <button 
                  onClick={() => updateDiet('veg')}
                  className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all focus:outline-none ${!isNonVeg ? 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-sm' : 'text-slate-400 hover:text-white border border-transparent'}`}
                >
                  VEG
                </button>
              </div>
            </div>

            {/* Checklist */}
            <div className="mb-6">
              <h2 className="text-lg font-bold text-white mb-4">Daily Checklist</h2>
              {logLoading ? (
                <div className="text-center text-slate-500 py-10">Loading tasks...</div>
              ) : (
                <div className="space-y-3">
                  {DAILY_TASKS.map(task => {
                    const isDone = log?.completed_tasks?.includes(task.id)
                    return (
                      <div 
                        key={task.id}
                        onClick={() => toggleTask(task.id)}
                        className={`flex items-start gap-4 border p-4 rounded-2xl transition-all cursor-pointer select-none active:scale-[0.98]
                          ${isDone ? 'bg-slate-800/40 border-slate-700/40 opacity-50' : 'bg-slate-800 border-slate-700/80 shadow-md hover:border-slate-600'}`
                        }
                      >
                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center mt-0.5 flex-shrink-0 transition-colors
                          ${isDone ? 'border-blue-500 bg-blue-500' : 'border-slate-500 bg-slate-900/50'}`
                        }>
                          {isDone && <Check size={14} color="white" strokeWidth={3} />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-400 w-14">{task.time}</span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${task.colorColor} ${task.bgColor}`}>
                              {task.category.substring(0, 5)}
                            </span>
                          </div>
                          <h3 className={`text-base font-semibold transition-colors ${isDone ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
                            {task.title}
                          </h3>
                          <p className="text-sm text-slate-500 mt-0.5 leading-snug">{task.desc}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* LOG TAB */}
        {activeTab === 'log' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xl font-bold text-white mb-6">Supplement Tracker</h2>
            
            {suppLoading ? (
               <div className="text-center text-slate-500 py-4">Loading supplements...</div>
            ) : (
              <div className="space-y-3 mb-10">
                {SUPPLEMENTS.map(supp => {
                  const dbLog = suppLogs.find(l => l.supplement_name === supp.id)
                  const isTaken = dbLog?.taken || false
                  
                  return (
                    <div 
                      key={supp.id}
                      onClick={() => markSupplement(supp.id, !isTaken)}
                      className={`flex items-center gap-4 border p-4 rounded-2xl transition-all cursor-pointer select-none active:scale-[0.98]
                        ${isTaken ? 'bg-slate-800/40 border-slate-700/40 opacity-60' : 'bg-slate-800 border-slate-700/80 shadow-md hover:border-slate-600'}`
                      }
                    >
                      <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors
                          ${isTaken ? 'border-emerald-500 bg-emerald-500' : 'border-slate-500 bg-slate-900/50'}`
                        }>
                          {isTaken && <Check size={14} color="white" strokeWidth={3} />}
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-base font-semibold ${isTaken ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
                          {supp.name}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-1.5">
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

            <h2 className="text-xl font-bold text-white mb-6">Skincare Routine</h2>
            {skinLoading ? (
               <div className="text-center text-slate-500 py-4">Loading skincare...</div>
            ) : (
              <div className="space-y-3">
                {SKINCARE_STEPS.map(step => {
                  const dbLog = skinLogs.find(l => l.step_name === step.id)
                  const isDone = dbLog?.completed || false
                  
                  return (
                    <div 
                      key={step.id}
                      onClick={() => toggleSkincare(step.id, !isDone)}
                      className={`flex flex-col gap-2 border p-4 rounded-2xl transition-all cursor-pointer select-none active:scale-[0.98]
                        ${isDone ? 'bg-slate-800/40 border-slate-700/40 opacity-60' : 'bg-slate-800 border-slate-700/80 shadow-md hover:border-slate-600'}`
                      }
                    >
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
                                ${isDone ? 'border-pink-500 bg-pink-500' : 'border-slate-500 bg-slate-900/50'}`
                              }>
                                {isDone && <Check size={12} color="white" strokeWidth={3} />}
                            </div>
                            <h3 className={`text-sm font-semibold ${isDone ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
                              {step.name}
                            </h3>
                         </div>
                         <span className="text-[10px] uppercase font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded">{step.type}</span>
                      </div>
                      <p className="text-xs text-slate-400 pl-8">{step.product} • {step.when}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* PROGRESS TAB */}
        {activeTab === 'progress' && (
          <ProgressTab bodyStats={bodyStats} trainingLogs={trainingLogs} logs={log} />
        )}

        {/* RENT TAB DISABLED - MOVED TO HUB */}

      </main>
      </div> {/* end main area */}

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 w-full bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 px-6 py-3 pb-8 z-20">
        <div className="flex justify-between items-center max-w-sm mx-auto">
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'home' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Home size={22} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button 
            onClick={() => setActiveTab('log')}
            className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'log' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <ClipboardList size={22} strokeWidth={activeTab === 'log' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Log</span>
          </button>
          <button 
            onClick={() => setActiveTab('progress')}
            className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'progress' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <TrendingUp size={22} strokeWidth={activeTab === 'progress' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Progress</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
