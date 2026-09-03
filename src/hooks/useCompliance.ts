import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  ElectricalTestSheet,
  ElectricalCertificate,
  SwitchboardSchedule,
} from '@/types/compliance'

export function useCompliance(projectId?: string) {
  const [testSheets, setTestSheets] = useState<ElectricalTestSheet[]>([])
  const [certificates, setCertificates] = useState<ElectricalCertificate[]>([])
  const [switchboards, setSwitchboards] = useState<SwitchboardSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let testQuery = supabase
        .from('electrical_test_sheets')
        .select(`
          *,
          technician:users!technician_id(id, full_name, email),
          project:projects(id, name, address, suburb, city, client:clients(name))
        `)
        .order('test_date', { ascending: false })

      let certQuery = supabase
        .from('electrical_certificates')
        .select(`
          *,
          test_sheet:electrical_test_sheets(*),
          project:projects(id, name, address, suburb, city, client:clients(name))
        `)
        .order('certification_date', { ascending: false })

      let boardQuery = supabase
        .from('switchboard_schedules')
        .select('*')
        .order('created_at', { ascending: false })

      if (projectId) {
        testQuery = testQuery.eq('project_id', projectId)
        certQuery = certQuery.eq('project_id', projectId)
        boardQuery = boardQuery.eq('project_id', projectId)
      }

      const [testRes, certRes, boardRes] = await Promise.all([testQuery, certQuery, boardQuery])

      if (testRes.error) throw testRes.error
      if (certRes.error) throw certRes.error
      if (boardRes.error) throw boardRes.error

      if (isMountedRef.current) {
        setTestSheets((testRes.data || []) as ElectricalTestSheet[])
        setCertificates((certRes.data || []) as ElectricalCertificate[])
        setSwitchboards((boardRes.data || []) as SwitchboardSchedule[])
      }
    } catch (err) {
      console.error('[useCompliance] Error loading compliance data:', err)
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load compliance records')
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [projectId])

  useEffect(() => {
    isMountedRef.current = true
    fetchData()

    // Realtime channel
    const channel = supabase
      .channel('compliance_realtime_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'electrical_test_sheets' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'electrical_certificates' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'switchboard_schedules' }, () => fetchData())
      .subscribe()

    return () => {
      isMountedRef.current = false
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  // --- Test Sheets CRUD ---
  const saveTestSheet = async (payload: Partial<ElectricalTestSheet>): Promise<ElectricalTestSheet> => {
    const id = payload.id || crypto.randomUUID()
    const { data: authData } = await supabase.auth.getUser()

    const toSave = {
      ...payload,
      id,
      updated_at: new Date().toISOString(),
      created_by: authData?.user?.id || null,
    }

    const { data, error: err } = await supabase
      .from('electrical_test_sheets')
      .upsert([toSave], { onConflict: 'id' })
      .select(`
        *,
        technician:users!technician_id(id, full_name, email),
        project:projects(id, name, address, suburb, city, client:clients(name))
      `)
      .single()

    if (err) throw err
    await fetchData()
    return data as ElectricalTestSheet
  }

  const deleteTestSheet = async (id: string): Promise<void> => {
    const { error: err } = await supabase.from('electrical_test_sheets').delete().eq('id', id)
    if (err) throw err
    await fetchData()
  }

  // --- Certificates CRUD ---
  const saveCertificate = async (payload: Partial<ElectricalCertificate>): Promise<ElectricalCertificate> => {
    const id = payload.id || crypto.randomUUID()
    const { data: authData } = await supabase.auth.getUser()

    const toSave = {
      ...payload,
      id,
      updated_at: new Date().toISOString(),
      created_by: authData?.user?.id || null,
    }

    const { data, error: err } = await supabase
      .from('electrical_certificates')
      .upsert([toSave], { onConflict: 'id' })
      .select(`
        *,
        test_sheet:electrical_test_sheets(*),
        project:projects(id, name, address, suburb, city, client:clients(name))
      `)
      .single()

    if (err) throw err
    await fetchData()
    return data as ElectricalCertificate
  }

  const deleteCertificate = async (id: string): Promise<void> => {
    const { error: err } = await supabase.from('electrical_certificates').delete().eq('id', id)
    if (err) throw err
    await fetchData()
  }

  // --- Switchboard Schedules CRUD ---
  const saveSwitchboard = async (payload: Partial<SwitchboardSchedule>): Promise<SwitchboardSchedule> => {
    const id = payload.id || crypto.randomUUID()
    const { data: authData } = await supabase.auth.getUser()

    const toSave = {
      ...payload,
      id,
      updated_at: new Date().toISOString(),
      created_by: authData?.user?.id || null,
    }

    const { data, error: err } = await supabase
      .from('switchboard_schedules')
      .upsert([toSave], { onConflict: 'id' })
      .select('*')
      .single()

    if (err) throw err
    await fetchData()
    return data as SwitchboardSchedule
  }

  const deleteSwitchboard = async (id: string): Promise<void> => {
    const { error: err } = await supabase.from('switchboard_schedules').delete().eq('id', id)
    if (err) throw err
    await fetchData()
  }

  return {
    testSheets,
    certificates,
    switchboards,
    loading,
    error,
    refresh: fetchData,
    saveTestSheet,
    deleteTestSheet,
    saveCertificate,
    deleteCertificate,
    saveSwitchboard,
    deleteSwitchboard,
  }
}
