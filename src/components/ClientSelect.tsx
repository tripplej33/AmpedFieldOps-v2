import { useState, useRef, useEffect } from 'react'
import { useAllClients } from '../hooks/useClients'

interface ClientSelectProps {
  value?: string
  onChange: (clientId: string) => void
  error?: string
  label?: string
  required?: boolean
  placeholder?: string
  compact?: boolean
  defaultCategory?: 'all' | 'customer' | 'vendor'
}

export default function ClientSelect({
  value,
  onChange,
  error,
  label = 'Client / Account',
  required = true,
  placeholder = 'Select or search for a client...',
  compact = false,
  defaultCategory = 'all',
}: ClientSelectProps) {
  const { clients, loading } = useAllClients()
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'customer' | 'vendor'>(defaultCategory)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedClient = clients.find((c) => c.id === value)

  const filteredClients = clients.filter((c) => {
    // 1. Category Filter
    if (categoryFilter === 'customer') {
      if (c.contact_type === 'vendor' && !c.is_customer) return false
    } else if (categoryFilter === 'vendor') {
      const isVendor = c.contact_type === 'vendor' || c.is_supplier === true || c.contact_type === 'both'
      if (!isVendor) return false
    }

    // 2. Search Filter
    if (!search.trim()) return true
    const term = search.toLowerCase()
    const name = (c.name || '').toLowerCase()
    const contact = (c.contact_name || '').toLowerCase()
    const email = (c.email || '').toLowerCase()
    const phone = (c.phone || '').toLowerCase()
    return name.includes(term) || contact.includes(term) || email.includes(term) || phone.includes(term)
  })

  return (
    <div className="space-y-1.5 relative" ref={containerRef}>
      {label && (
        <label className={`block font-medium text-text-muted ${compact ? 'text-xs' : 'text-sm'}`}>
          {label} {required && <span className="text-primary">*</span>}
        </label>
      )}

      {/* Trigger Button / Selected Display */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-background-dark border rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
          compact ? 'h-[38px] px-3 py-1.5 text-xs' : 'h-10 px-3.5 py-2 text-sm'
        } ${
          error
            ? 'border-red-500'
            : isOpen
            ? 'border-primary ring-1 ring-primary/30'
            : 'border-border-dark hover:border-border-dark/80'
        }`}
      >
        {loading ? (
          <span className="text-text-muted text-xs flex items-center gap-1.5">
            <span className="animate-spin material-symbols-outlined text-xs text-primary">sync</span>
            Loading directory...
          </span>
        ) : selectedClient ? (
          <div className="flex items-center gap-2 min-w-0 pr-1">
            <span
              className={`material-symbols-outlined shrink-0 ${
                selectedClient.contact_type === 'vendor' || selectedClient.is_supplier
                  ? 'text-amber-400'
                  : 'text-primary'
              } ${compact ? 'text-base' : 'text-lg'}`}
            >
              {selectedClient.contact_type === 'vendor' || selectedClient.is_supplier
                ? 'storefront'
                : 'domain'}
            </span>
            <div className="truncate flex items-center gap-1.5">
              <span className={`text-white font-medium ${compact ? 'text-xs' : 'text-sm'}`}>
                {selectedClient.name}
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-semibold border ${
                  selectedClient.contact_type === 'vendor' || selectedClient.is_supplier
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-primary/10 text-primary border-primary/20'
                }`}
              >
                {selectedClient.contact_type === 'vendor' || selectedClient.is_supplier ? 'Vendor' : 'Client'}
              </span>
              {selectedClient.contact_name && (
                <span className="text-text-muted text-[11px] truncate">
                  ({selectedClient.contact_name})
                </span>
              )}
            </div>
          </div>
        ) : (
          <span className={`text-text-muted/60 truncate ${compact ? 'text-xs' : 'text-sm'}`}>{placeholder}</span>
        )}

        <div className="flex items-center gap-0.5 shrink-0 ml-1">
          {selectedClient && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
              }}
              className="text-text-muted hover:text-red-400 p-0.5"
              title="Clear selection"
            >
              <span className="material-symbols-outlined text-xs">close</span>
            </button>
          )}
          <span
            className={`material-symbols-outlined text-text-muted transition-transform ${
              compact ? 'text-base' : 'text-lg'
            } ${isOpen ? 'rotate-180' : ''}`}
          >
            expand_more
          </span>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-card-dark border border-border-dark rounded-xl shadow-2xl overflow-hidden animate-fadeIn min-w-[290px]">
          {/* Header Segment: All | Clients | Vendors */}
          <div className="p-2 border-b border-border-dark bg-background-dark/95 space-y-2">
            <div className="grid grid-cols-3 gap-1 bg-card-dark p-1 rounded-lg border border-border-dark">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setCategoryFilter('all')
                }}
                className={`py-1 rounded text-[11px] font-semibold transition-all ${
                  categoryFilter === 'all'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setCategoryFilter('customer')
                }}
                className={`py-1 rounded text-[11px] font-semibold transition-all ${
                  categoryFilter === 'customer'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                Clients
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setCategoryFilter('vendor')
                }}
                className={`py-1 rounded text-[11px] font-semibold transition-all ${
                  categoryFilter === 'vendor'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                Vendors
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-text-muted text-base">
                search
              </span>
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, contact, or email..."
                className="w-full pl-8 pr-4 py-1.5 bg-background-dark border border-border-dark rounded-lg text-xs text-white placeholder-text-muted/50 focus:outline-none focus:border-primary"
                onClick={(e) => e.stopPropagation()}
              />
              {search && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSearch('')
                  }}
                  className="absolute right-2 top-1.5 text-text-muted hover:text-white"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Client List Options */}
          <div className="max-h-60 overflow-y-auto divide-y divide-border-dark/40">
            {filteredClients.length === 0 ? (
              <div className="p-4 text-center text-text-muted text-xs">
                <span className="material-symbols-outlined text-xl mb-1 text-text-muted/50">
                  person_search
                </span>
                <p>No {categoryFilter === 'vendor' ? 'vendors' : 'clients'} found matching "{search}"</p>
              </div>
            ) : (
              filteredClients.map((client) => {
                const isSelected = client.id === value
                const isVendor = client.contact_type === 'vendor' || client.is_supplier === true

                return (
                  <div
                    key={client.id}
                    onClick={() => {
                      onChange(client.id)
                      setIsOpen(false)
                      setSearch('')
                    }}
                    className={`px-3.5 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-primary/20 text-white font-semibold'
                        : 'hover:bg-background-dark text-text-muted hover:text-white'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-white truncate">{client.name}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-semibold border ${
                            isVendor
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-primary/10 text-primary border-primary/20'
                          }`}
                        >
                          {isVendor ? 'Vendor' : 'Client'}
                        </span>
                        {client.status === 'inactive' && (
                          <span className="px-1 py-0.5 rounded text-[9px] bg-red-900/30 text-red-400">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-text-muted mt-0.5">
                        {client.contact_name && <span>{client.contact_name}</span>}
                        {client.email && <span>• {client.email}</span>}
                      </div>
                    </div>

                    {isSelected && (
                      <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer Total Indicator */}
          <div className="px-3.5 py-1.5 bg-background-dark/90 border-t border-border-dark flex items-center justify-between text-[11px] text-text-muted">
            <span>
              Showing {filteredClients.length} of {clients.length}
            </span>
            <span className="text-primary font-medium capitalize">
              {categoryFilter === 'all' ? 'All Accounts' : categoryFilter === 'vendor' ? 'Vendors Only' : 'Clients Only'}
            </span>
          </div>
        </div>
      )}

      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}
