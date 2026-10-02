import { describe, expect, it } from 'vitest'
import { adminNavItems, filterNavByPermission } from '@/components/layout/Sidebar'
import type { Permission } from '@/features/auth/types'

function adminChildren(perms: Permission[]) {
  const admin = filterNavByPermission(adminNavItems, p => perms.includes(p), 'admin').find(
    i => i.label === 'Administration',
  )
  return admin?.children ?? []
}

describe('System jobs navigation', () => {
  it('shows "System jobs" under Administration only with system_jobs.read', () => {
    const item = adminChildren(['system_jobs.read']).find(c => c.label === 'System jobs')
    expect(item).toMatchObject({ href: '/system-jobs', permission: 'system_jobs.read' })
    expect(adminChildren(['system_jobs.manage']).map(c => c.label)).not.toContain('System jobs')
    expect(adminChildren(['platform_costs.read']).map(c => c.label)).not.toContain('System jobs')
  })
})
