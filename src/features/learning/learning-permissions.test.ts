import { describe, expect, it } from 'vitest'
import { hasPermission, ROLE_PERMISSIONS } from '@/features/auth/roles'
import type { Permission } from '@/features/auth/types'

const LEARNING_KEYS: Permission[] = [
  'learning.dashboard.read',
  'learning.categories.read',
  'learning.categories.manage',
  'learning.courses.read',
  'learning.courses.manage',
  'learning.assignments.read',
  'learning.assignments.manage',
  'learning.compliance.read',
  'learning.compliance.export',
  'learning.training_events.read',
  'learning.training_events.manage',
  'learning.certificates.read',
  'learning.certificates.manage',
  'learning.external_training.read',
  'learning.external_training.manage',
  'learning.reports.read',
  'learning.reports.export',
  'learning.settings.manage',
  'learning.me.read',
  'learning.me.progress',
]

describe('learning permissions', () => {
  it('grants all learning permissions to admin and super_admin', () => {
    for (const key of LEARNING_KEYS) {
      expect(hasPermission(ROLE_PERMISSIONS.admin, key)).toBe(true)
      expect(hasPermission(ROLE_PERMISSIONS.super_admin, key)).toBe(true)
    }
  })

  it('does not grant learning permissions to manager or staff by default', () => {
    for (const key of LEARNING_KEYS) {
      expect(hasPermission(ROLE_PERMISSIONS.manager, key)).toBe(false)
      expect(hasPermission(ROLE_PERMISSIONS.staff, key)).toBe(false)
    }
  })
})
