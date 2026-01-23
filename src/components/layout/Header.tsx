interface HeaderProps {
  onMenuToggle: () => void
}

export default function Header({ onMenuToggle }: HeaderProps) {
  return (
    <header className="h-16 glass-morphism border-b border-border-dark sticky top-0 z-30">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-4">
        {/* Left: Menu Toggle */}
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg hover:bg-nav-hover transition-colors text-text-muted hover:text-white lg:hidden"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        {/* Center: Search (Optional - Placeholder for now) */}
        <div className="flex-1 max-w-xl hidden md:block">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              className="w-full px-4 py-2 pl-10 rounded-lg bg-card-dark/50 border border-border-dark text-white placeholder-text-disabled focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xl">
              search
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-nav-hover transition-colors text-text-muted hover:text-white relative">
            <span className="material-symbols-outlined">notifications</span>
            {/* Notification Badge */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-accent-amber rounded-full" />
          </button>
          
          <button className="p-2 rounded-lg hover:bg-nav-hover transition-colors text-text-muted hover:text-white">
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </div>
    </header>
  )
}
