import { useState } from 'react'

export function BodyStatsModal({ onClose, onSubmit }) {
  const [weight, setWeight] = useState('')
  const [fat, setFat] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({ weight_kg: parseFloat(weight), body_fat_pct: parseFloat(fat) })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-end justify-center sm:items-center">
      <div className="bg-slate-800 w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-700 animate-in slide-in-from-bottom-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Log Weekly Stats</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-1 font-medium">Weight (kg)</label>
            <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors" placeholder="70.5" />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1 font-medium">Body Fat (%)</label>
            <input type="number" step="0.1" value={fat} onChange={e => setFat(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors" placeholder="23.1" />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl mt-6 active:scale-95 transition-all shadow-lg shadow-blue-500/20">Save Entry</button>
        </form>
      </div>
    </div>
  )
}
