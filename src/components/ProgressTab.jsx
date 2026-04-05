import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine } from 'recharts'
import { format, parseISO } from 'date-fns'

const TOTAL_TASKS = 16

function HeatmapCell({ pct, date, isToday }) {
  let bg = 'bg-slate-800'
  let ring = ''
  if (pct === null) bg = 'bg-slate-800/40'
  else if (pct === 100) bg = 'bg-emerald-400'
  else if (pct >= 50) bg = 'bg-emerald-700'
  else if (pct >= 1) bg = 'bg-blue-800'
  if (isToday) ring = 'ring-2 ring-white/60'

  return (
    <div
      className={`${bg} ${ring} rounded-sm transition-colors`}
      style={{ width: 12, height: 12 }}
      title={`${date}: ${pct ?? 0}% complete`}
    />
  )
}

export function ProgressTab({ bodyStats, trainingLogs, history }) {
  const bodyData = bodyStats.map(stat => ({
    ...stat,
    shortDate: format(parseISO(stat.date), 'MMM d')
  }))

  const totalSwim = trainingLogs.reduce((sum, l) => sum + (l.swim_m || 0), 0)
  const totalBike = trainingLogs.reduce((sum, l) => sum + (l.bike_km || 0), 0)
  const totalRun = trainingLogs.reduce((sum, l) => sum + (l.run_km || 0), 0)

  // Build 90-day heatmap grid (last 90 days, 7 rows × ~13 cols)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  const histMap = {}
  history.forEach(h => {
    histMap[h.date] = Math.round(((h.completed_tasks?.length || 0) / TOTAL_TASKS) * 100)
  })

  // Build last 91 days (padded to full weeks)
  const startOffset = today.getDay() // 0=Sun
  const totalCells = 91 + startOffset
  const cells = []
  for (let i = totalCells - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dStr = d.toISOString().split('T')[0]
    const isFuture = dStr > todayStr
    cells.push({
      date: dStr,
      pct: isFuture ? null : (histMap[dStr] ?? null),
      isToday: dStr === todayStr,
      isFuture
    })
  }
  // Pad start so first cell falls on correct weekday column
  const paddedCells = Array(startOffset).fill(null).concat(cells)

  // Group into weeks (columns)
  const weeks = []
  for (let i = 0; i < paddedCells.length; i += 7) {
    weeks.push(paddedCells.slice(i, i + 7))
  }

  const perfectDays = history.filter(h => (h.completed_tasks?.length || 0) >= TOTAL_TASKS).length
  const activeDays = history.filter(h => (h.completed_tasks?.length || 0) > 0).length

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 pb-6">
      <h2 className="text-xl font-bold text-white mb-6">Progress & Analytics</h2>

      {/* 90-Day Heatmap */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-3xl p-5 mb-5 shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">90-Day Habit Heatmap</h3>
            <p className="text-xs text-slate-400 mt-0.5">Each cell = one day. Brighter = more tasks done.</p>
          </div>
          <div className="text-right">
            <p className="text-emerald-400 font-bold text-sm">{perfectDays} perfect days</p>
            <p className="text-slate-500 text-xs">{activeDays} active days</p>
          </div>
        </div>

        {/* Day labels */}
        <div className="flex gap-[3px] mb-1">
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} className="text-[9px] text-slate-600 font-medium" style={{ width: 12, textAlign: 'center' }}>{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((cell, di) => {
                if (!cell) return <div key={di} style={{ width: 12, height: 12 }} />
                return <HeatmapCell key={di} pct={cell.pct} date={cell.date} isToday={cell.isToday} />
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-[10px] text-slate-500">Less</span>
          {['bg-slate-800/40', 'bg-blue-800', 'bg-emerald-700', 'bg-emerald-400'].map((c, i) => (
            <div key={i} className={`${c} rounded-sm`} style={{ width: 12, height: 12 }} />
          ))}
          <span className="text-[10px] text-slate-500">More</span>
        </div>
      </div>

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

      {/* Ironman Volume */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-3xl p-5 shadow-lg">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-white">All Time Training Volume</h3>
          <p className="text-xs text-slate-400">Towards Ironman Goa 70.3 requirements</p>
        </div>
        <div className="space-y-4">
          {[
            { label: 'Swim', val: totalSwim, target: 1900, unit: 'm', color: 'bg-blue-500', textColor: 'text-blue-400' },
            { label: 'Bike', val: totalBike, target: 90, unit: 'km', color: 'bg-indigo-500', textColor: 'text-indigo-400' },
            { label: 'Run', val: totalRun, target: 21.1, unit: 'km', color: 'bg-emerald-500', textColor: 'text-emerald-400' },
          ].map(({ label, val, target, unit, color, textColor }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">{label}</span>
                <span className={`${textColor} font-bold`}>{val.toFixed(label==='Swim'?0:1)}{unit} <span className="text-slate-500 font-normal">/ {target}{unit}</span></span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min((val/target)*100, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
