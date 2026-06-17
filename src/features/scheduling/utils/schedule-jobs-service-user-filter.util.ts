import type { ServiceUserBrief, TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { serviceUserLabel } from '@/features/scheduling/utils/scheduling-format'
import type { ScheduleJobsBoard } from '@/features/scheduling/utils/schedule-jobs-timeline.util'

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

export function filterTimelineJobsByServiceUser(
  jobs: TimelineJob[],
  serviceUserId: string | null,
): TimelineJob[] {
  if (!serviceUserId) return jobs
  return jobs.filter((job) => timelineJobMatchesServiceUser(job, serviceUserId))
}

export function applyScheduleJobsServiceUserFilter(
  board: ScheduleJobsBoard,
  serviceUserId: string | null,
): ScheduleJobsBoard {
  if (!serviceUserId) return board

  const visible = (job: TimelineJob) => timelineJobMatchesServiceUser(job, serviceUserId)

  const employeeRows = board.employeeRows
    .map((row) => ({
      ...row,
      allocations: row.allocations.filter((allocation) => visible(allocation.job)),
    }))
    .filter((row) => row.allocations.length > 0)

  const unassignedJobs = board.unassignedJobs.filter(visible)
  const allJobs = board.allJobs.filter(visible)
  const carers = employeeRows.filter((row) => row.allocations.length > 0)

  return { employeeRows, carers, unassignedJobs, allJobs }
}

export function findScheduleJobsServiceUserBrief(
  jobs: TimelineJob[],
  serviceUserId: string,
): ServiceUserBrief | null {
  return jobs.find((job) => job.serviceUserId === serviceUserId)?.serviceUser ?? null
}
