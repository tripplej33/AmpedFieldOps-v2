import { useState, useEffect } from 'react'
import type { TimesheetFilters, Project, TimesheetStatus } from '../types'
import Input from './ui/Input'
import Select from './ui/Select'
import Button from './ui/Button'
import { supabase } from '../lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface TimesheetFiltersProps {
  onChange: (filters: TimesheetFilters) => void
  onClear: () => void
}

export default function TimesheetFilters({ onChange, onClear }: TimesheetFiltersProps) {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [filters, setFilters] = useState<TimesheetFilters>({})
  const [statusSelections, setStatusSelections] = useState<Record<TimesheetStatus, boolean>>({} as Record<TimesheetStatus, boolean>)
  const [isManager, setIsManager] = useState(false)
  const [technicians, setTechnicians] = useState<{ id: string; full_name: string; email: string }[]>([])

  useEffect(() => {
    const loadProjects = async () => {
      const { data } = await supabase.from('projects').select('*').order('name')
      setProjects((data || []) as Project[])
    }
    const loadUsers = async () => {
      const { data } = await supabase.from('users').select('id, full_name, email, role')
      const techs = (data || []).filter((u: any) => u.role === 'technician' || u.role === 'manager')
      setTechnicians(techs)
    }
    loadProjects()
    loadUsers()
  }, [])

  useEffect(() => {
    onChange(filters)
  }, [filters])

  useEffect(() => {
    setIsManager(user?.role === 'manager' || user?.role === 'admin')
  }, [user?.role])

  return (
    <div className="bg-card-dark border border-border-dark rounded-lg p-4 space-y-4">
      <h3 className="text-white font-semibold flex items-center gap-2">
        <span className="material-symbols-outlined">filter_alt</span>
        Filters
      </h3>
      <div className="space-y-3">
        <Input
          label="Start Date"
          type="date"
          value={filters.startDate || ''}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
        />
        <Input
          label="End Date"
          type="date"
          value={filters.endDate || ''}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
        />
        <Select
          label="Project"
          value={filters.projectId || ''}
          onChange={(e) => setFilters({ ...filters, projectId: e.target.value || undefined })}
          options={[{ value: '', label: 'All Projects' }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
        />
        <div>
          <label className="block text-sm font-medium text-text-muted mb-1.5">Status</label>
          <div className="grid grid-cols-2 gap-2">
            {(['draft', 'submitted', 'approved', 'invoiced'] as TimesheetStatus[]).map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm text-white">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={!!statusSelections[s]}
                  onChange={(e) => {
                    const next: Record<TimesheetStatus, boolean> = { ...statusSelections, [s]: e.target.checked }
                    setStatusSelections(next)
                    const selected = Object.entries(next).filter(([_, v]) => v).map(([k]) => k as TimesheetStatus)
                    setFilters({ ...filters, status: selected.length ? selected : undefined })
                  }}
                />
                <span className="capitalize">{s}</span>
              </label>
            ))}
          </div>
        </div>
        {isManager && (
          <Select
            label="Technician"
            value={filters.userId || ''}
            onChange={(e) => setFilters({ ...filters, userId: e.target.value || undefined })}
            options={[{ value: '', label: 'All Technicians' }, ...technicians.map((u) => ({ value: u.id, label: u.full_name || u.email }))]}
          />
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => { setFilters({}); setStatusSelections({} as Record<TimesheetStatus, boolean>); onClear() }}>Clear Filters</Button>
      </div>
    </div>
  )
}
