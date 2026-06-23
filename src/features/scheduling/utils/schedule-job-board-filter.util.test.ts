import { describe, expect, it } from 'vitest'
import type { EmployeeDayRow, TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type { ScheduleJobsBoard } from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import {
  applyScheduleOperationalFilters,
  countScheduleJobsByOperationalFilter,
  jobMatchesOperationalFilter,
} from '@/features/scheduling/utils/schedule-job-board-filter.util'

function makeJob(
  id: string,
  overrides: Partial<TimelineJob> = {},
): TimelineJob {
  return {
    id,
    jobName: `Job ${id}`,
    status: 'ALLOCATED',
    serviceUserId: 'su-pat',
    serviceUser: { id: 'su-pat', firstName: 'Pat', lastName: 'Client', locationId: null, location: null },
    scheduledStartDateTime: '2026-06-23T07:00:00.000Z',
    scheduledEndDateTime: '2026-06-23T08:00:00.000Z',
    requiredCarers: 1,
    allocations: [
      {
        id: 'alloc-1',
        status: 'CONFIRMED',
        employeeId: 'carer-casey',
        employee: { id: 'carer-casey', firstName: 'Casey', lastName: 'Demo-Carer' },
      },
    ],
    ...overrides,
  }
}

function board(overrides: Partial<ScheduleJobsBoard> = {}): ScheduleJobsBoard {
  return {
    employeeRows: [],
    carers: [],
    unassignedJobs: [],
    cancelledJobs: [],
    allJobs: [],
    ...overrides,
  }
}

describe('jobMatchesOperationalFilter', () => {
  it('detects carer on leave and unassigned visits', () => {
    const onLeave = makeJob('leave', { carersOnLeave: ['carer-casey'], needsCover: true })
    const unassigned = makeJob('open', {
      status: 'UNALLOCATED',
      allocations: [],
    })

    expect(jobMatchesOperationalFilter(onLeave, 'carer-on-leave')).toBe(true)
    expect(jobMatchesOperationalFilter(onLeave, 'needs-cover')).toBe(true)
    expect(jobMatchesOperationalFilter(unassigned, 'unassigned')).toBe(true)
    expect(jobMatchesOperationalFilter(unassigned, 'carer-on-leave')).toBe(false)
  })

  it('detects outside-pattern jobs when id set is provided', () => {
    const job = makeJob('pattern', { status: 'ALLOCATED' })
    const outside = new Set(['pattern'])
    expect(jobMatchesOperationalFilter(job, 'outside-pattern', outside)).toBe(true)
    expect(jobMatchesOperationalFilter(job, 'outside-pattern', new Set())).toBe(false)
  })
})

describe('applyScheduleOperationalFilters', () => {
  it('filters jobs by selected operational chips', () => {
    const onLeave = makeJob('leave', { carersOnLeave: ['carer-casey'], needsCover: true })
    const open = makeJob('open', { status: 'UNALLOCATED', allocations: [] })
    const result = applyScheduleOperationalFilters(
      board({ allJobs: [onLeave, open], unassignedJobs: [open] }),
      new Set(['carer-on-leave']),
      new Set(),
    )

    expect(result.allJobs.map((job) => job.id)).toEqual(['leave'])
    expect(result.unassignedJobs).toHaveLength(0)
  })

  it('keeps carer rows on approved leave when the carer filter is active', () => {
    const onLeaveJob = makeJob('leave', { carersOnLeave: ['carer-casey'], needsCover: true })
    const row: EmployeeDayRow = {
      employee: { id: 'carer-casey', firstName: 'Casey', lastName: 'Demo-Carer' },
      allocations: [{ id: 'alloc-1', status: 'CONFIRMED', job: onLeaveJob }],
      totalMinutes: 60,
      onHoliday: true,
    }
    const result = applyScheduleOperationalFilters(
      board({ employeeRows: [row], allJobs: [onLeaveJob] }),
      new Set(),
      new Set(['carer-on-leave-today']),
    )

    expect(result.employeeRows.map((entry) => entry.employee.id)).toEqual(['carer-casey'])
  })
})

describe('countScheduleJobsByOperationalFilter', () => {
  it('counts each operational category independently', () => {
    const counts = countScheduleJobsByOperationalFilter([
      makeJob('leave', { carersOnLeave: ['carer-casey'], needsCover: true }),
      makeJob('open', { status: 'UNALLOCATED', allocations: [] }),
    ])

    expect(counts['carer-on-leave']).toBe(1)
    expect(counts['needs-cover']).toBe(1)
    expect(counts.unassigned).toBe(1)
  })
})
