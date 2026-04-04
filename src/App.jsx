import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Auth from './Auth'
import Hub from './Hub'
import Dashboard from './Dashboard'
import RentDashboard from './RentDashboard'
import './index.css'

function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          session ? <Hub session={session} /> : <Auth />
        } />
        <Route path="/health" element={
          session ? <Dashboard key={session.user.id} session={session} /> : <Auth />
        } />
        <Route path="/rent" element={
          session ? <RentDashboard key={`rent-${session.user.id}`} session={session} /> : <Auth />
        } />
        <Route path="/share/:token" element={<TrainerView />} />
      </Routes>
    </BrowserRouter>
  )
}

import { ProgressTab } from './components/ProgressTab'

function TrainerView() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      const { data: result, error: rpcError } = await supabase.rpc('get_trainer_data', { share_token: token })
      
      if (rpcError) {
        setError(rpcError.message)
      } else if (result?.error) {
        setError(result.error)
      } else {
        setData(result)
      }
      setLoading(false)
    }
    
    if (token) fetchData()
  }, [token])
  
  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Athlete Dashboard</h1>
        <p className="text-slate-400 mb-8 font-mono text-xs select-all">Trainer Link: {token}</p>
        
        {loading ? (
          <div className="flex justify-center p-12 text-slate-500">Loading athlete data...</div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl">
            <h3 className="font-bold mb-2">Access Denied</h3>
            <p className="text-sm">{error}</p>
          </div>
        ) : data ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
               <h2 className="text-xl font-bold">Metrics Overview</h2>
               <button onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm active:scale-95">
                 Export PDF
               </button>
            </div>
            
            {/* Embedded Progress Components for Trainer */}
            <div className="bg-slate-800/40 rounded-3xl p-2 sm:p-6 shadow-2xl border border-slate-700/50">
               <ProgressTab bodyStats={data.body_stats} trainingLogs={data.training_logs} logs={null} />
            </div>

            {/* Read-Only Checklist Summary */}
            <div className="bg-slate-800/40 rounded-3xl p-6 shadow-2xl border border-slate-700/50 mt-8">
               <h3 className="text-lg font-bold mb-4">Latest Check-ins</h3>
               <div className="space-y-3">
                 {data.daily_logs.slice(0, 5).map(log => (
                   <div key={log.id} className="flex justify-between items-center py-3 border-b border-slate-700/50 last:border-0">
                     <span className="text-sm text-slate-300">{log.date}</span>
                     <div className="flex items-center gap-3">
                        <span className="text-xs px-2 py-1 bg-slate-800 rounded-md text-slate-400 line-through decoration-slate-500">
                          {log.completed_tasks?.length || 0} tasks completed
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${log.diet_choice === 'non-veg' ? 'bg-orange-500/10 text-orange-400' : 'bg-green-500/10 text-green-400'}`}>
                          {log.diet_choice}
                        </span>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default App
