import { describe, expect, it } from 'vitest'
import type { EmployeeDayRow } from '@/features/scheduling/types/scheduling.types'
import {
  filterScheduleJobsEmployeeRows,
  filterScheduleJobsServiceUserRows,
  scheduleJobsRowSearchMatches,
} from '@/features/scheduling/utils/schedule-jobs-row-search.util'

describe('scheduleJobsRowSearchMatches', () => {
  it('matches case-insensitive substrings', () => {
    expect(scheduleJobsRowSearchMatches('tuf', 'Tufail Khan')).toBe(true)
    expect(scheduleJobsRowSearchMatches('khan', 'Tufail Khan')).toBe(true)
    expect(scheduleJobsRowSearchMatches('bob', 'Tufail Khan')).toBe(false)
  })

  it('returns true for empty query', () => {
    expect(scheduleJobsRowSearchMatches('', 'Anyone')).toBe(true)
    expect(scheduleJobsRowSearchMatches('   ', 'Anyone')).toBe(true)
  })
})

describe('filterScheduleJobsServiceUserRows', () => {
  it('filters by service user name and number', () => {
    const rows = filterScheduleJobsServiceUserRows(
      [
        {
          serviceUser: {
            id: 'su-1',
            firstName: 'Alex',
            lastName: 'Smith',
            serviceUserNumber: 'SU-001',
          },
          jobs: [],
        },
        {
          serviceUser: {
            id: 'su-2',
            firstName: 'Bob',
            lastName: 'Lee',
          },
          jobs: [],
        },
      ],
      'su-001',
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]?.serviceUser.id).toBe('su-1')
  })
})

describe('filterScheduleJobsEmployeeRows', () => {
  it('filters by carer display name', () => {
    const employeeRows: EmployeeDayRow[] = [
      {
        employee: {
          id: 'e1',
          firstName: 'Tufail',
          lastName: 'Khan',
        },
        allocations: [],
        totalMinutes: 0,
      },
      {
        employee: {
          id: 'e2',
          firstName: 'Jane',
          lastName: 'Doe',
        },
        allocations: [],
        totalMinutes: 0,
      },
    ]

    const rows = filterScheduleJobsEmployeeRows(employeeRows, 'tufail', new Set())
    expect(rows).toHaveLength(1)
    expect(rows[0]?.employee.id).toBe('e1')
  })
})
