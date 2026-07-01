import type * as React from 'react'
import type { Permission } from '@/features/auth/types'

export interface SubNavItem {
  label: string
  icon: React.ReactNode
  href: string
  search?: Record<string, string>
  permission?: Permission
  anyPermission?: Permission[]
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
