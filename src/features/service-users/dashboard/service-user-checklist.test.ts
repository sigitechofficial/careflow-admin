import { describe, expect, it } from 'vitest'
import { serviceUserChecklist } from '@/features/service-users/dashboard/service-user-checklist'
import type { MissingItem } from '@/features/service-users/dashboard/service-user-missing-items'

const missing = (id: string, detail = 'Not recorded'): MissingItem =>
  ({ id, group: 'Profile', title: id, detail, linkLabel: 'Add', to: '/service-users/$serviceUserId/profile', search: { tab: 'personal' } }) as MissingItem

const loaded = {
  funderNames: ['Kent County Council'],
  chargeCard: { name: 'Standard LA', matched: false },
  hasInitialAssessment: true,
  carePlanCount: 2,
  visitPlanStatus: 'ACTIVE',
}

const byId = (items: ReturnType<typeof serviceUserChecklist>) => Object.fromEntries(items.map(i => [i.id, i]))

describe('serviceUserChecklist', () => {
  it('marks every check done for a complete record', () => {
    const items = serviceUserChecklist({ missingItems: [], ...loaded })
    expect(items.every(i => i.done)).toBe(true)
    const m = byId(items)
    expect(m.funders.detail).toBe('Kent County Council')
    expect(m['charge-card'].detail).toBe('Standard LA')
    expect(m['care-plan'].detail).toBe('2 published')
  })

  it('marks record checks missing from their missing items (any of their ids)', () => {
    const m = byId(serviceUserChecklist({ missingItems: [missing('nhs'), missing('emergency-contact', 'No emergency contact')], ...loaded }))
    expect(m.nhs.done).toBe(false)
    expect(m.contacts.done).toBe(false)
    expect(m.contacts.detail).toBe('No emergency contact')
    expect(m.dob.done).toBe(true)
  })

  it('marks funders, charge card, assessment, care plan and visit plan missing', () => {
    const m = byId(
      serviceUserChecklist({
        missingItems: [],
        funderNames: [],
        chargeCard: null,
        hasInitialAssessment: false,
        carePlanCount: 0,
        visitPlanStatus: 'DRAFT',
      }),
    )
    for (const id of ['funders', 'charge-card', 'initial-assessment', 'care-plan', 'visit-plan']) expect(m[id].done).toBe(false)
    expect(m['visit-plan'].detail).toBe('Draft — not active')
    expect(m['charge-card'].detail).toBe('No charge card applies — visits cannot be billed')
  })

  it('leaves out checks whose data is not loaded', () => {
    const ids = serviceUserChecklist({
      missingItems: [],
      funderNames: undefined,
      chargeCard: undefined,
      hasInitialAssessment: undefined,
      carePlanCount: undefined,
      visitPlanStatus: undefined,
    }).map(i => i.id)
    expect(ids).not.toContain('funders')
    expect(ids).not.toContain('charge-card')
    expect(ids).not.toContain('visit-plan')
    expect(ids).toContain('dob')
  })
})
