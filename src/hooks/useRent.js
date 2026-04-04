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

  const addProperty = async (property) => {
    const { data, error } = await supabase
      .from('properties')
      .insert([{ ...property, user_id: userId }])
      .select()
      .single()
    if (data && !error) setProperties([data, ...properties])
  }

  const addTenant = async (tenant) => {
    const { data, error } = await supabase
      .from('tenants')
      .insert([{ ...tenant, user_id: userId }])
      .select()
      .single()
    if (data && !error) setTenants([data, ...tenants])
  }

  // Upload to Supabase Storage
  const uploadReceipt = async (file) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `${userId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('rent_receipts')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('rent_receipts')
      .getPublicUrl(filePath)
      
    return data.publicUrl
  }

  const logRentPayment = async (logId, updates, file = null) => {
    try {
      let finalUpdates = { ...updates }
      if (file) {
        finalUpdates.proof_url = await uploadReceipt(file)
      }

      // append payment date to json array
      const existingLog = rentLogs.find(l => l.id === logId)
      if (updates.amount_paid > 0) {
        const dates = existingLog?.payment_dates || []
        finalUpdates.payment_dates = [...dates, new Date().toISOString()]
      }

      const { data, error } = await supabase
        .from('rent_logs')
        .update(finalUpdates)
        .eq('id', logId)
        .select()
        .single()

      if (data && !error) {
        setRentLogs(rentLogs.map(l => l.id === logId ? data : l))
      }
    } catch (err) {
      console.error(err)
      alert('Error saving payment: ' + err.message)
    }
  }

  const createRentLog = async (log, file = null) => {
    try {
      let finalLog = { ...log, user_id: userId }
      if (file) {
        finalLog.proof_url = await uploadReceipt(file)
      }
      if (log.amount_paid > 0) {
        finalLog.payment_dates = [new Date().toISOString()]
      }

      const { data, error } = await supabase
        .from('rent_logs')
        .insert([finalLog])
        .select()
        .single()
      
      if (data && !error) {
        setRentLogs([data, ...rentLogs])
      }
    } catch (err) {
      console.error(err)
      alert('Error creating log: ' + err.message)
    }
  }

  return { properties, tenants, rentLogs, loading, addProperty, addTenant, logRentPayment, createRentLog, refreshData: fetchData }
}
