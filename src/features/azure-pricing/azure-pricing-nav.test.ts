import { describe, expect, it } from 'vitest'
import { adminNavItems, filterNavByPermission } from '@/components/layout/Sidebar'
import type { Permission } from '@/features/auth/types'
import { isAzurePricingTabId } from '@/features/azure-pricing/types'

function labelsFor(perms: Permission[]) {
  return filterNavByPermission(adminNavItems, p => perms.includes(p), 'admin').map(i => i.label)
}

describe('Azure Pricing navigation', () => {
  it('shows the sidebar item only with platform_costs.read', () => {
    expect(labelsFor(['platform_costs.read'])).toContain('Azure Pricing')
    expect(labelsFor(['platform_costs.manage'])).not.toContain('Azure Pricing')
    expect(labelsFor(['surveys.read'])).not.toContain('Azure Pricing')
  })

  it('keeps ungated top-level leaves (Home) visible', () => {
    expect(labelsFor([])).toContain('Home')
  })

  it('validates tab search params', () => {
    expect(isAzurePricingTabId('alerts')).toBe(true)
    expect(isAzurePricingTabId('reports')).toBe(true)
    expect(isAzurePricingTabId('nope')).toBe(false)
    expect(isAzurePricingTabId(undefined)).toBe(false)
  })
})
