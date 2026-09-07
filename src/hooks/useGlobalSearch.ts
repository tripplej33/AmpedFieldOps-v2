import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'

export type SearchCategory =
  | 'all'
  | 'projects'
  | 'purchase_orders'
  | 'clients'
  | 'inventory'
  | 'team'
  | 'safety'
  | 'compliance'
  | 'invoices'
  | 'snags'
  | 'fleet'
  | 'files'
  | 'actions'

export interface SearchResultItem {
  id: string
  category: SearchCategory
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
  const canViewProjects =
    isAdmin ||
    hasPermission('projects.view') ||
    hasPermission('projects.view_all') ||
    hasPermission('projects.view_assigned')
  const canViewPOs = isAdmin || hasPermission('purchase_orders.view')
  const canViewClients = isAdmin || hasPermission('clients.view')
  const canViewInventory = isAdmin || hasPermission('inventory.view')
  const canViewTeam = isAdmin || hasPermission('users.manage')
  const canViewSafety = isAdmin || hasPermission('safety.view')
  const canViewCompliance =
    isAdmin || hasPermission('compliance.view') || hasPermission('switchboards.view')
  const canViewInvoices =
    isAdmin || hasPermission('invoices.view') || hasPermission('financials.view')
  const canManageSnags = isAdmin || hasPermission('snags.manage')
  const canManageFleet = isAdmin || hasPermission('fleet.manage')
  const canManageSettings = isAdmin || hasPermission('settings.manage') || hasPermission('users.manage')
  const canViewFiles = canViewProjects || isAdmin || hasPermission('files.view')

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

    if (canViewInventory) {
      actions.push({
        id: 'action-inventory',
        category: 'actions',
        title: 'Inventory & Storage Depots',
        subtitle: 'Manage warehouse master catalog, van stock, and transfers',
        badge: 'Inventory',
        badgeColor: 'bg-emerald-500/20 text-emerald-400',
        linkUrl: '/app/van-stock',
        icon: 'inventory_2',
      })
    }

    if (canViewSafety) {
      actions.push({
        id: 'action-safety',
        category: 'actions',
        title: 'Safety Hub & Site SWMS',
        subtitle: 'Fill out hazard assessments, digital signatures, and daily briefings',
        badge: 'Safety',
        badgeColor: 'bg-rose-500/20 text-rose-400',
        linkUrl: '/app/safety-hub',
        icon: 'health_and_safety',
      })
    }

    if (canViewCompliance) {
      actions.push({
        id: 'action-compliance',
        category: 'actions',
        title: 'Electrical Compliance & CoC',
        subtitle: 'Certificates of Compliance, test sheets, and switchboard schedules',
        badge: 'Compliance',
        badgeColor: 'bg-cyan-500/20 text-cyan-400',
        linkUrl: '/app/compliance',
        icon: 'verified',
      })
    }

    if (canViewInvoices) {
      actions.push({
        id: 'action-invoices',
        category: 'actions',
        title: 'Invoicing & Financials',
        subtitle: 'Create progress claims, view client invoices, and Xero sync',
        badge: 'Finance',
        badgeColor: 'bg-yellow-500/20 text-yellow-400',
        linkUrl: '/app/financials',
        icon: 'receipt_long',
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

    if (canViewTeam) {
      actions.push({
        id: 'action-team',
        category: 'actions',
        title: 'Team Directory & Staff',
        subtitle: 'Manage employees, contractor roles, and active logins',
        badge: 'Team',
        badgeColor: 'bg-indigo-500/20 text-indigo-400',
        linkUrl: '/app/settings?tab=team',
        icon: 'group',
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
  }, [
    canViewProjects,
    canViewPOs,
    canViewInventory,
    canViewSafety,
    canViewCompliance,
    canViewInvoices,
    canViewClients,
    canManageFleet,
    canViewTeam,
    canManageSettings,
  ])

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
                    badge: 'PO',
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
                .limit(6)

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

        // 5. Search Inventory (Items + Depots)
        if (canViewInventory) {
          tasks.push(
            (async () => {
              const [itemsRes, locsRes] = await Promise.all([
                supabase
                  .from('inventory_items')
                  .select('id, sku, name, category, unit_cost')
                  .or(`name.ilike.%${q}%,sku.ilike.%${q}%,category.ilike.%${q}%`)
                  .limit(5),
                supabase
                  .from('inventory_locations')
                  .select('id, name, location_type')
                  .or(`name.ilike.%${q}%,location_type.ilike.%${q}%`)
                  .limit(3),
              ])

              if (itemsRes.data) {
                itemsRes.data.forEach((item: any) => {
                  found.push({
                    id: `inv-item-${item.id}`,
                    category: 'inventory',
                    title: item.name,
                    subtitle: `SKU: ${item.sku} • Cat: ${item.category || 'General'} • Cost: $${Number(item.unit_cost || 0).toFixed(2)}`,
                    badge: 'Stock Item',
                    badgeColor: 'bg-emerald-500/20 text-emerald-400',
                    linkUrl: '/app/van-stock',
                    icon: 'inventory_2',
                  })
                })
              }

              if (locsRes.data) {
                locsRes.data.forEach((loc: any) => {
                  found.push({
                    id: `inv-loc-${loc.id}`,
                    category: 'inventory',
                    title: loc.name,
                    subtitle: `Depot / Storage Location (${loc.location_type})`,
                    badge: 'Depot',
                    badgeColor: 'bg-teal-500/20 text-teal-400',
                    linkUrl: '/app/van-stock',
                    icon: 'warehouse',
                  })
                })
              }
            })()
          )
        }

        // 6. Search Team Members
        if (canViewTeam) {
          tasks.push(
            (async () => {
              const { data } = await supabase
                .from('users')
                .select('id, full_name, email, role, phone, is_active')
                .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
                .limit(5)

              if (data) {
                data.forEach((u: any) => {
                  const activeText = u.is_active === false ? ' (Deactivated)' : ''
                  found.push({
                    id: `team-${u.id}`,
                    category: 'team',
                    title: u.full_name || u.email,
                    subtitle: `Role: ${u.role?.toUpperCase() || 'MEMBER'}${activeText} • ${u.email || ''}${u.phone ? ` • ${u.phone}` : ''}`,
                    badge: u.is_active === false ? 'Deactivated' : 'Team',
                    badgeColor:
                      u.is_active === false
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-indigo-500/20 text-indigo-400',
                    linkUrl: '/app/settings?tab=team',
                    icon: 'badge',
                  })
                })
              }
            })()
          )
        }

        // 7. Search Safety SWMS / Documents
        if (canViewSafety) {
          tasks.push(
            (async () => {
              const { data } = await supabase
                .from('safety_documents')
                .select('id, title, status, project:projects(name)')
                .or(`title.ilike.%${q}%,status.ilike.%${q}%`)
                .limit(5)

              if (data) {
                data.forEach((doc: any) => {
                  const proj = doc.project?.name ? `Project: ${doc.project.name} • ` : ''
                  found.push({
                    id: `safety-${doc.id}`,
                    category: 'safety',
                    title: doc.title,
                    subtitle: `${proj}Status: ${doc.status}`,
                    badge: 'SWMS',
                    badgeColor: 'bg-rose-500/20 text-rose-400',
                    linkUrl: '/app/safety-hub',
                    icon: 'health_and_safety',
                  })
                })
              }
            })()
          )
        }

        // 8. Search Compliance (Switchboard Schedules)
        if (canViewCompliance) {
          tasks.push(
            (async () => {
              const { data } = await supabase
                .from('switchboard_schedules')
                .select('id, project_id, board_name, location, project:projects(name)')
                .or(`board_name.ilike.%${q}%,location.ilike.%${q}%`)
                .limit(5)

              if (data) {
                data.forEach((sb: any) => {
                  const proj = sb.project?.name ? ` • Project: ${sb.project.name}` : ''
                  found.push({
                    id: `sb-${sb.id}`,
                    category: 'compliance',
                    title: sb.board_name,
                    subtitle: `Switchboard Schedule${sb.location ? ` @ ${sb.location}` : ''}${proj}`,
                    badge: 'Switchboard',
                    badgeColor: 'bg-cyan-500/20 text-cyan-400',
                    linkUrl: '/app/compliance?tab=switchboards',
                    icon: 'developer_board',
                  })
                })
              }
            })()
          )
        }

        // 9. Search Invoices
        if (canViewInvoices) {
          tasks.push(
            (async () => {
              const { data } = await supabase
                .from('invoices')
                .select('id, invoice_number, status, total_amount, client:clients(name)')
                .or(`invoice_number.ilike.%${q}%,status.ilike.%${q}%`)
                .limit(5)

              if (data) {
                data.forEach((inv: any) => {
                  const clientName = inv.client?.name ? `Client: ${inv.client.name} • ` : ''
                  const amt = inv.total_amount != null ? `$${Number(inv.total_amount).toLocaleString()} • ` : ''
                  found.push({
                    id: `inv-${inv.id}`,
                    category: 'invoices',
                    title: `Invoice #${inv.invoice_number}`,
                    subtitle: `${clientName}${amt}Status: ${inv.status.toUpperCase()}`,
                    badge: 'Invoice',
                    badgeColor: 'bg-yellow-500/20 text-yellow-400',
                    linkUrl: '/app/financials',
                    icon: 'receipt_long',
                  })
                })
              }
            })()
          )
        }

        // 10. Search QC Snags
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

        // 11. Search Fleet & Vehicles
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

        // 12. Search Project Files
        if (canViewFiles) {
          tasks.push(
            (async () => {
              const { data } = await supabase
                .from('project_files')
                .select('id, name, path, project_id, project:projects(name)')
                .or(`name.ilike.%${q}%`)
                .limit(5)

              if (data) {
                data.forEach((f: any) => {
                  const proj = f.project?.name ? `Project: ${f.project.name}` : 'Project Document'
                  found.push({
                    id: `file-${f.id}`,
                    category: 'files',
                    title: f.name,
                    subtitle: `${proj}${f.path ? ` • ${f.path}` : ''}`,
                    badge: 'File',
                    badgeColor: 'bg-slate-500/20 text-slate-300',
                    linkUrl: `/app/projects/${f.project_id}`,
                    icon: 'description',
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
    [
      quickActions,
      canViewProjects,
      canViewPOs,
      canViewClients,
      canViewInventory,
      canViewTeam,
      canViewSafety,
      canViewCompliance,
      canViewInvoices,
      canManageSnags,
      canManageFleet,
      canViewFiles,
    ]
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
