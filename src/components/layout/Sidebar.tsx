import { useState, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/hooks/useNotifications'
import { useTerminology } from '@/hooks/useTerminology'
import NotificationDropdown from './NotificationDropdown'
import UserAvatar from '@/components/ui/UserAvatar'
import { NavItem } from '@/types'
import type { ModuleKey } from '@/types/trade'

interface SidebarProps {
  isCollapsed: boolean
  isMobileOpen: boolean
  onToggle: () => void
  onMobileClose: () => void
}

export default function Sidebar({ isCollapsed, isMobileOpen, onToggle, onMobileClose }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { t, isModuleEnabled } = useTerminology()
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)

  const {
    notifications,
    sentNotifications,
    unreadCount,
    loading: notificationsLoading,
    markAsRead,
    markAllAsRead,
    acknowledgeNotification,
    declineNotification,
    clearNotificationHistory,
  } = useNotifications()

  const isSettingsActive = location.pathname.startsWith('/app/settings')
  const isProfileActive = location.pathname.startsWith('/app/profile')

  const navigationItems = useMemo((): (NavItem & { moduleKey?: ModuleKey })[] => [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/app/dashboard', moduleKey: 'dashboard' },
    { id: 'clients', label: t('clients', 'Clients'), icon: 'groups', path: '/app/clients', roles: ['admin', 'manager'], moduleKey: 'clients' },
    { id: 'projects', label: t('projects', 'Projects'), icon: 'work', path: '/app/projects', moduleKey: 'projects' },
    { id: 'schedule', label: t('schedule', 'Schedule & Dispatch'), icon: 'calendar_month', path: '/app/schedule', moduleKey: 'schedule' },
    { id: 'purchase-orders', label: t('purchaseOrders', 'Purchase Orders'), icon: 'shopping_cart', path: '/app/purchase-orders', roles: ['admin', 'manager'], moduleKey: 'purchaseOrders' },
    { id: 'van-stock', label: t('vanStock', 'Van Stock & Materials'), icon: 'local_shipping', path: '/app/van-stock', moduleKey: 'vanStock' },
    { id: 'fleet', label: t('fleet', 'Fleet & Vehicles'), icon: 'directions_car', path: '/app/fleet', moduleKey: 'fleet' },
    { id: 'safety', label: t('safety', 'Safety & Permits'), icon: 'shield_with_heart', path: '/app/safety', moduleKey: 'safety' },
    { id: 'compliance', label: t('compliance', 'Testing & CoC/ESC'), icon: 'verified', path: '/app/compliance', moduleKey: 'compliance' },
    { id: 'timesheets', label: t('timesheets', 'Timesheets'), icon: 'schedule', path: '/app/timesheets', moduleKey: 'timesheets' },
    { id: 'financials', label: t('financials', 'Financials'), icon: 'payments', path: '/app/financials', roles: ['admin', 'manager'], moduleKey: 'financials' },
    { id: 'files', label: t('files', 'Files Hub'), icon: 'folder', path: '/app/files', moduleKey: 'files' },
    { id: 'settings', label: 'Settings & Team', icon: 'settings', path: '/app/settings', roles: ['admin', 'manager'] },
  ], [t])

  const filteredNav = useMemo(() => {
    return navigationItems.filter((item) => {
      // 1. Check user role permissions
      const roleAllowed = !item.roles || (user?.role && item.roles.includes(user.role))
      if (!roleAllowed) return false

      // 2. Check trade module enabled flag
      if (item.moduleKey && !isModuleEnabled(item.moduleKey)) return false

      return true
    })
  }, [navigationItems, user?.role, isModuleEnabled])

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
          transition-all duration-300 ease-in-out flex flex-col justify-between
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-border-dark shrink-0">
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

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
            {filteredNav.map((item) => {
              const isActive = location.pathname === item.path

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={handleLinkClick}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg
                    transition-all duration-200
                    ${isActive
                      ? 'bg-primary/20 text-primary border-l-4 border-primary font-semibold'
                      : 'text-text-muted hover:bg-nav-hover hover:text-white'
                    }
                    ${isCollapsed ? 'justify-center px-0' : ''}
                  `}
                  title={isCollapsed ? item.label : ''}
                >
                  <span className="material-symbols-outlined text-xl">
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <span className="text-xs font-medium truncate">{item.label}</span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* User Profile & Action Toolbar Footer */}
        <div className="p-3 border-t border-border-dark shrink-0 relative bg-background-dark/40">
          {/* Notification Popover Dropdown */}
          <NotificationDropdown
            isOpen={isNotificationOpen}
            onClose={() => setIsNotificationOpen(false)}
            notifications={notifications}
            sentNotifications={sentNotifications}
            loading={notificationsLoading}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onAcknowledge={acknowledgeNotification}
            onDecline={declineNotification}
            onClearHistory={clearNotificationHistory}
            placement={isCollapsed ? 'sidebar-collapsed' : 'sidebar'}
          />

          {!isCollapsed ? (
            <div className="space-y-2.5">
              {/* User Identity Card */}
              <Link
                to="/app/profile"
                onClick={handleLinkClick}
                className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all ${
                  isProfileActive
                    ? 'bg-primary/20 border-primary shadow-sm'
                    : 'bg-card-dark/80 border-border-dark/80 hover:border-primary/40 hover:bg-card-dark'
                }`}
                title="View & Edit My Profile"
              >
                <UserAvatar user={user} size="sm" showRoleBadge />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {user?.full_name || user?.email}
                  </p>
                  <p className="text-[10px] text-text-muted capitalize truncate">
                    {user?.role || 'Staff'} - Profile Settings
                  </p>
                </div>
              </Link>

              {/* Bottom Quick Actions Row: Bell, Cog, Sign Out */}
              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                {/* Notification Bell */}
                <button
                  type="button"
                  onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                  className={`h-[34px] rounded-lg border text-text-muted hover:text-white flex items-center justify-center relative transition-colors ${
                    isNotificationOpen
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-card-dark/60 border-border-dark hover:bg-nav-hover'
                  }`}
                  title="Alerts & Notifications"
                >
                  <span className="material-symbols-outlined text-lg">notifications</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center shadow-sm">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Settings Cog */}
                <button
                  type="button"
                  onClick={() => {
                    handleLinkClick()
                    navigate('/app/settings')
                  }}
                  className={`h-[34px] rounded-lg border text-text-muted hover:text-white flex items-center justify-center transition-colors ${
                    isSettingsActive
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-card-dark/60 border-border-dark hover:bg-nav-hover'
                  }`}
                  title="System Settings"
                >
                  <span className="material-symbols-outlined text-lg">settings</span>
                </button>

                {/* Sign Out */}
                <button
                  type="button"
                  onClick={() => logout()}
                  className="h-[34px] rounded-lg border border-border-dark bg-card-dark/60 hover:bg-red-500/10 text-text-muted hover:text-red-400 hover:border-red-500/30 flex items-center justify-center transition-colors"
                  title="Sign Out"
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                </button>
              </div>
            </div>
          ) : (
            /* Collapsed Sidebar Icons */
            <div className="space-y-2 flex flex-col items-center">
              <Link
                to="/app/profile"
                className={`p-1 rounded-xl flex items-center justify-center border transition-all ${
                  isProfileActive
                    ? 'border-primary ring-1 ring-primary/40'
                    : 'border-border-dark hover:border-primary/40'
                }`}
                title="My Profile"
              >
                <UserAvatar user={user} size="sm" showRoleBadge />
              </Link>

              <button
                type="button"
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center border relative transition-colors ${
                  isNotificationOpen
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-card-dark text-text-muted border-border-dark hover:text-white'
                }`}
                title="Notifications"
              >
                <span className="material-symbols-outlined text-lg">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/app/settings')}
                className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors ${
                  isSettingsActive
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-card-dark text-text-muted border-border-dark hover:text-white'
                }`}
                title="Settings"
              >
                <span className="material-symbols-outlined text-lg">settings</span>
              </button>

              <button
                type="button"
                onClick={() => logout()}
                className="w-9 h-9 rounded-lg flex items-center justify-center border border-border-dark bg-card-dark text-text-muted hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-colors"
                title="Logout"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
