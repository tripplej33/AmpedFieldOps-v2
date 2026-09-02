import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useGlobalSearch, SearchResultItem } from '@/hooks/useGlobalSearch'

interface GlobalSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const { query, setQuery, results, loading } = useGlobalSearch()
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setSelectedIndex(0)
    } else {
      setQuery('')
    }
  }, [isOpen, setQuery])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  // Handle Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = results[selectedIndex]
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
    <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-16 sm:pt-24 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />

      {/* Spotlight Command Container */}
      <div className="relative bg-card-dark rounded-2xl border border-border-dark shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col z-10 animate-scaleUp">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-border-dark flex items-center gap-3 bg-background-dark/90">
          <span className="material-symbols-outlined text-primary text-2xl shrink-0">
            search
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search projects, purchase orders, clients, snags, fleet..."
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

        {/* Results Container */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-border-dark/40 p-2 space-y-1">
          {loading ? (
            <div className="p-8 text-center text-xs text-text-muted flex items-center justify-center gap-2">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Searching authorized records...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <span className="material-symbols-outlined text-4xl text-text-muted/40 block">
                search_off
              </span>
              <p className="text-xs font-semibold text-white">No matching records found</p>
              <p className="text-[11px] text-text-muted">
                Try searching by project name, address, PO number, or client company.
              </p>
            </div>
          ) : (
            results.map((item, idx) => {
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
        <div className="px-4 py-2.5 bg-background-dark/80 border-t border-border-dark flex items-center justify-between text-[11px] text-text-muted font-mono">
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
