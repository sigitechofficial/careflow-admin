import { describe, expect, it } from 'vitest'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import {
  jobRotaTimeRange,
  rotaTimingDiffersFromCallPattern,
} from '@/features/scheduling/utils/schedule-job-hover-details.util'

function job(partial: Partial<TimelineJob>): TimelineJob {
  return {
    id: 'job-1',
    jobName: 'Morning visit',
    status: 'SCHEDULED',
    serviceUserId: 'su-1',
    serviceUser: { id: 'su-1', firstName: 'Ada', lastName: 'Lovelace' },
    scheduledStartDateTime: '2026-06-15T09:00:00.000Z',
    scheduledEndDateTime: '2026-06-15T10:00:00.000Z',
    requiredCarers: 1,
    allocations: [],
    ...partial,
  }
}

const slot: VisitPlanSlot = {
  slotCode: 'MORN',
  label: 'Morning',
  daysOfWeek: [1, 3, 5],
  plannedStartTime: '09:00',
  plannedEndTime: '10:00',
  requiredCarers: 1,
  isEnabled: true,
  medicationRoundCode: null,
  notes: '',
  sortOrder: 0,
  scheduleFrequency: 'WEEKLY',
  repeatEvery: 1,
  repeatUnit: 'WEEKS',
  timeCritical: false,
  timeToleranceMinutes: 0,
  durationMinutes: 60,
  notesRequired: false,
  photoAllowed: false,
  shareOutcomeWithFamily: false,
  analysisArea: null,
  monthlyDayMode: 'BY_DATE',
  monthlyDaysOfMonth: [],
  monthlyPatternOrdinal: null,
  monthlyPatternWeekday: null,
  linkedCarePlanFormIds: [],
  assignedEmployeeIds: [],
}

describe('schedule-job-hover-details', () => {
  it('detects unchanged rota timing vs call pattern', () => {
    expect(rotaTimingDiffersFromCallPattern(job({}), slot)).toBe(false)
  })

  it('detects rescheduled rota timing after drag', () => {
    const moved = job({
      scheduledStartDateTime: '2026-06-15T11:30:00.000Z',
      scheduledEndDateTime: '2026-06-15T12:30:00.000Z',
    })
    expect(rotaTimingDiffersFromCallPattern(moved, slot)).toBe(true)
    expect(jobRotaTimeRange(moved).start).toBe('11:30')
    expect(jobRotaTimeRange(moved).end).toBe('12:30')
  })
})
