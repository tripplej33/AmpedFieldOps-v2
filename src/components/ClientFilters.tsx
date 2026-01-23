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
  const [sortBy, setSortBy] = useState<'name' | 'created_at'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const handleFilterChange = () => {
    onFiltersChange({
      search: search || undefined,
      status,
      sortBy,
      sortOrder,
    })
  }

  const handleClearAll = () => {
    setSearch('')
    setStatus('all')
    setSortBy('name')
    setSortOrder('asc')
    onFiltersChange({
      search: undefined,
      status: 'all',
      sortBy: 'name',
      sortOrder: 'asc',
    })
  }

  return (
    <div className="bg-card-dark border border-border-dark rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold text-white font-display">Filters</h3>

      {/* Search */}
      <div>
        <label className="block text-xs font-medium text-text-muted mb-2">Search</label>
        <Input
          type="text"
          placeholder="Name, company, email, phone..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleFilterChange()
            }
          }}
        />
      </div>

      {/* Status Filter */}
      <div>
        <label className="block text-xs font-medium text-text-muted mb-2">Status</label>
        <select
          value={status}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value as 'active' | 'inactive' | 'all')}
          disabled={isLoading}
          className="bg-background-dark border border-border-dark rounded px-3 py-2 text-white text-sm w-full focus:outline-none focus:border-primary"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Sort By */}
      <div>
        <label className="block text-xs font-medium text-text-muted mb-2">Sort By</label>
        <select
          value={sortBy}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as 'name' | 'created_at')}
          disabled={isLoading}
          className="bg-background-dark border border-border-dark rounded px-3 py-2 text-white text-sm w-full focus:outline-none focus:border-primary"
        >
          <option value="name">Name</option>
          <option value="created_at">Created Date</option>
        </select>
      </div>

      {/* Sort Order */}
      <div>
        <label className="block text-xs font-medium text-text-muted mb-2">Order</label>
        <select
          value={sortOrder}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortOrder(e.target.value as 'asc' | 'desc')}
          disabled={isLoading}
          className="bg-background-dark border border-border-dark rounded px-3 py-2 text-white text-sm w-full focus:outline-none focus:border-primary"
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleFilterChange}
          disabled={isLoading}
          className="flex-1 bg-primary hover:bg-primary/90 text-white"
        >
          Apply
        </Button>
        <Button
          onClick={handleClearAll}
          disabled={isLoading}
          variant="secondary"
          className="flex-1"
        >
          Clear
        </Button>
      </div>
    </div>
  )
}
