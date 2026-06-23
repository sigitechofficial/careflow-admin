import type { EmployeeListRow } from '@/features/employees/api/employees.api'
import type { EmployeeDayRow, TimelineJob } from '@/features/scheduling/types/scheduling.types'

export type EmployeeLocationCatalogRow = Pick<
  EmployeeListRow,
  'locationId' | 'baseLocationIds' | 'accessAllZones'
>

export function employeeMatchesScheduleLocation(
  employeeId: string,
  locationId: string,
  catalogById: Map<string, EmployeeLocationCatalogRow>,
): boolean {
  const row = catalogById.get(employeeId)
  if (!row) return false
  if (row.accessAllZones) return true
  if (row.locationId === locationId) return true
  return (row.baseLocationIds ?? []).includes(locationId)
}

export function resolveTimelineJobLocationId(job: {
  serviceUser: { locationId?: string | null }
  scheduleArea?: { locationId?: string | null } | null
}): string | null {
  return job.serviceUser.locationId ?? job.scheduleArea?.locationId ?? null
}

export function resolveTimelineJobLocationIds(job: {
  serviceUser: { locationId?: string | null }
  scheduleArea?: { locationId?: string | null } | null
}): string[] {
  const ids: string[] = []
  const serviceUserLocationId = job.serviceUser.locationId
  const scheduleAreaLocationId = job.scheduleArea?.locationId ?? null
  if (serviceUserLocationId) ids.push(serviceUserLocationId)
  if (scheduleAreaLocationId && scheduleAreaLocationId !== serviceUserLocationId) {
    ids.push(scheduleAreaLocationId)
  }
  return ids
}

export function serviceUserJobMatchesScheduleLocation(
  job: TimelineJob,
  locationId: string,
): boolean {
  return resolveTimelineJobLocationIds(job).includes(locationId)
}

export function filterTimelineJobsByLocation(
  jobs: TimelineJob[],
  locationIds: string[] | string | null,
): TimelineJob[] {
  const ids = Array.isArray(locationIds)
    ? locationIds
    : locationIds
      ? [locationIds]
      : []
  if (!ids.length) return jobs
  const idSet = new Set(ids)
  return jobs.filter((job) =>
    resolveTimelineJobLocationIds(job).some((locationId) => idSet.has(locationId)),
  )
}

export function filterEmployeeDayRowsByLocation(
  rows: EmployeeDayRow[],
  locationIds: string[] | string | null,
  catalogById: Map<string, EmployeeLocationCatalogRow>,
): EmployeeDayRow[] {  const ids = Array.isArray(locationIds)
    ? locationIds
    : locationIds
      ? [locationIds]
      : []
  if (!ids.length) return rows
  return rows.filter((row) =>
    ids.some((locationId) =>
      employeeMatchesScheduleLocation(row.employee.id, locationId, catalogById),
    ),
  )
}

export function buildEmployeeLocationCatalogMap(
  catalog: EmployeeListRow[],
): Map<string, EmployeeLocationCatalogRow> {
  return new Map(
    catalog.map((row) => [
      row.id,
      {
        locationId: row.locationId ?? null,
        baseLocationIds: row.baseLocationIds ?? [],
        accessAllZones: row.accessAllZones ?? false,
      },
    ]),
  )
}

/** Block drag-assign when the visit's service user location does not match the target carer. */
export function scheduleJobCarerLocationConflictMessage(
  job: TimelineJob,
  targetRow: { kind: 'unassigned' } | { kind: 'carer'; employeeId: string },
  catalogById: Map<string, EmployeeLocationCatalogRow>,
  locationNameById: Map<string, string>,
): string | null {  const jobLocationId = resolveTimelineJobLocationId(job)
  if (!jobLocationId || targetRow.kind !== 'carer') return null

  if (employeeMatchesScheduleLocation(targetRow.employeeId, jobLocationId, catalogById)) {
    return null
  }

  const visitLocation =
    job.serviceUser.displayLabel?.trim() ||
    job.serviceUser.location?.name ||
    locationNameById.get(jobLocationId) ||
    'this location'

  return `This visit is for ${visitLocation}. You can only assign a job to a carer at the same location.`
}
