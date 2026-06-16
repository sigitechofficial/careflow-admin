import type { EmployeeListRow } from '@/features/employees/api/employees.api'
import type { EmployeeDayRow, TimelineJob } from '@/features/scheduling/types/scheduling.types'

export function employeeMatchesScheduleLocation(
  employeeId: string,
  locationId: string,
  catalogById: Map<string, Pick<EmployeeListRow, 'locationId' | 'baseLocationIds'>>,
): boolean {
  const row = catalogById.get(employeeId)
  if (!row) return false
  if (row.locationId === locationId) return true
  return (row.baseLocationIds ?? []).includes(locationId)
}

export function serviceUserJobMatchesScheduleLocation(job: TimelineJob, locationId: string): boolean {
  return job.serviceUser.locationId === locationId
}

export function filterTimelineJobsByLocation(jobs: TimelineJob[], locationId: string | null): TimelineJob[] {
  if (!locationId) return jobs
  return jobs.filter((job) => serviceUserJobMatchesScheduleLocation(job, locationId))
}

export function filterEmployeeDayRowsByLocation(
  rows: EmployeeDayRow[],
  locationId: string | null,
  catalogById: Map<string, Pick<EmployeeListRow, 'locationId' | 'baseLocationIds'>>,
): EmployeeDayRow[] {
  if (!locationId) return rows
  return rows.filter((row) => employeeMatchesScheduleLocation(row.employee.id, locationId, catalogById))
}

export function buildEmployeeLocationCatalogMap(
  catalog: EmployeeListRow[],
): Map<string, Pick<EmployeeListRow, 'locationId' | 'baseLocationIds'>> {
  return new Map(
    catalog.map((row) => [
      row.id,
      { locationId: row.locationId ?? null, baseLocationIds: row.baseLocationIds ?? [] },
    ]),
  )
}
