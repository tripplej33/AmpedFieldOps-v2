import { useState } from 'react'
import type { ProjectFilters as ProjectFiltersType, ProjectStatus } from '../types'
import ClientSelect from './ClientSelect'

interface ProjectFiltersProps {
  onFilterChange: (filters: ProjectFiltersType) => void
  onClear: () => void
  onClose?: () => void
}

export default function ProjectFilters({ onFilterChange, onClear, onClose }: ProjectFiltersProps) {
  const [status, setStatus] = useState<ProjectStatus[]>([])
  const [clientId, setClientId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const activeCount = (status.length > 0 ? 1 : 0) + (clientId ? 1 : 0) + (startDate ? 1 : 0) + (endDate ? 1 : 0)

  const handleStatusChange = (newStatus: string) => {
    const updatedStatus = newStatus ? ([newStatus as ProjectStatus] as ProjectStatus[]) : []
    setStatus(updatedStatus)
    onFilterChange({
      status: updatedStatus.length > 0 ? updatedStatus : undefined,
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
    const sDate = type === 'start' ? value : startDate
    const eDate = type === 'end' ? value : endDate

    if (type === 'start') setStartDate(value)
    else setEndDate(value)

    onFilterChange({
      status: status.length > 0 ? status : undefined,
      clientId: clientId || undefined,
      startDate: sDate || undefined,
      endDate: eDate || undefined,
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
    <div className="bg-card-dark/95 backdrop-blur-md rounded-xl border border-border-dark p-3.5 shadow-md">
      <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-border-dark/50">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-base">filter_list</span>
          <span className="text-xs font-semibold text-white uppercase tracking-wider">Filter Projects</span>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[11px] font-bold">
              {activeCount} active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-text-muted hover:text-red-400 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-background-dark"
            >
              <span className="material-symbols-outlined text-sm">restart_alt</span>
              Reset
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-text-muted hover:text-white p-1 rounded-lg hover:bg-background-dark transition-colors"
              title="Close filter bar"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Consistent Horizontal Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
        {/* 1. Status Filter */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-muted">Status</label>
          <select
            value={status[0] || ''}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full h-[38px] px-3 py-2 bg-background-dark border border-border-dark rounded-lg text-xs text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
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

        {/* 2. Client Search Selector */}
        <div>
          <ClientSelect
            label="Client"
            required={false}
            compact={true}
            placeholder="All Clients"
            value={clientId}
            onChange={handleClientChange}
          />
        </div>

        {/* 3. Start Date */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-muted">Started On or After</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange('start', e.target.value)}
            className="w-full h-[38px] px-3 py-2 bg-background-dark border border-border-dark rounded-lg text-xs text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
          />
        </div>

        {/* 4. End Date */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-muted">Due On or Before</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleDateChange('end', e.target.value)}
            className="w-full h-[38px] px-3 py-2 bg-background-dark border border-border-dark rounded-lg text-xs text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
          />
        </div>
      </div>
    </div>
  )
}
