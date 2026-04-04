import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useDailyLog(userId) {
  const [log, setLog] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    async function ensureTodayLog() {
      // Postgres CURRENT_DATE relies on timezone, to be safer client-side:
      const today = new Date().toISOString().split('T')[0] 
      
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single()

      if (error && error.code === 'PGRST116') {
        // Not found, create one
        const { data: newLog, error: createError } = await supabase
          .from('daily_logs')
          .insert({ user_id: userId, date: today, diet_choice: 'non-veg', completed_tasks: [] })
          .select()
          .single()
        
        if (!createError) {
          setLog(newLog)
        }
      } else if (data) {
        setLog(data)
      }
      setLoading(false)
    }

    ensureTodayLog()
  }, [userId])

  const toggleTask = async (taskId) => {
    if (!log) return
    const isCompleted = log.completed_tasks.includes(taskId)
    const newTasks = isCompleted 
      ? log.completed_tasks.filter(id => id !== taskId)
      : [...log.completed_tasks, taskId]
    
    // optimistically update:
    setLog({ ...log, completed_tasks: newTasks })

    await supabase
      .from('daily_logs')
      .update({ completed_tasks: newTasks })
      .eq('id', log.id)
  }

  const updateDiet = async (diet) => {
    if (!log) return
    setLog({ ...log, diet_choice: diet })
    await supabase
      .from('daily_logs')
      .update({ diet_choice: diet })
      .eq('id', log.id)
  }

  return { log, loading, toggleTask, updateDiet }
}
