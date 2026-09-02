import { useState, useEffect } from 'react'
import GlobalSearchModal from '@/components/search/GlobalSearchModal'

interface HeaderProps {
  onMenuToggle: () => void
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Listen for global keyboard shortcut Ctrl+K / Cmd+K / /
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsSearchOpen(true)
      } else if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault()
        setIsSearchOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <header className="h-16 glass-morphism border-b border-border-dark sticky top-0 z-30">
        <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-4">
          {/* Left: Menu Toggle for mobile screens */}
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-lg hover:bg-nav-hover transition-colors text-text-muted hover:text-white lg:hidden"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>

          {/* Center: Global Quick Search Trigger */}
          <div className="flex-1 max-w-xl">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="w-full h-10 px-4 pl-10 pr-3 rounded-xl bg-card-dark/70 border border-border-dark hover:border-primary/50 text-text-muted hover:text-white text-xs text-left transition-all relative flex items-center justify-between shadow-sm group"
            >
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-primary text-lg">
                search
              </span>
              <span className="truncate group-hover:text-white transition-colors">
                Search projects, POs, clients, snags, fleet...
              </span>
              <div className="hidden sm:flex items-center gap-1 shrink-0 ml-2">
                <kbd className="px-1.5 py-0.5 rounded bg-background-dark border border-border-dark text-[10px] text-text-muted font-mono font-semibold">
                  Ctrl
                </kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-background-dark border border-border-dark text-[10px] text-text-muted font-mono font-semibold">
                  K
                </kbd>
              </div>
            </button>
          </div>

          {/* Right side status indicator */}
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-text-muted font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>FieldOps Live</span>
          </div>
        </div>
      </header>

      {/* Global Spotlight Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  )
}
