import { describe, expect, it } from 'vitest'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  applyScheduleJobsTimeSensitiveFilter,
  jobHasTimeSensitive,
  parseScheduleJobsTimeSensitiveFilter,
  timeSensitiveChips,
  timeSensitiveClockStatus,
  timeSensitiveHoverTitle,
  timeSensitiveNeedsPopup,
  timeSensitivePopupHeadline,
  timeSensitivePopupMeta,
} from './schedule-job-time-sensitive.util'

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

describe('schedule-job-time-sensitive.util', () => {
  it('flags a visit from API time-sensitive payload', () => {
    const job: TimelineJob = {
      ...baseJob,
      timeSensitive: {
        hasAny: true,
        clock: 'delayed',
        items: [
          {
            kind: 'MEDICINE',
            name: 'Insulin',
            dueTime: '08:00',
            givenTime: '08:40',
            toleranceMinutes: 15,
            status: 'delayed',
          },
        ],
        chips: [{ kind: 'MEDICINE', status: 'delayed', label: 'Medicine delayed' }],
      },
    }
    expect(jobHasTimeSensitive(job)).toBe(true)
    expect(timeSensitiveClockStatus(job)).toBe('delayed')
    expect(timeSensitiveChips(job).map((chip) => chip.label)).toEqual(['Medicine delayed'])
    expect(timeSensitiveHoverTitle(job)).toBe(
      'Time-sensitive medicine delayed · Insulin · due 08:00 · given 08:40',
    )
  })

  it('pops delayed and missed visits with a readable headline', () => {
    const delayed: TimelineJob = {
      ...baseJob,
      status: 'STARTED',
      actualStartDateTime: '2026-06-19T08:05:00.000Z',
      timeSensitive: {
        hasAny: true,
        clock: 'delayed',
        items: [
          {
            kind: 'MEDICINE',
            name: 'Aspirin',
            dueTime: '08:00',
            givenTime: null,
            toleranceMinutes: 2,
            status: 'delayed',
          },
        ],
        chips: [{ kind: 'MEDICINE', status: 'delayed', label: 'Medicine delayed' }],
      },
    }
    expect(timeSensitiveNeedsPopup(delayed)).toBe(true)
    expect(timeSensitivePopupHeadline(delayed)).toBe('Medicine delayed')
    expect(timeSensitivePopupMeta(delayed)).toBe('Aspirin · due 08:00')
    expect(timeSensitiveNeedsPopup(baseJob)).toBe(false)
  })

  it('does not pop delayed care after a reset back to planned', () => {
    const reset: TimelineJob = {
      ...baseJob,
      status: 'ALLOCATED',
      actualStartDateTime: null,
      visits: [{ id: 'v1', visitName: 'Morning', visitPlanSlotId: null, status: 'PLANNED' }],
      timeSensitive: {
        hasAny: true,
        clock: 'delayed',
        items: [
          {
            kind: 'MEDICINE',
            name: 'Aspirin',
            dueTime: '08:00',
            givenTime: null,
            toleranceMinutes: 2,
            status: 'delayed',
          },
        ],
        chips: [{ kind: 'MEDICINE', status: 'delayed', label: 'Medicine delayed' }],
      },
    }
    expect(timeSensitiveNeedsPopup(reset)).toBe(false)
  })

  it('ANDs the board down to time-sensitive visits only', () => {
    const delayed: TimelineJob = {
      ...baseJob,
      timeSensitive: {
        hasAny: true,
        clock: 'delayed',
        items: [],
        chips: [{ kind: 'MEDICINE', status: 'delayed', label: 'Medicine delayed' }],
      },
    }
    const ordinary: TimelineJob = { ...baseJob, id: 'job-2' }
    const result = applyScheduleJobsTimeSensitiveFilter(
      {
        employeeRows: [],
        carers: [],
        unassignedJobs: [],
        cancelledJobs: [],
        allJobs: [delayed, ordinary],
      },
      true,
    )
    expect(parseScheduleJobsTimeSensitiveFilter('1')).toBe(true)
    expect(parseScheduleJobsTimeSensitiveFilter(undefined)).toBe(false)
    expect(result.allJobs.map((job) => job.id)).toEqual(['job-1'])
  })
})
