import { describe, expect, it } from 'vitest'
import type { EmployeeListRow } from '@/features/employees/api/employees.api'
import { mergeScheduleJobsEmployeeRoster } from './schedule-jobs-employee-roster.util'
import type { EmployeeDayRow } from '@/features/scheduling/types/scheduling.types'

function catalogRow(id: string, firstName: string, lastName: string): EmployeeListRow {
  return {
    id,
    isActive: true,
    fullName: `${firstName} ${lastName}`,
    firstName,
    lastName,
    photoUrl: null,
    status: null,
    jobTitle: null,
    role: null,
    grade: null,
    contractType: null,
    visaTypeId: null,
    isInCountry: true,
  }
}

describe('mergeScheduleJobsEmployeeRoster', () => {
  it('preserves dayPattern from timeline rows when merging catalog', () => {
    const timelineRows: EmployeeDayRow[] = [
      {
        employee: { id: 'emp-1', firstName: 'Amara', lastName: 'Test' },
        allocations: [],
        totalMinutes: 0,
        dayPattern: {
          isAvailable: true,
          startTime: '09:00',
          endTime: '17:00',
          isPartial: false,
        },
      },
    ]

    const merged = mergeScheduleJobsEmployeeRoster(
      timelineRows,
      [catalogRow('emp-1', 'Amara', 'Test')],
      [],
    )

    const row = merged.find((entry) => entry.employee.id === 'emp-1')
    expect(row?.dayPattern).toEqual({
      isAvailable: true,
      startTime: '09:00',
      endTime: '17:00',
      isPartial: false,
    })
  })

  it('sets dayPattern null for catalog-only employees', () => {
    const merged = mergeScheduleJobsEmployeeRoster(
      [],
      [catalogRow('emp-2', 'Pat', 'Test')],
      [],
    )

    const row = merged.find((entry) => entry.employee.id === 'emp-2')
    expect(row?.dayPattern).toBeNull()
  })
})
