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
  /** Optional sub-heading inside the parent group; shown above the first child of each run. */
  section?: string
  /** Not built yet (an Access Group feature we plan to add). Shown with a "Soon" badge; opens /in-progress. */
  planned?: boolean
  /** One line on what a planned page will do (shown on the work-in-progress page). */
  description?: string
}

export interface NavItem {
  label: string
  icon: React.ReactNode
  href: string
  badge?: string | number
  badgeVariant?: 'default' | 'destructive' | 'warning' | 'success'
  children?: SubNavItem[]
  ready?: boolean
  /** Top-level leaf only: hide the item unless the user holds this permission. */
  permission?: Permission
}

export type LayoutVariant = 'admin' | 'portal'
