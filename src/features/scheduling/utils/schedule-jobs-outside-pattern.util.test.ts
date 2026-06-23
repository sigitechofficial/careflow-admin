import { describe, expect, it } from 'vitest'
import type { EmployeeDayRow, TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { collectOutsidePatternJobIds } from '@/features/scheduling/utils/schedule-jobs-outside-pattern.util'

function makeJob(id: string, start: string, end: string): TimelineJob {
  return {
    id,
    jobName: `Job ${id}`,
    status: 'ALLOCATED',
    serviceUserId: 'su-1',
    serviceUser: { id: 'su-1', firstName: 'Pat', lastName: 'Client', locationId: null, location: null },
    scheduledStartDateTime: start,
    scheduledEndDateTime: end,
    requiredCarers: 1,
    allocations: [
      {
        id: 'alloc-1',
        status: 'CONFIRMED',
        employeeId: 'carer-1',
        employee: { id: 'carer-1', firstName: 'Yusuf', lastName: 'Ali' },
      },
    ],
  }
}

describe('collectOutsidePatternJobIds', () => {
  it('flags jobs outside the carer day pattern', () => {
    const job = makeJob('outside', '2026-06-23T07:00:00.000Z', '2026-06-23T08:00:00.000Z')
    const row: EmployeeDayRow = {
      employee: { id: 'carer-1', firstName: 'Yusuf', lastName: 'Ali' },
      allocations: [{ id: 'alloc-1', status: 'CONFIRMED', job }],
      totalMinutes: 60,
      dayPattern: {
        isAvailable: true,
        startTime: '09:00',
        endTime: '17:00',
        isPartial: false,
      },
    }

    const ids = collectOutsidePatternJobIds([row])
    expect(ids.has('outside')).toBe(true)
  })

  it('skips rows without day pattern', () => {
    const job = makeJob('any', '2026-06-23T07:00:00.000Z', '2026-06-23T08:00:00.000Z')
    const row: EmployeeDayRow = {
      employee: { id: 'carer-1', firstName: 'Yusuf', lastName: 'Ali' },
      allocations: [{ id: 'alloc-1', status: 'CONFIRMED', job }],
      totalMinutes: 60,
    }

    expect(collectOutsidePatternJobIds([row]).size).toBe(0)
  })
})
