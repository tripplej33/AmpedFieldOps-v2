import { useState } from 'react'
import Input from './ui/Input'
import Button from './ui/Button'
import { ClientsFilters } from '../hooks/useClients'

interface ClientFiltersProps {
  onFiltersChange: (filters: ClientsFilters) => void
  isLoading?: boolean
}

export default function ClientFilters({ onFiltersChange, isLoading = false }: ClientFiltersProps) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('all')
  const [contactType, setContactType] = useState<'all' | 'customer' | 'vendor'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'created_at'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const handleFilterChange = (
    newType = contactType,
    newStatus = status,
    newSortBy = sortBy,
    newSortOrder = sortOrder,
    newSearch = search
  ) => {
    onFiltersChange({
      search: newSearch || undefined,
      status: newStatus,
      contactType: newType,
      sortBy: newSortBy,
      sortOrder: newSortOrder,
    })
  }

  const handleClearAll = () => {
    setSearch('')
    setStatus('all')
    setContactType('all')
    setSortBy('name')
    setSortOrder('asc')
    onFiltersChange({
      search: undefined,
      status: 'all',
      contactType: 'all',
      sortBy: 'name',
      sortOrder: 'asc',
    })
  }

  return (
    <div className="bg-card-dark border border-border-dark rounded-xl p-4 space-y-4 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Filters & Views</h3>
        {(search || status !== 'all' || contactType !== 'all') && (
          <button
            onClick={handleClearAll}
            className="text-[11px] text-primary hover:underline font-medium"
          >
            Reset
          </button>
        )}
      </div>

      {/* Contact Type: Clients vs Vendors */}
      <div>
        <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
          Directory Type
        </label>
        <div className="grid grid-cols-3 gap-1 bg-background-dark p-1 rounded-lg border border-border-dark">
          <button
            type="button"
            onClick={() => {
              setContactType('all')
              handleFilterChange('all')
            }}
            className={`py-1.5 px-2 rounded text-xs font-medium transition-all ${
              contactType === 'all'
                ? 'bg-primary text-white font-semibold shadow-sm'
                : 'text-text-muted hover:text-white'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => {
              setContactType('customer')
              handleFilterChange('customer')
            }}
            className={`py-1.5 px-2 rounded text-xs font-medium transition-all flex items-center justify-center gap-1 ${
              contactType === 'customer'
                ? 'bg-primary text-white font-semibold shadow-sm'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <span>Clients</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setContactType('vendor')
              handleFilterChange('vendor')
            }}
            className={`py-1.5 px-2 rounded text-xs font-medium transition-all flex items-center justify-center gap-1 ${
              contactType === 'vendor'
                ? 'bg-amber-600 text-white font-semibold shadow-sm'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <span>Vendors</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div>
        <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
          Search Directory
        </label>
        <Input
          type="text"
          placeholder="Name, contact, email, phone..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setSearch(e.target.value)
            handleFilterChange(contactType, status, sortBy, sortOrder, e.target.value)
          }}
          disabled={isLoading}
        />
      </div>

      {/* Status Filter */}
      <div>
        <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
          Status
        </label>
        <select
          value={status}
          onChange={(e) => {
            const val = e.target.value as 'active' | 'inactive' | 'all'
            setStatus(val)
            handleFilterChange(contactType, val)
          }}
          disabled={isLoading}
          className="bg-background-dark border border-border-dark rounded-lg px-3 py-2 text-white text-xs w-full focus:outline-none focus:border-primary"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Sort By & Order */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
            Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => {
              const val = e.target.value as 'name' | 'created_at'
              setSortBy(val)
              handleFilterChange(contactType, status, val)
            }}
            disabled={isLoading}
            className="bg-background-dark border border-border-dark rounded-lg px-2.5 py-2 text-white text-xs w-full focus:outline-none focus:border-primary"
          >
            <option value="name">Name</option>
            <option value="created_at">Date Added</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
            Order
          </label>
          <select
            value={sortOrder}
            onChange={(e) => {
              const val = e.target.value as 'asc' | 'desc'
              setSortOrder(val)
              handleFilterChange(contactType, status, sortBy, val)
            }}
            disabled={isLoading}
            className="bg-background-dark border border-border-dark rounded-lg px-2.5 py-2 text-white text-xs w-full focus:outline-none focus:border-primary"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </div>

      <div className="pt-2">
        <Button
          onClick={() => handleFilterChange()}
          disabled={isLoading}
          className="w-full bg-primary hover:bg-primary/90 text-white text-xs font-semibold h-[36px]"
        >
          Apply Filters
        </Button>
      </div>
    </div>
  )
}
