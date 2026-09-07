import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useGlobalSearch, SearchResultItem, SearchCategory } from '@/hooks/useGlobalSearch'

interface GlobalSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

const CATEGORY_TABS: { key: SearchCategory; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'projects', label: 'Projects', icon: 'folder' },
  { key: 'inventory', label: 'Inventory', icon: 'inventory_2' },
  { key: 'safety', label: 'Safety SWMS', icon: 'health_and_safety' },
  { key: 'compliance', label: 'Compliance', icon: 'verified' },
  { key: 'invoices', label: 'Invoices', icon: 'receipt_long' },
  { key: 'clients', label: 'Clients', icon: 'corporate_fare' },
  { key: 'purchase_orders', label: 'POs', icon: 'shopping_bag' },
  { key: 'team', label: 'Team', icon: 'group' },
  { key: 'files', label: 'Files', icon: 'description' },
]

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const { query, setQuery, results, loading } = useGlobalSearch()
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all')
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setSelectedIndex(0)
      setActiveCategory('all')
    } else {
      setQuery('')
    }
  }, [isOpen, setQuery])

  // Filtered results based on active tab
  const filteredResults = useMemo(() => {
    if (activeCategory === 'all') return results
    return results.filter((r) => r.category === activeCategory)
  }, [results, activeCategory])

  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredResults])

  // Count items per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    results.forEach((r) => {
      counts[r.category] = (counts[r.category] || 0) + 1
    })
    return counts
  }, [results])

  // Available tabs (show 'all' always, plus categories that have results or if query is empty)
  const availableTabs = useMemo(() => {
    if (!query) return CATEGORY_TABS
    return CATEGORY_TABS.filter((tab) => tab.key === 'all' || (categoryCounts[tab.key] || 0) > 0)
  }, [query, categoryCounts])

  // Handle Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < filteredResults.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = filteredResults[selectedIndex]
      if (selected) {
        handleSelectItem(selected)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  const handleSelectItem = (item: SearchResultItem) => {
    onClose()
    if (item.action) {
      item.action()
    } else if (item.linkUrl) {
      navigate(item.linkUrl)
    }
  }

  if (!isOpen) return null

  const modalContent = (
    <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-14 sm:pt-20 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />

      {/* Spotlight Command Container */}
      <div className="relative bg-card-dark rounded-2xl border border-border-dark shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col z-10 animate-scaleUp">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-border-dark flex items-center gap-3 bg-background-dark/95">
          <span className="material-symbols-outlined text-primary text-2xl shrink-0">
            search
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search projects, inventory, clients, SWMS, switchboards, invoices..."
            className="w-full bg-transparent border-none text-white text-sm placeholder-text-muted/60 focus:outline-none focus:ring-0 font-medium"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-text-muted hover:text-white rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-base">clear</span>
            </button>
          )}
          <span className="px-2 py-0.5 rounded-md bg-background-dark border border-border-dark text-[10px] text-text-muted font-mono shrink-0">
            ESC
          </span>
        </div>

        {/* Category Filter Pills (if results or searching) */}
        {results.length > 0 && (
          <div className="px-3 py-2 border-b border-border-dark/60 bg-background-dark/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {availableTabs.map((tab) => {
              const isActive = activeCategory === tab.key
              const count = tab.key === 'all' ? results.length : categoryCounts[tab.key] || 0
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveCategory(tab.key)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-primary text-white font-semibold shadow-sm'
                      : 'text-text-muted hover:text-white hover:bg-card-dark border border-border-dark/40'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-background-dark text-text-muted'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Results Container */}
        <div className="max-h-[400px] overflow-y-auto divide-y divide-border-dark/40 p-2 space-y-1">
          {loading ? (
            <div className="p-8 text-center text-xs text-text-muted flex items-center justify-center gap-2">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Searching authorized records...</span>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <span className="material-symbols-outlined text-4xl text-text-muted/40 block">
                search_off
              </span>
              <p className="text-xs font-semibold text-white">No matching records found</p>
              <p className="text-[11px] text-text-muted">
                {query
                  ? 'Try searching by a different term, SKU, invoice number, or client name.'
                  : 'Start typing to search across all operational modules.'}
              </p>
            </div>
          ) : (
            filteredResults.map((item, idx) => {
              const isSelected = idx === selectedIndex

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-primary/20 border border-primary/40 text-white ring-1 ring-primary/30'
                      : 'hover:bg-background-dark/80 text-text-muted'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-primary text-white' : 'bg-background-dark text-text-muted'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">{item.icon}</span>
                    </div>

                    <div className="min-w-0">
                      <p
                        className={`text-xs font-semibold truncate ${
                          isSelected ? 'text-white' : 'text-slate-200'
                        }`}
                      >
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p className="text-[11px] text-text-muted truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.badge && (
                      <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          item.badgeColor || 'bg-background-dark text-text-muted border-border-dark'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <span className="material-symbols-outlined text-sm text-text-muted/60">
                      arrow_forward
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="px-4 py-2.5 bg-background-dark/90 border-t border-border-dark flex items-center justify-between text-[11px] text-text-muted font-mono">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-card-dark border border-border-dark text-[10px]">
                ↑
              </kbd>{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-card-dark border border-border-dark text-[10px]">
                ↓
              </kbd>{' '}
              to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-card-dark border border-border-dark text-[10px]">
                ↵
              </kbd>{' '}
              to select
            </span>
          </div>
          <span>Amped Spotlight</span>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
