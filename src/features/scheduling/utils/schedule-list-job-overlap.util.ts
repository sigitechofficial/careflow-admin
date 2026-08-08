import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { jobsTimeOverlap } from '@/features/scheduling/utils/schedule-jobs-overlap-lanes.util'

export type ScheduleListJobOverlapInfo = {
  /** Other job ids that overlap in time for the same service user. */
  serviceUserOverlapJobIds: string[]
  /** Other job ids that overlap for at least one shared allocated carer. */
  carerOverlapJobIds: string[]
}

function collectOverlapsInGroup(jobs: TimelineJob[]): Map<string, Set<string>> {
  const byId = new Map<string, Set<string>>()
  for (const job of jobs) byId.set(job.id, new Set())

  for (let i = 0; i < jobs.length; i += 1) {
    for (let j = i + 1; j < jobs.length; j += 1) {
      const a = jobs[i]!
      const b = jobs[j]!
      if (!jobsTimeOverlap(a, b)) continue
      byId.get(a.id)!.add(b.id)
      byId.get(b.id)!.add(a.id)
    }
  }
  return byId
}

/**
 * Overlaps that matter on the list: same service user, or same allocated carer
 * (double-booked staff). Computed within the provided job set (usually one day).
 */
export function buildScheduleListJobOverlapInfo(
  jobs: TimelineJob[],
): Map<string, ScheduleListJobOverlapInfo> {
  const result = new Map<string, ScheduleListJobOverlapInfo>()
  for (const job of jobs) {
    result.set(job.id, { serviceUserOverlapJobIds: [], carerOverlapJobIds: [] })
  }
  if (jobs.length < 2) return result

  const byServiceUser = new Map<string, TimelineJob[]>()
  for (const job of jobs) {
    const list = byServiceUser.get(job.serviceUserId)
    if (list) list.push(job)
    else byServiceUser.set(job.serviceUserId, [job])
  }

  for (const group of byServiceUser.values()) {
    if (group.length < 2) continue
    for (const [jobId, others] of collectOverlapsInGroup(group)) {
      const info = result.get(jobId)
      if (info) info.serviceUserOverlapJobIds = [...others]
    }
  }

  const byEmployee = new Map<string, TimelineJob[]>()
  for (const job of jobs) {
    const employeeIds = new Set(
      (job.allocations ?? [])
        .map((a) => a.employee?.id ?? a.employeeId)
        .filter(Boolean) as string[],
    )
    for (const employeeId of employeeIds) {
      const list = byEmployee.get(employeeId)
      if (list) list.push(job)
      else byEmployee.set(employeeId, [job])
    }
  }

  for (const group of byEmployee.values()) {
    if (group.length < 2) continue
    // Deduplicate jobs if the same job appears once per group
    const unique = [...new Map(group.map((j) => [j.id, j])).values()]
    for (const [jobId, others] of collectOverlapsInGroup(unique)) {
      const info = result.get(jobId)
      if (!info) continue
      const merged = new Set([...info.carerOverlapJobIds, ...others])
      info.carerOverlapJobIds = [...merged]
    }
  }

  return result
}

export function scheduleListJobHasOverlap(info: ScheduleListJobOverlapInfo | undefined): boolean {
  if (!info) return false
  return info.serviceUserOverlapJobIds.length > 0 || info.carerOverlapJobIds.length > 0
}

export function scheduleListJobOverlapCount(info: ScheduleListJobOverlapInfo | undefined): number {
  if (!info) return 0
  return new Set([...info.serviceUserOverlapJobIds, ...info.carerOverlapJobIds]).size
}
