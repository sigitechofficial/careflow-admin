import type * as React from 'react'
import type { Permission, RoleId } from '@/features/auth/types'

export interface SubNavItem {
  label: string
  icon: React.ReactNode
  href: string
  search?: Record<string, string>
  permission?: Permission
  anyPermission?: Permission[]
  /** Hide this item for these UI roles (e.g. Super Admin personal inboxes). */
  hideForRoles?: RoleId[]
  /**
   * The screen covers every branch (pay runs, payouts, payroll settings). Hidden from a user
   * whose pay access is limited to their own branches; the server refuses it for them anyway.
   */
  organisationPayScope?: boolean
  ready?: boolean
  navTestId?: string
}

export interface NavItem {
  label: string
  icon: React.ReactNode
  href: string
  badge?: string | number
  badgeVariant?: 'default' | 'destructive' | 'warning' | 'success'
  children?: SubNavItem[]
  ready?: boolean
}

export type LayoutVariant = 'admin' | 'portal'
