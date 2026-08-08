import { describe, expect, it } from 'vitest'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  applyScheduleSharedJobFilters,
  buildCarerFilterOptionsFromJobs,
  timelineJobMatchesAllocatedEmployees,
} from '@/features/scheduling/utils/schedule-shared-job-filters.util'

function job(partial: Record<string, unknown> & { id: string }): TimelineJob {
  return {
    jobName: 'Visit',
    status: 'ALLOCATED',
    serviceUserId: 'su-1',
    requiredCarers: 1,
    scheduledStartDateTime: '2026-07-01T09:00:00.000Z',
    scheduledEndDateTime: '2026-07-01T10:00:00.000Z',
    allocations: [],
    serviceUser: { id: 'su-1', firstName: 'A', lastName: 'B', locationId: 'loc-1' },
    ...partial,
  } as TimelineJob
}

describe('schedule-shared-job-filters.util', () => {
  it('matches allocated employees', () => {
    const allocated = job({
      id: 'j1',
      allocations: [{ employeeId: 'e1' }],
    })
    expect(timelineJobMatchesAllocatedEmployees(allocated, [])).toBe(true)
    expect(timelineJobMatchesAllocatedEmployees(allocated, ['e1'])).toBe(true)
    expect(timelineJobMatchesAllocatedEmployees(allocated, ['e2'])).toBe(false)
  })

  it('applies combined filters', () => {
    const jobs = [
      job({
        id: 'j1',
        serviceUserId: 'su-1',
        requiredCarers: 2,
        allocations: [{ employeeId: 'e1' }],
        serviceUser: { id: 'su-1', firstName: 'A', lastName: 'B', locationId: 'loc-1' },
      }),
      job({
        id: 'j2',
        serviceUserId: 'su-2',
        requiredCarers: 1,
        allocations: [{ employeeId: 'e2' }],
        serviceUser: { id: 'su-2', firstName: 'C', lastName: 'D', locationId: 'loc-2' },
      }),
    ]

    const filtered = applyScheduleSharedJobFilters(jobs, {
      locationIds: ['loc-1'],
      serviceUserIds: ['su-1'],
      employeeIds: ['e1'],
      requiredCarersFilters: ['2'],
    })
    expect(filtered.map((row) => row.id)).toEqual(['j1'])
  })

  it('builds carer options from allocations', () => {
    const jobs = [
      job({
        id: 'j1',
        allocations: [
          {
            employeeId: 'e1',
            employee: { firstName: 'Tufail', lastName: 'Khan' },
          },
        ],
      }),
    ]
    expect(buildCarerFilterOptionsFromJobs(jobs)).toEqual([{ id: 'e1', label: 'Tufail Khan' }])
  })
})
