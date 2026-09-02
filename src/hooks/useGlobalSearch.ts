import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'

export interface SearchResultItem {
  id: string
  category: 'projects' | 'purchase_orders' | 'clients' | 'snags' | 'fleet' | 'actions'
  title: string
  subtitle?: string
  badge?: string
  badgeColor?: string
  linkUrl: string
  icon: string
  action?: () => void
}

export function useGlobalSearch() {
  const { hasPermission, isAdmin } = usePermissions()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [loading, setLoading] = useState(false)

  // Determine permissions
  const canViewProjects = isAdmin || hasPermission('projects.view') || hasPermission('projects.view_all') || hasPermission('projects.view_assigned')
  const canViewPOs = isAdmin || hasPermission('purchase_orders.view')
  const canViewClients = isAdmin || hasPermission('clients.view')
  const canManageSnags = isAdmin || hasPermission('snags.manage')
  const canManageFleet = isAdmin || hasPermission('fleet.manage')
  const canManageSettings = isAdmin || hasPermission('settings.manage') || hasPermission('users.manage')

  // Static Quick Actions based on permissions
  const quickActions = useMemo<SearchResultItem[]>(() => {
    const actions: SearchResultItem[] = [
      {
        id: 'action-timesheets',
        category: 'actions',
        title: 'Record Field Timesheet',
        subtitle: 'Log technician labor hours and work notes',
        badge: 'Action',
        badgeColor: 'bg-primary/20 text-primary',
        linkUrl: '/app/timesheets',
        icon: 'schedule',
      },
      {
        id: 'action-profile',
        category: 'actions',
        title: 'My Profile & Licences',
        subtitle: 'Update avatar, compliance certificates, and preferences',
        badge: 'Profile',
        badgeColor: 'bg-emerald-500/20 text-emerald-400',
        linkUrl: '/app/profile',
        icon: 'badge',
      },
    ]

    if (canViewProjects) {
      actions.push({
        id: 'action-projects',
        category: 'actions',
        title: 'View All Projects Directory',
        subtitle: 'Open 360° project hubs, budgets, and site plans',
        badge: 'Hub',
        badgeColor: 'bg-blue-500/20 text-blue-400',
        linkUrl: '/app/projects',
        icon: 'folder_open',
      })
    }

    if (canViewPOs) {
      actions.push({
        id: 'action-pos',
        category: 'actions',
        title: 'Purchase Orders & Stock',
        subtitle: 'Raise supplier orders and check delivered parts',
        badge: 'Procurement',
        badgeColor: 'bg-purple-500/20 text-purple-400',
        linkUrl: '/app/purchase-orders',
        icon: 'shopping_cart',
      })
    }

    if (canViewClients) {
      actions.push({
        id: 'action-clients',
        category: 'actions',
        title: 'Clients & CRM Directory',
        subtitle: 'View client accounts, billing contacts, and project histories',
        badge: 'CRM',
        badgeColor: 'bg-teal-500/20 text-teal-400',
        linkUrl: '/app/clients',
        icon: 'corporate_fare',
      })
    }

    if (canManageFleet) {
      actions.push({
        id: 'action-fleet',
        category: 'actions',
        title: 'Fleet Vehicles & WOF Audits',
        subtitle: 'Check vehicle registrations, mileage, and safety check sheets',
        badge: 'Fleet',
        badgeColor: 'bg-amber-500/20 text-amber-400',
        linkUrl: '/app/fleet',
        icon: 'directions_car',
      })
    }

    if (canManageSettings) {
      actions.push({
        id: 'action-settings',
        category: 'actions',
        title: 'System Settings & Role Permissions',
        subtitle: 'Configure company profile, invite users, and RBAC matrix',
        badge: 'Admin',
        badgeColor: 'bg-red-500/20 text-red-400',
        linkUrl: '/app/settings',
        icon: 'settings',
      })
    }

    return actions
  }, [canViewProjects, canViewPOs, canViewClients, canManageFleet, canManageSettings])

  const executeSearch = useCallback(
    async (searchTerm: string) => {
      const q = searchTerm.trim().toLowerCase()
      if (!q) {
        setResults(quickActions)
        setLoading(false)
        return
      }

      setLoading(true)
      const found: SearchResultItem[] = []

      try {
        // 1. Filter Quick Actions
        const matchedActions = quickActions.filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            (a.subtitle && a.subtitle.toLowerCase().includes(q))
        )
        found.push(...matchedActions)

        // Parallel query tasks
        const tasks: Promise<void>[] = []

        // 2. Search Projects
        if (canViewProjects) {
          tasks.push(
            (async () => {
              const { data } = await supabase
                .from('projects')
                .select('id, name, description, status, address, city, clients(name)')
                .or(`name.ilike.%${q}%,description.ilike.%${q}%,address.ilike.%${q}%,city.ilike.%${q}%`)
                .limit(6)

              if (data) {
                data.forEach((p: any) => {
                  const clientName = p.clients?.name ? ` • Client: ${p.clients.name}` : ''
                  const loc = p.address ? ` (${p.address}${p.city ? `, ${p.city}` : ''})` : ''
                  found.push({
                    id: `proj-${p.id}`,
                    category: 'projects',
                    title: p.name,
                    subtitle: `${p.status}${clientName}${loc}`,
                    badge: 'Project',
                    badgeColor:
                      p.status === 'Active'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-primary/20 text-primary',
                    linkUrl: `/app/projects/${p.id}`,
                    icon: 'folder',
                  })
                })
              }
            })()
          )
        }

        // 3. Search Purchase Orders
        if (canViewPOs) {
          tasks.push(
            (async () => {
              const { data } = await supabase
                .from('purchase_orders')
                .select('id, po_number, status, total, order_type, vendor:clients(name)')
                .or(`po_number.ilike.%${q}%`)
                .limit(6)

              if (data) {
                data.forEach((po: any) => {
                  const vendor = po.vendor?.name ? `Supplier: ${po.vendor.name}` : 'Supplier'
                  const cost = po.total ? ` • $${Number(po.total).toLocaleString()}` : ''
                  found.push({
                    id: `po-${po.id}`,
                    category: 'purchase_orders',
                    title: po.po_number,
                    subtitle: `${vendor}${cost} • ${po.status.toUpperCase()}`,
                    badge: 'Purchase Order',
                    badgeColor: 'bg-purple-500/20 text-purple-400',
                    linkUrl: '/app/purchase-orders',
                    icon: 'shopping_bag',
                  })
                })
              }
            })()
          )
        }

        // 4. Search Clients
        if (canViewClients) {
          tasks.push(
            (async () => {
              const { data } = await supabase
                .from('clients')
                .select('id, name, company, email, phone, contact_name, city')
                .or(`name.ilike.%${q}%,company.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,contact_name.ilike.%${q}%,city.ilike.%${q}%`)
                .limit(8)

              if (data) {
                data.forEach((c: any) => {
                  const details = [
                    c.company && c.company !== c.name ? c.company : null,
                    c.contact_name ? `Contact: ${c.contact_name}` : null,
                    c.city,
                    c.email || c.phone,
                  ]
                    .filter(Boolean)
                    .join(' • ')

                  found.push({
                    id: `client-${c.id}`,
                    category: 'clients',
                    title: c.name,
                    subtitle: details || 'Active Client Account',
                    badge: 'Client',
                    badgeColor: 'bg-teal-500/20 text-teal-400',
                    linkUrl: `/app/clients?search=${encodeURIComponent(c.name)}`,
                    icon: 'apartment',
                  })
                })
              }
            })()
          )
        }

        // 5. Search QC Snags
        if (canManageSnags) {
          tasks.push(
            (async () => {
              const { data } = await supabase
                .from('project_snags')
                .select('id, project_id, title, priority, status, location, project:projects(name)')
                .or(`title.ilike.%${q}%,description.ilike.%${q}%,location.ilike.%${q}%`)
                .limit(5)

              if (data) {
                data.forEach((s: any) => {
                  const proj = s.project?.name || 'Project'
                  const loc = s.location ? ` @ ${s.location}` : ''
                  found.push({
                    id: `snag-${s.id}`,
                    category: 'snags',
                    title: s.title,
                    subtitle: `${proj}${loc} • ${s.priority.toUpperCase()} (${s.status})`,
                    badge: 'QC Snag',
                    badgeColor:
                      s.priority === 'urgent'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-amber-500/20 text-amber-400',
                    linkUrl: `/app/projects/${s.project_id}`,
                    icon: 'fact_check',
                  })
                })
              }
            })()
          )
        }

        // 6. Search Fleet & Vehicles
        if (canManageFleet) {
          tasks.push(
            (async () => {
              const { data } = await supabase
                .from('vehicles')
                .select('id, registration_number, make_model, assigned_driver, status')
                .or(`registration_number.ilike.%${q}%,make_model.ilike.%${q}%`)
                .limit(5)

              if (data) {
                data.forEach((v: any) => {
                  found.push({
                    id: `vehicle-${v.id}`,
                    category: 'fleet',
                    title: `${v.registration_number} (${v.make_model})`,
                    subtitle: `Status: ${v.status}${v.assigned_driver ? ` • Driver: ${v.assigned_driver}` : ''}`,
                    badge: 'Fleet Van',
                    badgeColor: 'bg-amber-500/20 text-amber-400',
                    linkUrl: '/app/fleet',
                    icon: 'local_shipping',
                  })
                })
              }
            })()
          )
        }

        await Promise.all(tasks)
        setResults(found)
      } catch (err) {
        console.error('Search query error:', err)
      } finally {
        setLoading(false)
      }
    },
    [quickActions, canViewProjects, canViewPOs, canViewClients, canManageSnags, canManageFleet]
  )

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      executeSearch(query)
    }, 200)

    return () => clearTimeout(timer)
  }, [query, executeSearch])

  return {
    query,
    setQuery,
    results,
    loading,
    quickActions,
  }
}
