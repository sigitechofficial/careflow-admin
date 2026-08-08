import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { filterTimelineJobsByLocation } from '@/features/scheduling/utils/schedule-jobs-location-filter.util'
import {
  timelineJobMatchesRequiredCarersFilters,
  type ScheduleJobsRequiredCarersFilterValue,
} from '@/features/scheduling/utils/schedule-jobs-required-carers-filter.util'
import { timelineJobMatchesServiceUsers } from '@/features/scheduling/utils/schedule-jobs-service-user-filter.util'
import type { ScheduleJobsBoard } from '@/features/scheduling/utils/schedule-jobs-timeline.util'

export type ScheduleSharedJobFilters = {
  locationIds: string[]
  serviceUserIds: string[]
  employeeIds: string[]
  requiredCarersFilters: ScheduleJobsRequiredCarersFilterValue[]
}

export function timelineJobMatchesAllocatedEmployees(
  job: TimelineJob,
  employeeIds: string[],
): boolean {
  if (!employeeIds.length) return true
  const allocated = new Set(
    (job.allocations ?? [])
      .map((allocation) => allocation.employeeId)
      .filter(Boolean),
  )
  return employeeIds.some((employeeId) => allocated.has(employeeId))
}

export function filterTimelineJobsByAllocatedEmployees(
  jobs: TimelineJob[],
  employeeIds: string[],
): TimelineJob[] {
  if (!employeeIds.length) return jobs
  return jobs.filter((job) => timelineJobMatchesAllocatedEmployees(job, employeeIds))
}

/** Apply shared schedule filters (branch, SU, carers, required carers) to a job list. */
export function applyScheduleSharedJobFilters(
  jobs: TimelineJob[],
  filters: ScheduleSharedJobFilters,
): TimelineJob[] {
  let next = filterTimelineJobsByLocation(jobs, filters.locationIds)
  if (filters.serviceUserIds.length) {
    next = next.filter((job) => timelineJobMatchesServiceUsers(job, filters.serviceUserIds))
  }
  if (filters.requiredCarersFilters.length) {
    next = next.filter((job) =>
      timelineJobMatchesRequiredCarersFilters(job, filters.requiredCarersFilters),
    )
  }
  next = filterTimelineJobsByAllocatedEmployees(next, filters.employeeIds)
  return next
}

export function buildCarerFilterOptionsFromJobs(
  jobs: TimelineJob[],
): Array<{ id: string; label: string }> {
  const byId = new Map<string, string>()
  for (const job of jobs) {
    for (const allocation of job.allocations ?? []) {
      if (!allocation.employeeId || byId.has(allocation.employeeId)) continue
      const name = [allocation.employee?.firstName, allocation.employee?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim()
      byId.set(allocation.employeeId, name || 'Carer')
    }
  }
  return [...byId.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'en'))
}

/** Narrow a rota board to jobs allocated to any of the selected carers. */
export function applyScheduleJobsEmployeeFilter(
  board: ScheduleJobsBoard,
  employeeIds: string[],
): ScheduleJobsBoard {
  if (!employeeIds.length) return board

  const selected = new Set(employeeIds)
  const visible = (job: TimelineJob) => timelineJobMatchesAllocatedEmployees(job, employeeIds)

  const employeeRows = board.employeeRows
    .filter((row) => selected.has(row.employee.id))
    .map((row) => ({
      ...row,
      allocations: row.allocations.filter((allocation) => visible(allocation.job)),
    }))

  const unassignedJobs = board.unassignedJobs.filter(visible)
  const cancelledJobs = board.cancelledJobs.filter(visible)
  const allJobs = board.allJobs.filter(visible)
  const carers = employeeRows.filter((row) => row.allocations.length > 0)

  return { employeeRows, carers, unassignedJobs, cancelledJobs, allJobs }
}
