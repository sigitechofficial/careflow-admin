import type { ServiceUserBrief, TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { employeesLabel, employeesShortLabel, serviceUserLabel, serviceUserNameOnly } from '@/features/scheduling/utils/scheduling-format'
import { formatTimeHm } from '@/features/scheduling/utils/schedule-jobs-timeline.util'

export type ScheduleJobsBoardRowAxis = 'carers' | 'service-users'

export function parseScheduleJobsBoardRowAxis(value: string | undefined): ScheduleJobsBoardRowAxis {
  return value === 'service-users' ? 'service-users' : 'carers'
}

export const SCHEDULE_JOBS_BOARD_ROW_AXIS_META: Record<
  ScheduleJobsBoardRowAxis,
  { label: string; shortLabel: string; description: string }
> = {
  carers: {
    label: 'By carer',
    shortLabel: 'Carers',
    description: 'Carers on the left — visits on their rows',
  },
  'service-users': {
    label: 'By service user',
    shortLabel: 'Service users',
    description: 'Service users on the left — their visits on each row',
  },
}

export type ServiceUserDayRow = {
  serviceUser: ServiceUserBrief
  jobs: TimelineJob[]
}

function sortJobsByStartTime(a: TimelineJob, b: TimelineJob): number {
  return new Date(a.scheduledStartDateTime).getTime() - new Date(b.scheduledStartDateTime).getTime()
}

/** Group all day jobs by service user for the service-user row axis. */
export function buildScheduleJobsServiceUserRows(jobs: TimelineJob[]): ServiceUserDayRow[] {
  const byId = new Map<string, TimelineJob[]>()
  for (const job of jobs) {
    const list = byId.get(job.serviceUserId) ?? []
    list.push(job)
    byId.set(job.serviceUserId, list)
  }

  return [...byId.values()]
    .map((rows) => ({
      serviceUser: rows[0]!.serviceUser,
      jobs: [...rows].sort(sortJobsByStartTime),
    }))
    .sort((a, b) =>
      serviceUserLabel(a.serviceUser).localeCompare(serviceUserLabel(b.serviceUser), 'en'),
    )
}

export function serviceUserBriefInitials(serviceUser: ServiceUserBrief): string {
  const preferred = serviceUser.preferredName?.trim()?.[0]
  if (preferred) {
    const last = serviceUser.lastName?.trim()?.[0] ?? ''
    return `${preferred}${last}`.toUpperCase()
  }
  const first = serviceUser.firstName?.trim()?.[0] ?? ''
  const last = serviceUser.lastName?.trim()?.[0] ?? ''
  const initials = `${first}${last}`.toUpperCase()
  return initials || '?'
}

import { formatServiceUserBranchLabel } from '@/features/settings/location-management/format-service-user-branch-label'

export function serviceUserRowSubtitle(serviceUser: ServiceUserBrief, jobCount: number): string {
  const branch = formatServiceUserBranchLabel(serviceUser)
  const visits = jobCount === 1 ? '1 visit today' : `${jobCount} visits today`
  const hasBranch =
    branch && branch !== '—' && branch !== 'Not assigned'
  return hasBranch ? `${branch} · ${visits}` : visits
}

/** Primary job card label when the board is grouped by service user. */
export function scheduleJobBlockLabelForServiceUserRow(job: TimelineJob): string {
  return scheduleJobBlockLabelLines(job, 'service-user-row').join(' · ')
}

/**
 * Two-line visit card labels for tooltips/titles.
 * Row axis shows who the row is for; blocks show the other party (carer vs client).
 */
export function scheduleJobBlockLabelLines(
  job: TimelineJob,
  mode: 'carer-row' | 'service-user-row',
): string[] {
  const time = jobTimeRangeLabel(job)
  const slot = job.visitPlan?.label?.trim()

  if (mode === 'service-user-row') {
    const carers = employeesLabel(job)
    if (carers === '—') return ['Unassigned', time]
    if (slot) return [carers, `${time} · ${slot}`]
    return [carers, time]
  }

  const client = serviceUserLabel(job.serviceUser)
  if (slot) return [client, `${time} · ${slot}`]
  return [client, time]
}

function jobTimeRangeLabel(job: TimelineJob): string {
  return `${formatTimeHm(job.scheduledStartDateTime)}–${formatTimeHm(job.scheduledEndDateTime ?? job.scheduledStartDateTime)}`
}

/** On-block label — opposite party only (time comes from the timeline header / block position). */
export function scheduleJobBlockDisplayLabel(
  job: TimelineJob,
  mode: 'carer-row' | 'service-user-row',
): string {
  if (mode === 'service-user-row') {
    return employeesShortLabel(job)
  }
  return serviceUserNameOnly(job.serviceUser)
}
