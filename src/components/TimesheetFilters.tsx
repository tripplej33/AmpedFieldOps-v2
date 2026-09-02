import { useState, useEffect } from 'react'
import type { TimesheetFilters, Project, TimesheetStatus, Client } from '../types'
import { supabase } from '../lib/supabase'

interface TimesheetFiltersProps {
  onChange: (filters: TimesheetFilters) => void
  onClear: () => void
  onClose?: () => void
}

export default function TimesheetFiltersComponent({ onChange, onClear, onClose }: TimesheetFiltersProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [technicians, setTechnicians] = useState<{ id: string; full_name: string; email: string }[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [projectId, setProjectId] = useState('')
  const [clientId, setClientId] = useState('')
  const [contactType, setContactType] = useState<'all' | 'customer' | 'vendor'>('all')
  const [userId, setUserId] = useState('')
  const [status, setStatus] = useState<TimesheetStatus[]>([])

  useEffect(() => {
    const loadProjects = async () => {
      const { data } = await supabase.from('projects').select('id, name, client_id').order('name')
      setProjects((data || []) as Project[])
    }
    const loadClients = async () => {
      const { data } = await supabase.from('clients').select('id, name, contact_type, is_supplier').order('name')
      setClients((data || []) as Client[])
    }
    const loadUsers = async () => {
      const { data } = await supabase.from('users').select('id, full_name, email, role')
      const techs = (data || []).filter((u: any) => u.role === 'technician' || u.role === 'manager' || u.role === 'admin')
      setTechnicians(techs)
    }
    loadProjects()
    loadClients()
    loadUsers()
  }, [])

  const activeCount =
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0) +
    (projectId ? 1 : 0) +
    (clientId ? 1 : 0) +
    (contactType !== 'all' ? 1 : 0) +
    (userId ? 1 : 0) +
    (status.length > 0 ? 1 : 0)

  const applyFilters = (newFilters: Partial<{
    startDate: string
    endDate: string
    projectId: string
    clientId: string
    contactType: 'all' | 'customer' | 'vendor'
    userId: string
    status: TimesheetStatus[]
  }>) => {
    const sDate = newFilters.startDate !== undefined ? newFilters.startDate : startDate
    const eDate = newFilters.endDate !== undefined ? newFilters.endDate : endDate
    const pId = newFilters.projectId !== undefined ? newFilters.projectId : projectId
    const cId = newFilters.clientId !== undefined ? newFilters.clientId : clientId
    const cType = newFilters.contactType !== undefined ? newFilters.contactType : contactType
    const uId = newFilters.userId !== undefined ? newFilters.userId : userId
    const st = newFilters.status !== undefined ? newFilters.status : status

    onChange({
      startDate: sDate || undefined,
      endDate: eDate || undefined,
      projectId: pId || undefined,
      clientId: cId || undefined,
      contactType: cType !== 'all' ? cType : undefined,
      userId: uId || undefined,
      status: st.length > 0 ? st : undefined,
    })
  }

  const handleStartDate = (val: string) => {
    setStartDate(val)
    applyFilters({ startDate: val })
  }

  const handleEndDate = (val: string) => {
    setEndDate(val)
    applyFilters({ endDate: val })
  }

  const handleProject = (val: string) => {
    setProjectId(val)
    applyFilters({ projectId: val })
  }

  const handleClient = (val: string) => {
    setClientId(val)
    applyFilters({ clientId: val })
  }

  const handleContactType = (val: 'all' | 'customer' | 'vendor') => {
    setContactType(val)
    setClientId('') // Reset selected client when switching category
    applyFilters({ contactType: val, clientId: '' })
  }

  const handleUser = (val: string) => {
    setUserId(val)
    applyFilters({ userId: val })
  }

  const handleStatusToggle = (s: TimesheetStatus) => {
    const next = status.includes(s) ? status.filter((x) => x !== s) : [...status, s]
    setStatus(next)
    applyFilters({ status: next })
  }

  const handleReset = () => {
    setStartDate('')
    setEndDate('')
    setProjectId('')
    setClientId('')
    setContactType('all')
    setUserId('')
    setStatus([])
    onClear()
  }

  const filteredClientList = clients.filter((c) => {
    if (contactType === 'customer') return c.contact_type !== 'vendor'
    if (contactType === 'vendor') return c.contact_type === 'vendor' || c.is_supplier
    return true
  })

  return (
    <div className="bg-card-dark/95 backdrop-blur-md rounded-xl border border-border-dark p-4 shadow-lg shadow-black/20 space-y-3.5">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border-dark/50">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-base">filter_list</span>
          <span className="text-xs font-semibold text-white uppercase tracking-wider">Filter Timesheets</span>
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
              onClick={handleReset}
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

      {/* Row 1: Client/Vendor Category Toggle & Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
        {/* Client / Vendor Type Toggle */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-muted">Account Type</label>
          <div className="grid grid-cols-3 gap-1 bg-background-dark p-1 rounded-lg border border-border-dark h-[38px] items-center">
            <button
              type="button"
              onClick={() => handleContactType('all')}
              className={`h-[28px] rounded text-[11px] font-medium transition-all ${
                contactType === 'all' ? 'bg-primary text-white font-semibold' : 'text-text-muted hover:text-white'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => handleContactType('customer')}
              className={`h-[28px] rounded text-[11px] font-medium transition-all ${
                contactType === 'customer' ? 'bg-primary text-white font-semibold' : 'text-text-muted hover:text-white'
              }`}
            >
              Clients
            </button>
            <button
              type="button"
              onClick={() => handleContactType('vendor')}
              className={`h-[28px] rounded text-[11px] font-medium transition-all ${
                contactType === 'vendor' ? 'bg-amber-600 text-white font-semibold' : 'text-text-muted hover:text-white'
              }`}
            >
              Vendors
            </button>
          </div>
        </div>

        {/* Specific Client/Vendor Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-muted">
            {contactType === 'vendor' ? 'Vendor / Supplier' : contactType === 'customer' ? 'Client' : 'Client / Vendor'}
          </label>
          <select
            value={clientId}
            onChange={(e) => handleClient(e.target.value)}
            className="w-full h-[38px] px-3 py-2 bg-background-dark border border-border-dark rounded-lg text-xs text-white focus:outline-none focus:border-primary"
          >
            <option value="">
              {contactType === 'vendor' ? 'All Vendors' : contactType === 'customer' ? 'All Clients' : 'All Accounts'}
            </option>
            {filteredClientList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Project Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-muted">Project</label>
          <select
            value={projectId}
            onChange={(e) => handleProject(e.target.value)}
            className="w-full h-[38px] px-3 py-2 bg-background-dark border border-border-dark rounded-lg text-xs text-white focus:outline-none focus:border-primary"
          >
            <option value="">All Projects</option>
            {projects
              .filter((p) => !clientId || p.client_id === clientId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>

        {/* Technician Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-muted">Technician</label>
          <select
            value={userId}
            onChange={(e) => handleUser(e.target.value)}
            className="w-full h-[38px] px-3 py-2 bg-background-dark border border-border-dark rounded-lg text-xs text-white focus:outline-none focus:border-primary"
          >
            <option value="">All Technicians</option>
            {technicians.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Date Range & Status Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center pt-1 border-t border-border-dark/40">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-muted">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleStartDate(e.target.value)}
            className="w-full h-[38px] px-3 py-2 bg-background-dark border border-border-dark rounded-lg text-xs text-white focus:outline-none focus:border-primary"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-muted">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleEndDate(e.target.value)}
            className="w-full h-[38px] px-3 py-2 bg-background-dark border border-border-dark rounded-lg text-xs text-white focus:outline-none focus:border-primary"
          />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <label className="block text-xs font-medium text-text-muted">Status</label>
          <div className="flex items-center gap-1.5 h-[38px]">
            {(['draft', 'submitted', 'approved', 'invoiced'] as TimesheetStatus[]).map((s) => {
              const active = status.includes(s)
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleStatusToggle(s)}
                  className={`flex-1 h-[34px] rounded-lg text-xs font-medium capitalize border transition-all ${
                    active
                      ? 'bg-primary/20 border-primary text-primary shadow-sm font-semibold'
                      : 'bg-background-dark border-border-dark text-text-muted hover:text-white'
                  }`}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
