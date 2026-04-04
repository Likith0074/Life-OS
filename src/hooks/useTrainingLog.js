import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useTrainingLog(userId) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    async function fetchLogs() {
      const { data } = await supabase
        .from('training_logs')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
      setLogs(data || [])
      setLoading(false)
    }
    fetchLogs()
  }, [userId])

  const addLog = async (newLog) => {
    // Add date if missing
    const date = newLog.date || new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('training_logs')
      .insert([{ ...newLog, date, user_id: userId }])
      .select()
      .single()
      
    if (data && !error) {
    // We add to top for descending order
      setLogs([data, ...logs])
    }
  }

  return { logs, loading, addLog }
}
