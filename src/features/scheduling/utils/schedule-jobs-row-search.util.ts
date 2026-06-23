import type { EmployeeDayRow } from '@/features/scheduling/types/scheduling.types'
import { serviceUserLabel } from '@/features/scheduling/utils/scheduling-format'
import type { ServiceUserDayRow } from '@/features/scheduling/utils/schedule-jobs-board-axis.util'
import {
  employeeBriefDisplayName,
  employeeBriefFullName,
  employeeBriefRoleLabel,
  employeeBriefRowLabel,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'

export function normalizeScheduleJobsRowSearchQuery(query: string): string {
  return query.trim().toLowerCase()
}

export function scheduleJobsRowSearchMatches(
  query: string,
  ...haystacks: Array<string | null | undefined>
): boolean {
  const normalized = normalizeScheduleJobsRowSearchQuery(query)
  if (!normalized) return true
  return haystacks.some((value) => (value ?? '').toLowerCase().includes(normalized))
}

export function filterScheduleJobsEmployeeRows(
  rows: EmployeeDayRow[],
  query: string,
  duplicateNameIds: Set<string>,
): EmployeeDayRow[] {
  if (!normalizeScheduleJobsRowSearchQuery(query)) return rows
  return rows.filter((row) => {
    const display = employeeBriefDisplayName(row.employee)
    const full = employeeBriefFullName(row.employee)
    const { label, subtitle } = employeeBriefRowLabel(
      row.employee,
      duplicateNameIds.has(row.employee.id),
    )
    return scheduleJobsRowSearchMatches(
      query,
      label,
      subtitle,
      full,
      display,
      employeeBriefRoleLabel(row.employee),
      row.employee.email,
    )
  })
}

export function filterScheduleJobsServiceUserRows(
  rows: ServiceUserDayRow[],
  query: string,
): ServiceUserDayRow[] {
  if (!normalizeScheduleJobsRowSearchQuery(query)) return rows
  return rows.filter((row) => {
    const su = row.serviceUser
    return scheduleJobsRowSearchMatches(
      query,
      serviceUserLabel(su),
      su.preferredName,
      su.firstName,
      su.lastName,
      su.serviceUserNumber,
      su.location?.name,
    )
  })
}
