import { describe, expect, it } from 'vitest'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  carePlanOptionsForScheduleJob,
  defaultDeliveredCarePlanIds,
} from './schedule-job-complete-care-plans.util'

const medication: AcceptedCarePlanItem = {
  formId: 'med-1',
  formName: 'Medication',
  pictureUrl: null,
  acceptedAt: '2026-01-01',
  carePlanArea: 'Medication',
}

function job(linkedIds: string[]): TimelineJob {
  return {
    id: 'job-1',
    jobName: 'Morning',
    status: 'ALLOCATED',
    serviceUserId: 'su-1',
    serviceUser: { id: 'su-1', firstName: 'Test', lastName: 'User' },
    scheduledStartDateTime: '2026-06-16T08:00:00.000Z',
    scheduledEndDateTime: '2026-06-16T09:00:00.000Z',
    requiredCarers: 1,
    allocations: [],
    visitPlan: {
      slotId: 'slot-1',
      slotCode: 'MORNING',
      label: 'Morning',
      linkedCarePlanFormIds: linkedIds,
    },
  }
}

describe('schedule-job-complete-care-plans', () => {
  it('merges accepted plans with linked visit-plan ids', () => {
    const options = carePlanOptionsForScheduleJob([medication], ['extra-1'])
    expect(options).toHaveLength(2)
    expect(options.map((o) => o.formId)).toEqual(expect.arrayContaining(['med-1', 'extra-1']))
  })

  it('pre-selects linked ids that exist in options', () => {
    const selected = defaultDeliveredCarePlanIds(job(['med-1', 'missing']), [medication])
    expect(selected).toEqual(['med-1'])
  })
})
