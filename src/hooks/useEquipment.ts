import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { EquipmentItem, PatTestLog } from '@/types/equipment'

export function useEquipment() {
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [patLogs, setPatLogs] = useState<PatTestLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [eqRes, patRes] = await Promise.all([
        supabase
          .from('equipment_calibration_register')
          .select(`
            *,
            assigned_user:users!assigned_user_id(id, full_name)
          `)
          .order('calibration_expiry_date', { ascending: true }),
        supabase
          .from('pat_test_logs')
          .select(`
            *,
            technician:users!technician_id(id, full_name)
          `)
          .order('test_date', { ascending: false }),
      ])

      if (eqRes.error) throw eqRes.error
      if (patRes.error) throw patRes.error

      setEquipment((eqRes.data || []) as EquipmentItem[])
      setPatLogs((patRes.data || []) as PatTestLog[])
    } catch (err) {
      console.error('[useEquipment] Error loading equipment:', err)
      setError(err instanceof Error ? err.message : 'Failed to load equipment data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('equipment_realtime_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment_calibration_register' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pat_test_logs' }, () => fetchData())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  const saveEquipment = async (item: Partial<EquipmentItem>): Promise<EquipmentItem> => {
    const id = item.id || crypto.randomUUID()
    const { data, error: err } = await supabase
      .from('equipment_calibration_register')
      .upsert([
        {
          ...item,
          id,
          updated_at: new Date().toISOString(),
        },
      ], { onConflict: 'id' })
      .select(`
        *,
        assigned_user:users!assigned_user_id(id, full_name)
      `)
      .single()

    if (err) throw err
    await fetchData()
    return data as EquipmentItem
  }

  const deleteEquipment = async (id: string): Promise<void> => {
    const { error: err } = await supabase.from('equipment_calibration_register').delete().eq('id', id)
    if (err) throw err
    await fetchData()
  }

  const logPatTest = async (testData: Partial<PatTestLog>): Promise<PatTestLog> => {
    const id = testData.id || crypto.randomUUID()
    const { data: authData } = await supabase.auth.getUser()

    // Compute next_test_date
    const testDate = testData.test_date ? new Date(testData.test_date) : new Date()
    const months = testData.retest_frequency_months || 6
    const nextDate = new Date(testDate)
    nextDate.setMonth(nextDate.getMonth() + months)

    const toSave = {
      ...testData,
      id,
      test_date: testDate.toISOString().slice(0, 10),
      retest_frequency_months: months,
      next_test_date: nextDate.toISOString().slice(0, 10),
      technician_id: testData.technician_id || authData?.user?.id || null,
      created_at: new Date().toISOString(),
    }

    const { data, error: err } = await supabase
      .from('pat_test_logs')
      .upsert([toSave], { onConflict: 'id' })
      .select(`
        *,
        technician:users!technician_id(id, full_name)
      `)
      .single()

    if (err) throw err
    await fetchData()
    return data as PatTestLog
  }

  const deletePatLog = async (id: string): Promise<void> => {
    const { error: err } = await supabase.from('pat_test_logs').delete().eq('id', id)
    if (err) throw err
    await fetchData()
  }

  return {
    equipment,
    patLogs,
    loading,
    error,
    refresh: fetchData,
    saveEquipment,
    deleteEquipment,
    logPatTest,
    deletePatLog,
  }
}
