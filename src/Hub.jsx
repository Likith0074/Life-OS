import { Link } from 'react-router-dom'
import { Activity, Building2 } from 'lucide-react'

export default function Hub({ session }) {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-6 sm:p-10 relative overflow-hidden">
      {/* Background aesthetics */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="z-10 w-full max-w-2xl">
        <div className="flex justify-center mb-10">
          <div className="w-20 h-20 rounded-3xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-3xl font-black shadow-inner border border-blue-500/30 backdrop-blur-sm">
            OS
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-center mb-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          Welcome to Life OS
        </h1>
        <p className="text-slate-400 text-center mb-12 text-lg">Select a vertical to manage today.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
          <Link 
            to="/health" 
            className="group relative bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 p-8 rounded-3xl transition-all duration-300 shadow-xl hover:shadow-blue-500/10 flex flex-col items-center text-center overflow-hidden"
          >
             <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 text-blue-400 group-hover:scale-110 transition-transform">
               <Activity size={32} />
             </div>
             <h2 className="text-2xl font-bold text-white mb-2">Health OS</h2>
             <p className="text-sm text-slate-400">Daily tasks, supplement logging, and Ironman 70.3 tracking.</p>
             <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-500/20 rounded-3xl transition-colors pointer-events-none"></div>
          </Link>

          <Link 
            to="/rent" 
            className="group relative bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 p-8 rounded-3xl transition-all duration-300 shadow-xl hover:shadow-emerald-500/10 flex flex-col items-center text-center overflow-hidden"
          >
             <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 text-emerald-400 group-hover:scale-110 transition-transform">
               <Building2 size={32} />
             </div>
             <h2 className="text-2xl font-bold text-white mb-2">Rent OS</h2>
             <p className="text-sm text-slate-400">Commercial & residential property management, ledger, and financials.</p>
             <div className="absolute inset-0 border-2 border-transparent group-hover:border-emerald-500/20 rounded-3xl transition-colors pointer-events-none"></div>
          </Link>
        </div>
      </div>
    </div>
  )
}
