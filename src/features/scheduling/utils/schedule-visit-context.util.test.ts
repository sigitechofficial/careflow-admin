import { describe, expect, it } from 'vitest'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  buildScheduleVisitContext,
  resolveJobMedicationRequired,
  resolveScheduledVisitId,
} from '@/features/scheduling/utils/schedule-visit-context.util'

const job: TimelineJob = {
  id: 'job-1',
  jobName: 'Morning — Margaret',
  status: 'ALLOCATED',
  serviceUserId: 'su-1',
  serviceUser: { id: 'su-1', firstName: 'Margaret', lastName: 'H' },
  scheduledStartDateTime: '2026-06-18T08:00:00.000Z',
  scheduledEndDateTime: '2026-06-18T09:00:00.000Z',
  requiredCarers: 1,
  allocations: [],
  visits: [
    {
      id: 'visit-1',
      visitName: 'Morning',
      visitPlanSlotId: 'slot-1',
      medicationRequired: true,
    },
  ],
  visitPlan: {
    slotId: 'slot-1',
    slotCode: 'MORNING',
    label: 'Morning',
    linkedCarePlanFormIds: [],
    medicationRoundCode: 'MORNING',
  },
}

describe('schedule-visit-context.util', () => {
  it('resolves visit id from job visits', () => {
    expect(resolveScheduledVisitId(job)).toBe('visit-1')
  })

  it('uses persisted visit.medicationRequired (not round code alone)', () => {
    expect(resolveJobMedicationRequired(job)).toBe(true)
    expect(
      resolveJobMedicationRequired({
        ...job,
        visits: [{ id: 'visit-1', visitName: 'Morning', visitPlanSlotId: 'slot-1', medicationRequired: false }],
      }),
    ).toBe(false)
    expect(
      resolveJobMedicationRequired({
        ...job,
        visits: [{ id: 'visit-1', visitName: 'Morning', visitPlanSlotId: 'slot-1' }],
      }),
    ).toBe(false)
  })

  it('builds visit context for workspace', () => {
    expect(buildScheduleVisitContext(job, '2026-06-18')).toEqual({
      scheduledJobId: 'job-1',
      scheduledVisitId: 'visit-1',
      serviceUserId: 'su-1',
      scheduleDate: '2026-06-18',
      medicationRequired: true,
    })
  })
})
