import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useBodyStats(userId) {
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    async function fetchStats() {
      const { data } = await supabase
        .from('body_stats')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true }) // Oldest to newest for charting
      setStats(data || [])
      setLoading(false)
    }
    fetchStats()
  }, [userId])

  const addStat = async (newStat) => {
    const date = newStat.date || new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('body_stats')
      .insert([{ ...newStat, date, user_id: userId }])
      .select()
      .single()
      
    if (data && !error) {
      setStats([...stats, data])
    }
  }

  return { stats, loading, addStat }
}
