import { describe, expect, it } from 'vitest'
import { upsertCarePlanInstanceInList } from './useServiceUserCarePlanInstances'
import type { CarePlanInstance } from '@/features/service-users/care-plans/types'

function instance(partial: Partial<CarePlanInstance> & Pick<CarePlanInstance, 'id' | 'carePathwayFormId'>): CarePlanInstance {
  return {
    serviceUserId: 'su-1',
    status: 'PUBLISHED',
    displayStatus: 'PUBLISHED',
    createdAt: '2026-08-25T00:00:00.000Z',
    updatedAt: '2026-08-25T00:00:00.000Z',
    ...partial,
  }
}

describe('upsertCarePlanInstanceInList', () => {
  it('inserts a newly published plan into an empty list (Live section source)', () => {
    const published = instance({
      id: 'inst-skin',
      carePathwayFormId: 'form-skin',
      formName: 'Skin Integrity',
      displayStatus: 'PUBLISHED',
      status: 'PUBLISHED',
    })
    expect(upsertCarePlanInstanceInList(undefined, published)).toEqual([published])
  })

  it('replaces a draft row with the published instance for the same form', () => {
    const draft = instance({
      id: 'inst-skin',
      carePathwayFormId: 'form-skin',
      status: 'DRAFT',
      displayStatus: 'DRAFT',
    })
    const published = instance({
      id: 'inst-skin',
      carePathwayFormId: 'form-skin',
      status: 'PUBLISHED',
      displayStatus: 'PUBLISHED',
      latestPublishedVersion: {
        id: 'v1',
        versionNumber: 1,
        publishedAt: '2026-08-25T12:00:00.000Z',
      },
    })
    expect(upsertCarePlanInstanceInList([draft], published)).toEqual([published])
  })
})
