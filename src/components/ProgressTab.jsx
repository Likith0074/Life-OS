import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine } from 'recharts'
import { format, parseISO } from 'date-fns'

export function ProgressTab({ bodyStats, trainingLogs, logs }) {
  // Format body stats for charts
  const bodyData = bodyStats.map(stat => ({
    ...stat,
    shortDate: format(parseISO(stat.date), 'MMM d')
  }))

  // Training summary (last 7 days logic would go here, summarizing for now)
  const totalSwim = trainingLogs.reduce((sum, log) => sum + (log.swim_m || 0), 0)
  const totalBike = trainingLogs.reduce((sum, log) => sum + (log.bike_km || 0), 0)
  const totalRun = trainingLogs.reduce((sum, log) => sum + (log.run_km || 0), 0)

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h2 className="text-xl font-bold text-white mb-6">Progress & Analytics</h2>
      
      {/* Weight Chart */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-3xl p-5 mb-5 shadow-lg">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-white">Body Weight (kg)</h3>
          <p className="text-xs text-slate-400">Target trajectory to 70kg</p>
        </div>
        <div className="h-48 w-full">
          {bodyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bodyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="shortDate" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }} />
                <Line type="monotone" dataKey="weight_kg" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#0f172a' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">No weight data logged yet</div>
          )}
        </div>
      </div>

      {/* Body Fat Chart */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-3xl p-5 mb-5 shadow-lg">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-white">Body Fat (%)</h3>
          <p className="text-xs text-slate-400">Target to &lt;15%</p>
        </div>
        <div className="h-48 w-full">
          {bodyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bodyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="shortDate" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis domain={[12, 'dataMax + 2']} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }} />
                <ReferenceLine y={15} stroke="#10b981" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="body_fat_pct" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#0f172a' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">No fat % data logged yet</div>
          )}
        </div>
      </div>

      {/* Ironman Build Summary */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-3xl p-5 mb-5 shadow-lg">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-white">All Time Volume</h3>
          <p className="text-xs text-slate-400">Towards Ironman requirements</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Swim</span>
              <span className="text-blue-400 font-bold">{totalSwim}m <span className="text-slate-500 font-normal">/ 1900m</span></span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((totalSwim/1900)*100, 100)}%` }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Bike</span>
              <span className="text-indigo-400 font-bold">{totalBike.toFixed(0)}km <span className="text-slate-500 font-normal">/ 90km</span></span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min((totalBike/90)*100, 100)}%` }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Run</span>
              <span className="text-emerald-400 font-bold">{totalRun.toFixed(1)}km <span className="text-slate-500 font-normal">/ 21.1km</span></span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min((totalRun/21.1)*100, 100)}%` }}></div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  )
}
