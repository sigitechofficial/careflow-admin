import { describe, expect, it } from 'vitest'
import { hasPermission, ROLE_PERMISSIONS } from '@/features/auth/roles'
import type { Permission } from '@/features/auth/types'

const POLICY_KEYS: Permission[] = [
  'policies.read',
  'policies.create',
  'policies.update',
  'policies.submit',
  'policies.review',
  'policies.approve',
  'policies.publish',
  'policies.archive',
  'policies.categories.manage',
  'policies.links.manage',
  'policies.audit.read',
]

describe('policy permissions', () => {
  it('grants all policy management permissions to admin and super_admin', () => {
    for (const key of POLICY_KEYS) {
      expect(hasPermission(ROLE_PERMISSIONS.admin, key)).toBe(true)
      expect(hasPermission(ROLE_PERMISSIONS.super_admin, key)).toBe(true)
    }
  })

  it('grants coordinator policy permissions to manager', () => {
    expect(hasPermission(ROLE_PERMISSIONS.manager, 'policies.read')).toBe(true)
    expect(hasPermission(ROLE_PERMISSIONS.manager, 'policies.create')).toBe(true)
    expect(hasPermission(ROLE_PERMISSIONS.manager, 'policies.publish')).toBe(false)
    expect(hasPermission(ROLE_PERMISSIONS.manager, 'policies.categories.manage')).toBe(false)
  })

  it('grants read-only policy access to staff', () => {
    expect(hasPermission(ROLE_PERMISSIONS.staff, 'policies.read')).toBe(true)
    expect(hasPermission(ROLE_PERMISSIONS.staff, 'policies.update')).toBe(false)
    expect(hasPermission(ROLE_PERMISSIONS.staff, 'policies.publish')).toBe(false)
  })
})
