import {
  linkRecommendationsToCarePlans,
  publishedReturnMessage,
  remainingRecommendedCarePlans,
} from './care-plan-ia-return.util'
import type { CarePlanInstance } from '@/features/service-users/care-plans/types'
import type { CarePlanRecommendation } from '@/features/service-users/initial-assessment/types'

const rec = (over: Partial<CarePlanRecommendation>): CarePlanRecommendation =>
  ({ id: Math.random().toString(), status: 'pending', ...over }) as CarePlanRecommendation

describe('remainingRecommendedCarePlans', () => {
  it('counts each form once and skips the published, declined and just-published plans', () => {
    const recs = [
      rec({ carePathwayFormId: 'advance' }),
      rec({ carePathwayFormId: 'falls' }),
      rec({ carePathwayFormId: 'falls' }),
      rec({ carePathwayFormId: 'skin', status: 'declined' }),
      rec({
        carePathwayFormId: 'meds',
        linkedCarePlan: { carePathwayFormId: 'meds', status: 'PUBLISHED' } as CarePlanRecommendation['linkedCarePlan'],
      }),
      rec({
        carePathwayFormId: 'nutrition',
        linkedCarePlan: { carePathwayFormId: 'nutrition', status: 'DRAFT' } as CarePlanRecommendation['linkedCarePlan'],
      }),
      rec({ carePathwayFormId: undefined }),
    ]
    expect(remainingRecommendedCarePlans(recs, 'advance')).toBe(2)
  })
})

describe('publishedReturnMessage', () => {
  it('says how many are left', () => {
    expect(publishedReturnMessage('Advance', 3)).toBe('Advance published. 3 recommended care plans left.')
    expect(publishedReturnMessage('Advance', 1)).toBe('Advance published. 1 recommended care plan left.')
    expect(publishedReturnMessage('Advance', 0)).toBe('Advance published. All recommended care plans are done.')
    expect(publishedReturnMessage('Advance', null)).toBe('Advance published.')
  })
})

describe('linkRecommendationsToCarePlans', () => {
  it('fills the care plan for the same form when the recommendation has none', () => {
    const instances = [
      { id: 'i1', carePathwayFormId: 'advance', status: 'PUBLISHED', draft: null },
    ] as unknown as CarePlanInstance[]
    const [made, notMade, alreadyLinked] = linkRecommendationsToCarePlans(
      [
        rec({ carePathwayFormId: 'advance' }),
        rec({ carePathwayFormId: 'falls' }),
        rec({
          carePathwayFormId: 'advance',
          linkedCarePlan: { instanceId: 'other', carePathwayFormId: 'advance', status: 'DRAFT', hasDraft: true },
        }),
      ],
      instances,
    )
    expect(made.linkedCarePlan).toEqual({ instanceId: 'i1', carePathwayFormId: 'advance', status: 'PUBLISHED', hasDraft: false })
    expect(notMade.linkedCarePlan).toBeUndefined()
    expect(alreadyLinked.linkedCarePlan?.instanceId).toBe('other')
    expect(remainingRecommendedCarePlans([made, notMade], 'x')).toBe(1)
  })
})
