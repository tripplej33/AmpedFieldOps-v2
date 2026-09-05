import { useState, useMemo, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/hooks/useNotifications'
import { useTerminology } from '@/hooks/useTerminology'
import { useCompanyProfile } from '@/hooks/useCompanyProfile'
import { getStoredPreferences } from '@/lib/theme'
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

const SUB_CATEGORIES: Record<string, { label: string; path: string; icon: string }[]> = {
  projects: [
    { label: 'Table View', path: '/app/projects?view=table', icon: 'table_rows' },
    { label: 'Kanban Pipeline', path: '/app/projects?view=kanban', icon: 'view_kanban' },
    { label: 'Files Hub', path: '/app/files', icon: 'folder' },
  ],
  schedule: [
    { label: 'Resource Timeline', path: '/app/schedule?view=timeline', icon: 'view_timeline' },
    { label: 'Daily Tech Agenda', path: '/app/schedule?view=agenda', icon: 'calendar_view_day' },
  ],
  'purchase-orders': [
    { label: 'All Purchase Orders', path: '/app/purchase-orders', icon: 'receipt_long' },
    { label: 'Project Job Orders', path: '/app/purchase-orders?type=project_job', icon: 'work' },
    { label: 'Van Restock Orders', path: '/app/purchase-orders?type=van_restock', icon: 'local_shipping' },
  ],
  'van-stock': [
    { label: 'Storage Places & Depots', path: '/app/van-stock?tab=locations', icon: 'warehouse' },
    { label: 'Master Stock Register', path: '/app/van-stock?tab=catalog', icon: 'inventory_2' },
    { label: 'Low Stock & Restock', path: '/app/van-stock?tab=low_stock', icon: 'warning' },
    { label: 'Stock Movements Log', path: '/app/van-stock?tab=transactions', icon: 'sync_alt' },
    { label: 'Assigned Van Stock', path: '/app/van-stock?tab=van_view', icon: 'directions_car' },
  ],
  fleet: [
    { label: 'All Fleet & Plant', path: '/app/fleet', icon: 'directions_car' },
    { label: 'Service Vans & Utes', path: '/app/fleet?category=vehicle', icon: 'airport_shuttle' },
    { label: 'Heavy Machinery', path: '/app/fleet?category=heavy_machinery', icon: 'precision_manufacturing' },
    { label: 'Tools & Equipment', path: '/app/fleet?category=equipment', icon: 'handyman' },
    { label: 'Plant Trailers', path: '/app/fleet?category=trailer', icon: 'rv_hookup' },
  ],
  safety: [
    { label: 'All Safety Docs & SWMS', path: '/app/safety', icon: 'shield_with_heart' },
    { label: 'Pending Signatures', path: '/app/safety?tab=pending', icon: 'pending_actions' },
    { label: 'Completed Documents', path: '/app/safety?tab=completed', icon: 'task_alt' },
    { label: 'SWMS Template Builder', path: '/app/safety?tab=templates', icon: 'post_add' },
  ],
  compliance: [
    { label: 'CoC & ESC Certificates', path: '/app/compliance', icon: 'verified' },
    { label: 'Electrical Test Sheets', path: '/app/compliance?tab=test_sheets', icon: 'fact_check' },
    { label: 'Switchboard Schedules', path: '/app/compliance?tab=switchboards', icon: 'developer_board' },
    { label: 'Tools & Equipment', path: '/app/compliance?tab=equipment', icon: 'build_circle' },
    { label: 'PAT Test Logs', path: '/app/compliance?tab=pat', icon: 'power' },
  ],
  timesheets: [
    { label: 'Daily Timeline', path: '/app/timesheets?view=day', icon: 'schedule' },
    { label: 'Weekly Grid', path: '/app/timesheets?view=weekly', icon: 'calendar_view_week' },
    { label: 'Timesheet Register', path: '/app/timesheets?view=table', icon: 'table_rows' },
    { label: 'Approvals Hub', path: '/app/timesheets?view=approvals', icon: 'thumb_up' },
  ],
  financials: [
    { label: 'All Invoices', path: '/app/financials', icon: 'receipt' },
    { label: 'Awaiting Payment', path: '/app/financials?tab=awaiting_payment', icon: 'hourglass_top' },
    { label: 'Overdue Invoices', path: '/app/financials?tab=overdue', icon: 'warning' },
    { label: 'Paid Invoices', path: '/app/financials?tab=paid', icon: 'check_circle' },
    { label: 'Draft Invoices', path: '/app/financials?tab=draft', icon: 'edit_note' },
  ],
  settings: [
    { label: 'Active Team', path: '/app/settings', icon: 'group' },
    { label: 'Roles & RBAC', path: '/app/settings?tab=roles', icon: 'admin_panel_settings' },
    { label: 'Company Branding', path: '/app/settings?tab=company', icon: 'domain' },
    { label: 'Trade Customization', path: '/app/settings?tab=trade', icon: 'tune' },
    { label: 'Activity Types & Rates', path: '/app/settings?tab=activity_types', icon: 'category' },
    { label: 'Xero Integration', path: '/app/settings?tab=xero', icon: 'sync_alt' },
    { label: 'Audit & System Logs', path: '/app/settings?tab=audit_logs', icon: 'manage_history' },
  ],
}

function isSubItemActive(
  currentPathname: string,
  currentSearch: string,
  subPath: string,
  allSubItemsForCategory: { label: string; path: string; icon: string }[]
): boolean {
  const [subBase, subQuery] = subPath.split('?')
  if (currentPathname !== subBase) return false

  const currentParams = new URLSearchParams(currentSearch)

  if (!subQuery) {
    const hasAnyOtherMatch = allSubItemsForCategory.some((other) => {
      if (other.path === subPath) return false
      const [otherBase, otherQuery] = other.path.split('?')
      if (otherBase !== currentPathname || !otherQuery) return false
      const otherParams = new URLSearchParams(otherQuery)
      let matches = true
      for (const [k, v] of otherParams.entries()) {
        if (currentParams.get(k) !== v) matches = false
      }
      return matches
    })
    return !hasAnyOtherMatch
  }

  const subParams = new URLSearchParams(subQuery)
  for (const [key, value] of subParams.entries()) {
    const currentVal = currentParams.get(key)
    if (!currentVal) {
      if (subBase === '/app/projects' && key === 'view' && value === 'table') continue
      if (subBase === '/app/schedule' && key === 'view' && value === 'timeline') continue
      if (subBase === '/app/van-stock' && key === 'tab' && value === 'locations') continue
      if (subBase === '/app/timesheets' && key === 'view' && value === 'day') continue
      return false
    }
    if (currentVal !== value) {
      return false
    }
  }
  return true
}

export default function Sidebar({ isCollapsed, isMobileOpen, onToggle, onMobileClose }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { t, isModuleEnabled } = useTerminology()
  const { profile: companyProfile } = useCompanyProfile()
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [showSubcategories, setShowSubcategories] = useState<boolean>(() => {
    return getStoredPreferences().showSidebarSubcategories ?? false
  })

  // Synchronize preference change when user toggles in profile settings
  useEffect(() => {
    const handleStorageChange = () => {
      setShowSubcategories(getStoredPreferences().showSidebarSubcategories ?? false)
    }
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('amped_preferences_updated', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('amped_preferences_updated', handleStorageChange)
    }
  }, [])

  // Automatically reset manual accordion overrides when navigating between pages,
  // ensuring only the active main category is expanded by default.
  useEffect(() => {
    setExpandedSection(null)
  }, [location.pathname])

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
    { id: 'van-stock', label: t('vanStock', 'Inventory & Storage'), icon: 'inventory_2', path: '/app/van-stock', moduleKey: 'vanStock' },
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
      const roleAllowed = !item.roles || (user?.role && item.roles.includes(user.role))
      if (!roleAllowed) return false
      if (item.moduleKey && !isModuleEnabled(item.moduleKey)) return false
      return true
    })
  }, [navigationItems, user?.role, isModuleEnabled])

  const handleLinkClick = () => {
    if (window.innerWidth < 1024) {
      onMobileClose()
    }
  }

  const toggleAccordion = (id: string, e: React.MouseEvent, isActive: boolean) => {
    e.preventDefault()
    e.stopPropagation()
    setExpandedSection((prev) => {
      if (prev === id) return 'none'
      if (prev === null && isActive) return 'none'
      return id
    })
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
          fixed top-0 left-0 h-screen bg-[var(--bg-sidebar)] border-r border-[var(--border-sidebar)] z-50
          transition-all duration-300 ease-in-out flex flex-col justify-between shadow-2xl
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo Header */}
          <div className="h-16 flex items-center justify-between px-3.5 border-b border-[var(--border-sidebar)] bg-[var(--bg-sidebar-header)] shrink-0">
            {!isCollapsed ? (
              <Link to="/app/dashboard" className="flex items-center gap-2.5 min-w-0 flex-1" title={companyProfile.companyName || 'AmpedFieldOps'}>
                {companyProfile.logoUrl ? (
                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-[var(--bg-card)] border border-[var(--border-sidebar)] flex items-center justify-center shrink-0 shadow-sm">
                    <img
                      src={companyProfile.logoUrl}
                      alt={companyProfile.companyName || 'AmpedFieldOps'}
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-xl">bolt</span>
                  </div>
                )}
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[var(--text-main)] font-bold font-display text-xs truncate leading-tight">
                    {companyProfile.companyName || 'AmpedFieldOps'}
                  </span>
                  <span className="text-[10px] text-primary font-mono font-medium truncate">
                    Field Operations
                  </span>
                </div>
              </Link>
            ) : (
              <Link
                to="/app/dashboard"
                className="w-full flex justify-center py-2"
                title={companyProfile.companyName || 'AmpedFieldOps'}
              >
                {companyProfile.logoUrl ? (
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-[var(--bg-card)] border border-[var(--border-sidebar)] flex items-center justify-center">
                    <img
                      src={companyProfile.logoUrl}
                      alt="Logo"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-lg">bolt</span>
                  </div>
                )}
              </Link>
            )}
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-nav-hover)] transition-colors text-text-muted hover:text-[var(--text-main)] hidden lg:block shrink-0"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              <span className="material-symbols-outlined text-xl">
                {isCollapsed ? 'menu_open' : 'menu'}
              </span>
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1 custom-scrollbar">
            {filteredNav.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/app/dashboard' && location.pathname.startsWith(item.path))
              const subItems = SUB_CATEGORIES[item.id]
              const hasSubcategories = showSubcategories && !isCollapsed && subItems && subItems.length > 0
              // When showSubcategories is active, only the active main category's subtabs are open by default
              const isAccordionOpen = expandedSection === 'none' ? false : (expandedSection === item.id || (expandedSection === null && isActive))

              return (
                <div key={item.id} className="space-y-0.5">
                  <div className="flex items-center">
                    <Link
                      to={item.path}
                      onClick={handleLinkClick}
                      className={`
                        flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl
                        transition-all duration-150 group font-medium text-xs
                        ${isActive
                          ? 'bg-[var(--bg-nav-active)] text-primary font-bold border-l-4 border-primary shadow-sm'
                          : 'text-[var(--text-nav)] hover:bg-[var(--bg-nav-hover)] hover:text-[var(--text-main)]'
                        }
                        ${isCollapsed ? 'justify-center px-0' : ''}
                      `}
                      title={isCollapsed ? item.label : ''}
                    >
                      <span
                        className={`material-symbols-outlined text-xl transition-colors ${
                          isActive ? 'text-primary' : 'text-text-muted group-hover:text-primary'
                        }`}
                      >
                        {item.icon}
                      </span>
                      {!isCollapsed && (
                        <span className="truncate flex-1">{item.label}</span>
                      )}
                    </Link>

                    {hasSubcategories && (
                      <button
                        type="button"
                        onClick={(e) => toggleAccordion(item.id, e, isActive)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-[var(--text-main)] hover:bg-[var(--bg-nav-hover)] transition-colors"
                        title={isAccordionOpen ? 'Collapse sub-items' : 'Expand sub-items'}
                      >
                        <span className={`material-symbols-outlined text-base transition-transform duration-200 ${isAccordionOpen ? 'rotate-180' : ''}`}>
                          expand_more
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Subcategories Accordion */}
                  {hasSubcategories && isAccordionOpen && (
                    <div className="pl-6 pr-1 py-1 space-y-0.5 border-l-2 border-[var(--border-sidebar)] ml-4 animate-fadeIn">
                      {subItems.map((sub) => {
                        const isSubActive = isSubItemActive(location.pathname, location.search, sub.path, subItems)

                        return (
                          <Link
                            key={sub.path}
                            to={sub.path}
                            onClick={handleLinkClick}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                              isSubActive
                                ? 'bg-primary/15 text-primary font-bold border border-primary/30 shadow-sm'
                                : 'text-text-muted hover:text-[var(--text-main)] hover:bg-[var(--bg-nav-hover)]'
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm shrink-0 opacity-80">
                              {sub.icon}
                            </span>
                            <span className="truncate">{sub.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </div>

        {/* User Profile & Action Toolbar Footer */}
        <div className="p-3 border-t border-[var(--border-sidebar)] shrink-0 relative bg-[var(--bg-sidebar-header)]">
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
                    ? 'bg-primary/15 border-primary shadow-sm'
                    : 'bg-[var(--bg-card)] border-[var(--border-sidebar)] hover:border-primary/50 hover:bg-[var(--bg-nav-hover)]'
                }`}
                title="View & Edit My Profile"
              >
                <UserAvatar user={user} size="sm" showRoleBadge />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[var(--text-main)] truncate">
                    {user?.full_name || user?.email}
                  </p>
                  <p className="text-[10px] text-text-muted capitalize truncate">
                    {user?.role || 'Staff'} • Profile Settings
                  </p>
                </div>
              </Link>

              {/* Bottom Quick Actions Row: Bell, Cog, Sign Out */}
              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                {/* Notification Bell */}
                <button
                  type="button"
                  data-notification-trigger="true"
                  onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                  className={`h-[34px] rounded-lg border flex items-center justify-center relative transition-colors ${
                    isNotificationOpen
                      ? 'bg-primary/15 border-primary text-primary shadow-sm'
                      : 'bg-[var(--bg-card)] border-[var(--border-sidebar)] text-text-muted hover:text-[var(--text-main)] hover:bg-[var(--bg-nav-hover)]'
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
                  className={`h-[34px] rounded-lg border flex items-center justify-center transition-colors ${
                    isSettingsActive
                      ? 'bg-primary/15 border-primary text-primary shadow-sm'
                      : 'bg-[var(--bg-card)] border-[var(--border-sidebar)] text-text-muted hover:text-[var(--text-main)] hover:bg-[var(--bg-nav-hover)]'
                  }`}
                  title="System Settings"
                >
                  <span className="material-symbols-outlined text-lg">settings</span>
                </button>

                {/* Sign Out */}
                <button
                  type="button"
                  onClick={() => logout()}
                  className="h-[34px] rounded-lg border border-[var(--border-sidebar)] bg-[var(--bg-card)] hover:bg-red-500/10 text-text-muted hover:text-red-500 hover:border-red-500/30 flex items-center justify-center transition-colors"
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
                    ? 'border-primary ring-1 ring-primary/40 bg-primary/10'
                    : 'border-[var(--border-sidebar)] bg-[var(--bg-card)] hover:border-primary/40'
                }`}
                title="My Profile"
              >
                <UserAvatar user={user} size="sm" showRoleBadge />
              </Link>

              <button
                type="button"
                data-notification-trigger="true"
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center border relative transition-colors ${
                  isNotificationOpen
                    ? 'bg-primary/15 border-primary text-primary shadow-sm'
                    : 'bg-[var(--bg-card)] text-text-muted border-[var(--border-sidebar)] hover:text-[var(--text-main)] hover:bg-[var(--bg-nav-hover)]'
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
                    ? 'bg-primary/15 border-primary text-primary shadow-sm'
                    : 'bg-[var(--bg-card)] text-text-muted border-[var(--border-sidebar)] hover:text-[var(--text-main)] hover:bg-[var(--bg-nav-hover)]'
                }`}
                title="Settings"
              >
                <span className="material-symbols-outlined text-lg">settings</span>
              </button>

              <button
                type="button"
                onClick={() => logout()}
                className="w-9 h-9 rounded-lg flex items-center justify-center border border-[var(--border-sidebar)] bg-[var(--bg-card)] text-text-muted hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-colors"
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

