import { describe, expect, it } from 'vitest'
import type { EmployeeDayRow, TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type { ScheduleJobsBoard } from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { applyScheduleJobsRequiredCarersFilter } from '@/features/scheduling/utils/schedule-jobs-required-carers-filter.util'

function makeJob(id: string, requiredCarers: number): TimelineJob {
  return {
    id,
    jobName: `Job ${id}`,
    status: 'SCHEDULED',
    serviceUserId: 'su-1',
    serviceUser: { id: 'su-1', firstName: 'Ada', lastName: 'Lovelace', locationId: null, location: null },
    scheduledStartDateTime: '2026-06-18T09:00:00.000Z',
    scheduledEndDateTime: '2026-06-18T10:00:00.000Z',
    requiredCarers,
    allocations: [],
  }
}

function makeRow(id: string, firstName: string, job?: TimelineJob): EmployeeDayRow {
  return {
    employee: {
      id,
      firstName,
      lastName: 'Carer',
      role: null,
      jobTitle: null,
    },
    allocations: job
      ? [
          {
            id: `alloc-${job.id}`,
            status: 'CONFIRMED',
            job,
          },
        ]
      : [],
    totalMinutes: job ? 60 : 0,
  }
}

function board(overrides: Partial<ScheduleJobsBoard> = {}): ScheduleJobsBoard {
  const single = makeJob('single', 1)
  const double = makeJob('double', 2)
  const carerA = makeRow('carer-a', 'Alice', double)
  const carerB = makeRow('carer-b', 'Bob')
  return {
    employeeRows: [carerA, carerB],
    carers: [carerA],
    unassignedJobs: [single],
    cancelledJobs: [],
    allJobs: [single, double],
    ...overrides,
  }
}

describe('applyScheduleJobsRequiredCarersFilter', () => {
  it('keeps all carers visible when filtering single-carer visits with no matching allocations', () => {
    const result = applyScheduleJobsRequiredCarersFilter(board(), ['1'])

    expect(result.employeeRows).toHaveLength(2)
    expect(result.employeeRows.map((row) => row.employee.id)).toEqual(['carer-a', 'carer-b'])
    expect(result.employeeRows.every((row) => row.allocations.length === 0)).toBe(true)
    expect(result.unassignedJobs).toHaveLength(1)
    expect(result.unassignedJobs[0]?.id).toBe('single')
    expect(result.allJobs).toHaveLength(1)
    expect(result.allJobs[0]?.requiredCarers).toBe(1)
  })

  it('filters assigned jobs on carer rows without removing carers', () => {
    const result = applyScheduleJobsRequiredCarersFilter(board(), ['2'])

    expect(result.employeeRows).toHaveLength(2)
    expect(result.employeeRows.find((row) => row.employee.id === 'carer-a')?.allocations).toHaveLength(1)
    expect(result.employeeRows.find((row) => row.employee.id === 'carer-b')?.allocations).toHaveLength(0)
  })
})
