import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useRent(userId) {
  const [properties, setProperties] = useState([])
  const [tenants, setTenants] = useState([])
  const [rentLogs, setRentLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    if (!userId) return

    setLoading(true)
    const [propRes, tenantRes, logsRes] = await Promise.all([
      supabase.from('properties').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('tenants').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('rent_logs').select('*').eq('user_id', userId).order('month', { ascending: false })
    ])

    setProperties(propRes.data || [])
    setTenants(tenantRes.data || [])
    setRentLogs(logsRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [userId])

  // Properties 
  const addProperty = async (property) => {
    const { data, error } = await supabase
      .from('properties')
      .insert([{ ...property, user_id: userId }])
      .select()
      .single()
    
    if (data && !error) {
      setProperties([data, ...properties])
    }
  }

  // Tenants
  const addTenant = async (tenant) => {
    const { data, error } = await supabase
      .from('tenants')
      .insert([{ ...tenant, user_id: userId }])
      .select()
      .single()
    
    if (data && !error) {
      setTenants([data, ...tenants])
    }
  }

  // Rent Logs
  const logRentPayment = async (logId, updates) => {
    // updates: { status, amount_paid, payment_date }
    const { data, error } = await supabase
      .from('rent_logs')
      .update(updates)
      .eq('id', logId)
      .select()
      .single()

    if (data && !error) {
      setRentLogs(rentLogs.map(l => l.id === logId ? data : l))
    }
  }

  const createRentLog = async (log) => {
    const { data, error } = await supabase
      .from('rent_logs')
      .insert([{ ...log, user_id: userId }])
      .select()
      .single()
    
    if (data && !error) {
      setRentLogs([data, ...rentLogs])
    }
  }

  return { properties, tenants, rentLogs, loading, addProperty, addTenant, logRentPayment, createRentLog, refreshData: fetchData }
}
