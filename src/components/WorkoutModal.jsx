import { useState } from 'react'

export function WorkoutModal({ onClose, onSubmit }) {
  const [type, setType] = useState('Gym')
  const [duration, setDuration] = useState('')
  const [swim, setSwim] = useState('')
  const [bike, setBike] = useState('')
  const [run, setRun] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      session_type: type,
      duration_min: parseInt(duration) || 0,
      swim_m: parseInt(swim) || 0,
      bike_km: parseFloat(bike) || 0,
      run_km: parseFloat(run) || 0
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-end justify-center sm:items-center overflow-y-auto">
      <div className="bg-slate-800 w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-700 animate-in slide-in-from-bottom-10 max-h-[90vh]">
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-slate-800 pt-2 pb-2 z-10">
          <h2 className="text-xl font-bold text-white">Log Workout</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-1 font-medium">Session Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none appearance-none cursor-pointer">
              <option>Gym</option><option>Swim</option><option>Bike</option><option>Run</option><option>Brick</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1 font-medium">Duration (mins)</label>
            <input type="number" value={duration} onChange={e => setDuration(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors" placeholder="60" />
          </div>
          
          {(type === 'Swim' || type === 'Brick') && (
            <div>
              <label className="block text-slate-400 text-sm mb-1 font-medium">Swim (meters)</label>
              <input type="number" value={swim} onChange={e => setSwim(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors" placeholder="1900" />
            </div>
          )}
          {(type === 'Bike' || type === 'Brick') && (
            <div>
              <label className="block text-slate-400 text-sm mb-1 font-medium">Bike (km)</label>
              <input type="number" step="0.1" value={bike} onChange={e => setBike(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors" placeholder="90" />
            </div>
          )}
          {(type === 'Run' || type === 'Brick') && (
            <div>
              <label className="block text-slate-400 text-sm mb-1 font-medium">Run (km)</label>
              <input type="number" step="0.1" value={run} onChange={e => setRun(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors" placeholder="21.1" />
            </div>
          )}
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl mt-6 active:scale-95 transition-all shadow-lg shadow-blue-500/20">Save Workout</button>
        </form>
      </div>
    </div>
  )
}
