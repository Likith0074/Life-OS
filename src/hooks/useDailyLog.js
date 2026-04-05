import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { DAILY_TASKS } from '../data/tasks'

export function useDailyLog(userId) {
  const [log, setLog] = useState(null)
  const [history, setHistory] = useState([])
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    async function init() {
      const today = new Date().toISOString().split('T')[0]

      // Fetch today's log
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single()

      if (error && error.code === 'PGRST116') {
        const { data: newLog, error: createError } = await supabase
          .from('daily_logs')
          .insert({ user_id: userId, date: today, diet_choice: 'non-veg', completed_tasks: [] })
          .select()
          .single()
        if (!createError) setLog(newLog)
      } else if (data) {
        setLog(data)
      }

      // Fetch last 90 days of history
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89)
      const fromDate = ninetyDaysAgo.toISOString().split('T')[0]

      const { data: hist } = await supabase
        .from('daily_logs')
        .select('date, completed_tasks')
        .eq('user_id', userId)
        .gte('date', fromDate)
        .order('date', { ascending: false })

      const histData = hist || []
      setHistory(histData)

      // Compute streak (consecutive days from today backwards with ≥1 task done)
      let s = 0
      const logMap = {}
      histData.forEach(l => { logMap[l.date] = l.completed_tasks?.length || 0 })
      const cursor = new Date()
      cursor.setHours(0, 0, 0, 0)
      for (let i = 0; i < 90; i++) {
        const d = cursor.toISOString().split('T')[0]
        if ((logMap[d] || 0) > 0) {
          s++
          cursor.setDate(cursor.getDate() - 1)
        } else {
          break
        }
      }
      setStreak(s)
      setLoading(false)
    }

    init()
  }, [userId])

  const toggleTask = async (taskId) => {
    if (!log) return
    const isCompleted = log.completed_tasks.includes(taskId)
    const newTasks = isCompleted
      ? log.completed_tasks.filter(id => id !== taskId)
      : [...log.completed_tasks, taskId]
    setLog({ ...log, completed_tasks: newTasks })

    // Also update history entry for today
    const today = new Date().toISOString().split('T')[0]
    setHistory(prev => prev.map(h => h.date === today ? { ...h, completed_tasks: newTasks } : h))

    await supabase.from('daily_logs').update({ completed_tasks: newTasks }).eq('id', log.id)
  }

  const updateDiet = async (diet) => {
    if (!log) return
    setLog({ ...log, diet_choice: diet })
    await supabase.from('daily_logs').update({ diet_choice: diet }).eq('id', log.id)
  }

  return { log, history, streak, loading, toggleTask, updateDiet }
}
