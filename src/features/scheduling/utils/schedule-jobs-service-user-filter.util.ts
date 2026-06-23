import type { EmployeeListRow } from '@/features/employees/api/employees.api'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { assignedEmployeeIdsFromSlots } from '@/features/service-users/visit-plan/visit-plan-employee-names.util'
import type { EmployeeDayRow, ServiceUserBrief, TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { serviceUserLabel } from '@/features/scheduling/utils/scheduling-format'
import {
  employeeBriefFullName,
  type ScheduleJobsBoard,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'

export type ApplyScheduleJobsServiceUserFilterOptions = {
  /** When filtering by service user, also show visit-plan assigned carers (even before rota allocation). */
  visitPlanSlotsByServiceUser?: Map<string, VisitPlanSlot[]>
  /** Fallback when a planned carer was removed by location filters from the board roster. */
  employeeCatalogById?: Map<string, EmployeeListRow>
}

function employeeDayRowFromCatalog(row: EmployeeListRow): EmployeeDayRow {
  return {
    employee: {
      id: row.id,
      firstName: row.firstName ?? undefined,
      lastName: row.lastName ?? undefined,
      role: row.role,
      jobTitle: row.jobTitle,
      isBankStaff: false,
      isAgencyStaff: false,
    },
    allocations: [],
    totalMinutes: 0,
    dayPattern: null,
  }
}

function visitPlanAssignedEmployeeIdsForServiceUsers(
  serviceUserIds: string[],
  visitPlanSlotsByServiceUser?: Map<string, VisitPlanSlot[]>,
): string[] {
  if (!visitPlanSlotsByServiceUser) return []
  const ids = new Set<string>()
  for (const serviceUserId of serviceUserIds) {
    const slots = visitPlanSlotsByServiceUser.get(serviceUserId) ?? []
    for (const employeeId of assignedEmployeeIdsFromSlots(slots.filter((slot) => slot.isEnabled))) {
      ids.add(employeeId)
    }
  }
  return [...ids]
}

function mergeVisitPlanCarerRows(
  employeeRows: EmployeeDayRow[],
  board: ScheduleJobsBoard,
  plannedEmployeeIds: string[],
  employeeCatalogById?: Map<string, EmployeeListRow>,
): EmployeeDayRow[] {
  if (!plannedEmployeeIds.length) return employeeRows

  const byId = new Map(employeeRows.map((row) => [row.employee.id, row]))
  const sourceById = new Map(board.employeeRows.map((row) => [row.employee.id, row]))

  for (const employeeId of plannedEmployeeIds) {
    if (byId.has(employeeId)) continue
    const source = sourceById.get(employeeId)
    if (source) {
      byId.set(employeeId, { ...source, allocations: [] })
      continue
    }
    const catalogRow = employeeCatalogById?.get(employeeId)
    if (catalogRow) {
      byId.set(employeeId, employeeDayRowFromCatalog(catalogRow))
    }
  }

  return [...byId.values()].sort((a, b) =>
    employeeBriefFullName(a.employee).localeCompare(employeeBriefFullName(b.employee), 'en'),
  )
}

export type ScheduleJobsServiceUserOption = {
  id: string
  label: string
}

export function buildScheduleJobsServiceUserOptions(
  jobs: TimelineJob[],
): ScheduleJobsServiceUserOption[] {
  const byId = new Map<string, ScheduleJobsServiceUserOption>()
  for (const job of jobs) {
    if (byId.has(job.serviceUserId)) continue
    byId.set(job.serviceUserId, {
      id: job.serviceUserId,
      label: serviceUserLabel(job.serviceUser),
    })
  }
  return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label, 'en'))
}

export function timelineJobMatchesServiceUser(
  job: TimelineJob,
  serviceUserId: string | null,
): boolean {
  if (!serviceUserId) return true
  return job.serviceUserId === serviceUserId
}

export function timelineJobMatchesServiceUsers(job: TimelineJob, serviceUserIds: string[]): boolean {
  if (!serviceUserIds.length) return true
  return serviceUserIds.includes(job.serviceUserId)
}

export function filterTimelineJobsByServiceUser(
  jobs: TimelineJob[],
  serviceUserId: string | null,
): TimelineJob[] {
  if (!serviceUserId) return jobs
  return jobs.filter((job) => timelineJobMatchesServiceUser(job, serviceUserId))
}

export function applyScheduleJobsServiceUserFilter(
  board: ScheduleJobsBoard,
  serviceUserIds: string[],
  options?: ApplyScheduleJobsServiceUserFilterOptions,
): ScheduleJobsBoard {
  if (!serviceUserIds.length) return board

  const visible = (job: TimelineJob) => timelineJobMatchesServiceUsers(job, serviceUserIds)

  const allocatedRows = board.employeeRows
    .map((row) => ({
      ...row,
      allocations: row.allocations.filter((allocation) => visible(allocation.job)),
    }))
    .filter((row) => row.allocations.length > 0)

  const plannedEmployeeIds = visitPlanAssignedEmployeeIdsForServiceUsers(
    serviceUserIds,
    options?.visitPlanSlotsByServiceUser,
  )
  const employeeRows = mergeVisitPlanCarerRows(
    allocatedRows,
    board,
    plannedEmployeeIds,
    options?.employeeCatalogById,
  )

  const unassignedJobs = board.unassignedJobs.filter(visible)
  const cancelledJobs = board.cancelledJobs.filter(visible)
  const allJobs = board.allJobs.filter(visible)
  const carers = employeeRows.filter((row) => row.allocations.length > 0)

  return { employeeRows, carers, unassignedJobs, cancelledJobs, allJobs }
}

export function findScheduleJobsServiceUserBrief(
  jobs: TimelineJob[],
  serviceUserId: string,
): ServiceUserBrief | null {
  return jobs.find((job) => job.serviceUserId === serviceUserId)?.serviceUser ?? null
}
