import { describe, expect, it } from 'vitest'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { jobIsTimeCritical, resolveJobTimeCritical } from './schedule-job-time-critical.util'

const baseJob = {
  id: 'job-1',
  jobName: 'Morning',
  status: 'PLANNED',
  serviceUserId: 'su-1',
  serviceUser: { id: 'su-1', firstName: 'Test', lastName: 'User' },
  scheduledStartDateTime: '2026-06-19T08:00:00.000Z',
  scheduledEndDateTime: '2026-06-19T09:00:00.000Z',
  requiredCarers: 1,
  allocations: [],
} satisfies TimelineJob

const criticalSlot: VisitPlanSlot = {
  id: 'slot-1',
  slotCode: 'MIDDAY',
  label: 'Midday',
  daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
  plannedStartTime: '12:00',
  plannedEndTime: '13:00',
  requiredCarers: 1,
  isEnabled: true,
  medicationRoundCode: null,
  notes: '',
  sortOrder: 0,
  scheduleFrequency: 'WEEKLY',
  repeatEvery: 1,
  repeatUnit: 'WEEKS',
  timeCritical: true,
  timeToleranceMinutes: 15,
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
  slotKind: 'STANDARD',
  nightDuty: 'NONE',
  slotEffectiveFrom: null,
  slotEffectiveTo: null,
  oneOffDate: null,
  allowBackfillDays: 0,
  carerAssignments: [],
  exceptions: [],
}

describe('schedule-job-time-critical.util', () => {
  it('returns tolerance when visit plan slot is time critical', () => {
    const job: TimelineJob = {
      ...baseJob,
      visitPlan: { slotId: 'slot-1', slotCode: 'MIDDAY', label: 'Midday', linkedCarePlanFormIds: [] },
    }
    const slots = new Map<string, VisitPlanSlot[]>([['su-1', [criticalSlot]]])

    expect(resolveJobTimeCritical(job, slots)).toEqual({ timeToleranceMinutes: 15 })
    expect(jobIsTimeCritical(job, slots)).toBe(true)
  })

  it('flags a visit from time-sensitive medicines or tasks', () => {
    const job: TimelineJob = {
      ...baseJob,
      timeSensitive: {
        hasAny: true,
        clock: 'due',
        items: [
          {
            kind: 'MEDICINE',
            name: 'Insulin',
            dueTime: '08:00',
            givenTime: null,
            toleranceMinutes: 20,
            status: 'due',
          },
        ],
        chips: [],
      },
    }
    expect(resolveJobTimeCritical(job)).toEqual({ timeToleranceMinutes: 20 })
    expect(jobIsTimeCritical(job)).toBe(true)
  })

  it('returns null when slot is not time critical', () => {
    const job: TimelineJob = {
      ...baseJob,
      visitPlan: { slotId: 'slot-1', slotCode: 'MIDDAY', label: 'Midday', linkedCarePlanFormIds: [] },
    }
    const slots = new Map<string, VisitPlanSlot[]>([
      ['su-1', [{ ...criticalSlot, timeCritical: false }]],
    ])

    expect(resolveJobTimeCritical(job, slots)).toBeNull()
    expect(jobIsTimeCritical(job, slots)).toBe(false)
  })
})
