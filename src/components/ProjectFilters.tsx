import { useState } from 'react'
import type { ProjectFilters as ProjectFiltersType, ProjectStatus } from '../types'
import Button from './ui/Button'
import Input from './ui/Input'


interface ProjectFiltersProps {
  onFilterChange: (filters: ProjectFiltersType) => void
  onClear: () => void
}

export default function ProjectFilters({ onFilterChange, onClear }: ProjectFiltersProps) {
  const [status, setStatus] = useState<ProjectStatus[]>([])
  const [clientId, setClientId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === '') {
      setStatus([])
    } else {
      setStatus([newStatus as ProjectStatus])
    }
    onFilterChange({
      status: newStatus ? ([newStatus as ProjectStatus] as ProjectStatus[]) : undefined,
      clientId: clientId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })
  }

  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId)
    onFilterChange({
      status: status.length > 0 ? status : undefined,
      clientId: newClientId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })
  }

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setStartDate(value)
    } else {
      setEndDate(value)
    }
    onFilterChange({
      status: status.length > 0 ? status : undefined,
      clientId: clientId || undefined,
      startDate: type === 'start' ? value || undefined : startDate || undefined,
      endDate: type === 'end' ? value || undefined : endDate || undefined,
    })
  }

  const handleClear = () => {
    setStatus([])
    setClientId('')
    setStartDate('')
    setEndDate('')
    onClear()
  }

  return (
    <div className="bg-card-dark rounded-lg border border-border-dark p-4 space-y-4">
      <h3 className="font-semibold text-white flex items-center gap-2">
        <span className="material-symbols-outlined">tune</span>
        Filters
      </h3>

      <div>
        <label className="block text-sm font-medium text-text-muted mb-2">Status</label>
        <select
          value={status[0] || ''}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="w-full px-4 py-2 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Active">Active</option>
          <option value="On Hold">On Hold</option>
          <option value="Completed">Completed</option>
          <option value="Invoiced">Invoiced</option>
          <option value="Archived">Archived</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-muted mb-2">Client</label>
        <Input
          type="text"
          placeholder="Filter by client ID..."
          value={clientId}
          onChange={(e) => handleClientChange(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">Start Date</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange('start', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">End Date</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => handleDateChange('end', e.target.value)}
          />
        </div>
      </div>

      <Button variant="secondary" onClick={handleClear} className="w-full">
        <span className="material-symbols-outlined text-base">clear</span>
        Clear All Filters
      </Button>
    </div>
  )
}
