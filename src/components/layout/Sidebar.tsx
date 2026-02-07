import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { NavItem } from '@/types'

const navigationItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/app/dashboard' },
  { id: 'clients', label: 'Clients', icon: 'groups', path: '/app/clients', roles: ['admin', 'manager'] },
  { id: 'projects', label: 'Projects', icon: 'work', path: '/app/projects' },
  { id: 'timesheets', label: 'Timesheets', icon: 'schedule', path: '/app/timesheets' },
  { id: 'financials', label: 'Financials', icon: 'payments', path: '/app/financials', roles: ['admin', 'manager'] },
  { id: 'activity-types', label: 'Activity Types', icon: 'category', path: '/app/settings/activity-types', roles: ['admin', 'manager'] },
  { id: 'xero', label: 'Xero Integration', icon: 'sync', path: '/app/settings/xero', roles: ['admin'] },
  { id: 'files', label: 'Files', icon: 'folder', path: '/app/files' },
  { id: 'settings', label: 'Settings', icon: 'settings', path: '/app/settings', roles: ['admin'] },
]

interface SidebarProps {
  isCollapsed: boolean
  isMobileOpen: boolean
  onToggle: () => void
  onMobileClose: () => void
}

export default function Sidebar({ isCollapsed, isMobileOpen, onToggle, onMobileClose }: SidebarProps) {
  const location = useLocation()
  const { user, logout } = useAuth()

  const filteredNav = navigationItems.filter(
    (item) => !item.roles || (user?.role && item.roles.includes(user.role))
  )

  const handleLinkClick = () => {
    if (window.innerWidth < 1024) {
      onMobileClose()
    }
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen bg-card-dark border-r border-border-dark z-50
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-border-dark">
            {!isCollapsed && (
              <Link to="/app/dashboard" className="flex items-center gap-2">
                <span className="text-gradient text-xl font-bold">AmpedFieldOps</span>
              </Link>
            )}
            <button
              onClick={onToggle}
              className="p-2 rounded-lg hover:bg-nav-hover transition-colors text-text-muted hover:text-white hidden lg:block"
            >
              <span className="material-symbols-outlined">
                {isCollapsed ? 'menu_open' : 'menu'}
              </span>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-2">
            {filteredNav.map((item) => {
              const isActive = location.pathname === item.path
              
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={handleLinkClick}
                  className={`
                    flex items-center gap-3 px-3 py-3 mb-1 rounded-lg
                    transition-all duration-200
                    ${isActive
                      ? 'bg-primary/20 text-primary border-l-4 border-primary'
                      : 'text-text-muted hover:bg-nav-hover hover:text-white'
                    }
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                  title={isCollapsed ? item.label : ''}
                >
                  <span className="material-symbols-outlined">
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <span className="font-medium">{item.label}</span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-border-dark">
            {!isCollapsed ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">
                      person
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user?.full_name || user?.email}
                    </p>
                    <p className="text-xs text-text-muted capitalize">
                      {user?.role}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => logout()}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-text-muted hover:bg-nav-hover hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">
                    logout
                  </span>
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => logout()}
                className="w-full p-2 rounded-lg text-text-muted hover:bg-nav-hover hover:text-white transition-colors"
                title="Logout"
              >
                <span className="material-symbols-outlined">
                  logout
                </span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
