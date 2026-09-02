import { useMemo, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRoles } from './useRoles'
import type { PermissionKey } from '@/types'

export function usePermissions() {
  const { user } = useAuth()
  const { roles, loading: rolesLoading } = useRoles()

  const userRole = useMemo(() => {
    if (!user?.role) return null
    return roles.find((r) => r.id === user.role)
  }, [user?.role, roles])

  const userPermissions = useMemo<Set<PermissionKey>>(() => {
    if (!userRole) return new Set()
    return new Set(userRole.permissions || [])
  }, [userRole])

  const isAdmin = user?.role === 'admin'
  const isManager = user?.role === 'manager' || user?.role === 'admin'

  const hasPermission = useCallback((permission: PermissionKey): boolean => {
    if (isAdmin) return true
    return userPermissions.has(permission)
  }, [isAdmin, userPermissions])

  const hasAnyPermission = useCallback((permissions: PermissionKey[]): boolean => {
    if (isAdmin) return true
    return permissions.some((p) => userPermissions.has(p))
  }, [isAdmin, userPermissions])

  const hasAllPermissions = useCallback((permissions: PermissionKey[]): boolean => {
    if (isAdmin) return true
    return permissions.every((p) => userPermissions.has(p))
  }, [isAdmin, userPermissions])

  return {
    user,
    userRole,
    isAdmin,
    isManager,
    loading: rolesLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  }
}
