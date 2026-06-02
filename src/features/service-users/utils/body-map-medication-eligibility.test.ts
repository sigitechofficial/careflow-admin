import { describe, it, expect } from 'vitest'
import { isBodyMapSiteMedication } from '@/features/service-users/utils/body-map-medication-eligibility'

describe('isBodyMapSiteMedication', () => {
  it('returns true for patch type via requiresBodyMapSite flag', () => {
    expect(
      isBodyMapSiteMedication({
        medicationType: { code: 'PATCH', requiresBodyMapSite: true },
        route: { code: 'ORAL', requiresBodyMapSite: false },
      }),
    ).toBe(true)
  })

  it('returns true for topical route via requiresBodyMapSite flag', () => {
    expect(
      isBodyMapSiteMedication({
        medicationType: { code: 'TABLET', requiresBodyMapSite: false },
        route: { code: 'TOPICAL', requiresBodyMapSite: true },
      }),
    ).toBe(true)
  })

  it('returns true for topical route via code fallback', () => {
    expect(
      isBodyMapSiteMedication({
        medicationType: { code: 'TABLET' },
        route: { code: 'TOPICAL' },
      }),
    ).toBe(true)
  })

  it('returns false for oral tablet', () => {
    expect(
      isBodyMapSiteMedication({
        medicationType: { code: 'TABLET', requiresBodyMapSite: false },
        route: { code: 'ORAL', requiresBodyMapSite: false },
      }),
    ).toBe(false)
  })

  it('returns true for patch via code fallback when flags omitted', () => {
    expect(
      isBodyMapSiteMedication({
        medicationType: { code: 'PATCH' },
        route: { code: 'ORAL' },
      }),
    ).toBe(true)
  })
})
