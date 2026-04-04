import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useSkincare(userId) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    async function fetchLogs() {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('skincare_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
      setLogs(data || [])
      setLoading(false)
    }
    fetchLogs()
  }, [userId])

  const toggleSkincare = async (stepName, isCompleted) => {
    const today = new Date().toISOString().split('T')[0]
    const existing = logs.find(l => l.step_name === stepName)
    
    if (existing) {
      const updatedLogs = logs.map(l => l.step_name === stepName ? { ...l, completed: isCompleted } : l)
      setLogs(updatedLogs)
      await supabase.from('skincare_logs').update({ completed: isCompleted }).eq('id', existing.id)
    } else {
      const newLog = { user_id: userId, date: today, step_name: stepName, completed: isCompleted }
      setLogs([...logs, newLog])
      const { data } = await supabase.from('skincare_logs').insert(newLog).select().single()
      if (data) setLogs(prev => prev.map(l => l.step_name === stepName ? data : l))
    }
  }

  return { logs, loading, toggleSkincare }
}
