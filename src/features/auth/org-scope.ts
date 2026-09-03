import { useAuthStore } from '@/features/auth/store'
import type { AuthUser, Permission } from '@/features/auth/types'

/** Permission check — prefer over role-name checks. */
export function can(permission: Permission, user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user
  if (!u) return false
  if (u.role === 'super_admin') return true
  if (u.backendRoles?.includes('Super Admin')) return true
  return u.permissions.includes(permission)
}

/** null/undefined assignedLocationIds = company/platform-wide access. */
export function isCompanyScoped(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user
  if (!u) return false
  // Explicit branch ACL always wins over role-derived scopeType.
  if (Array.isArray(u.assignedLocationIds)) return false
  if (u.scopeType === 'platform' || u.scopeType === 'company') return true
  return u.assignedLocationIds == null
}

export function isBranchScoped(user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user
  if (!u) return false
  if (Array.isArray(u.assignedLocationIds)) return true
  if (u.scopeType === 'branch') return true
  return false
}

export function canAccessBranch(branchId: string, user?: AuthUser | null): boolean {
  const u = user ?? useAuthStore.getState().user
  if (!u) return false
  if (u.role === 'super_admin') return true
  if (u.assignedLocationIds == null) return true
  return u.assignedLocationIds.includes(branchId)
}

export function accessibleBranchIds(user?: AuthUser | null): string[] | null {
  const u = user ?? useAuthStore.getState().user
  if (!u) return []
  return u.assignedLocationIds ?? null
}
