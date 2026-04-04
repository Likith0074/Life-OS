import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { SUPPLEMENTS } from '../data/tasks'

export function useSupplements(userId) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    async function fetchTodaySupplements() {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('supplement_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)

      setLogs(data || [])
      setLoading(false)
    }

    fetchTodaySupplements()
  }, [userId])

  const markSupplement = async (suppName, taken) => {
    const today = new Date().toISOString().split('T')[0]
    const existing = logs.find(l => l.supplement_name === suppName)
    
    if (existing) {
      const updated = { ...existing, taken }
      setLogs(logs.map(l => l.supplement_name === suppName ? updated : l))
      await supabase
        .from('supplement_logs')
        .update({ taken })
        .eq('id', existing.id)
    } else {
      const newLog = {
        user_id: userId,
        date: today,
        supplement_name: suppName,
        taken
      }
      // Optimistic update without ID
      setLogs([...logs, newLog]) 
      const { data } = await supabase
        .from('supplement_logs')
        .insert(newLog)
        .select()
        .single()
      
      // Update with real ID
      if (data) {
        setLogs(prev => prev.map(l => l.supplement_name === suppName ? data : l))
      }
    }
  }

  return { logs, loading, markSupplement }
}
