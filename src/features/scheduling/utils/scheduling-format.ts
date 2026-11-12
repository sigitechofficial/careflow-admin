import type { ServiceUserBrief, TimelineJob } from '../types/scheduling.types'
import {
  formatOrganisationDate,
  formatOrganisationTimeHm,
} from '@/shared/lib/organisation-display-format.store'
import {
  dayKeyFromInstant,
  formatOpsClockTime,
  formatOpsHm,
  operationalTodayIso,
} from '@/shared/lib/operational-day.util'

export function serviceUserLabel(su: ServiceUserBrief): string {
  const name = su.preferredName?.trim() || [su.firstName, su.lastName].filter(Boolean).join(' ')
  const num = su.serviceUserNumber ? ` (${su.serviceUserNumber})` : ''
  return `${name}${num}`.trim() || su.id
}

/**
 * Visit pages (workspace, visit hub): legal name with the preferred name in
 * brackets, e.g. "Margaret Ellis (Peggy) (SU-123)". Same pattern as the service
 * user record and matches the full name the carer app shows. Rota board and
 * other compact labels keep `serviceUserLabel` (preferred name only).
 */
export function serviceUserFullLabel(su: ServiceUserBrief): string {
  const legal = [su.firstName, su.lastName].filter(Boolean).join(' ').trim()
  const preferred = su.preferredName?.trim()
  // No brackets when the preferred name is just the first name ("Doreen").
  const same = (a?: string | null) =>
    Boolean(a && preferred && a.trim().toLowerCase() === preferred.toLowerCase())
  const name =
    legal && preferred && !same(legal) && !same(su.firstName)
      ? `${legal} (${preferred})`
      : legal || preferred || ''
  const num = su.serviceUserNumber ? ` (${su.serviceUserNumber})` : ''
  return `${name}${num}`.trim() || su.id
}

/** Shorter rota block label — name without service-user number. */
export function serviceUserNameOnly(su: ServiceUserBrief): string {
  const name = su.preferredName?.trim() || [su.firstName, su.lastName].filter(Boolean).join(' ')
  return name.trim() || su.serviceUserNumber || su.id
}

export function formatDateTimeLocal(iso: string): string {
  const day = dayKeyFromInstant(iso)
  const time = formatOpsHm(iso)
  if (!day || !time) return '—'
  return `${formatOrganisationDate(`${day}T12:00:00.000Z`, { utc: true })} ${formatOrganisationTimeHm(time)}`
}

export function formatJobTimeRange(job: Pick<TimelineJob, 'scheduledStartDateTime' | 'scheduledEndDateTime' | 'durationMinutes'>): string {
  const start = new Date(job.scheduledStartDateTime)
  const end = job.scheduledEndDateTime ? new Date(job.scheduledEndDateTime) : null
  // Prefer the actual scheduled window when an end exists — the stored durationMinutes
  // can drift from it, which showed a 17:00–20:00 visit as "17:00/120m/20:00".
  const mins = end
    ? Math.round((end.getTime() - start.getTime()) / 60_000)
    : job.durationMinutes ?? 60
  const endDate = end ?? new Date(start.getTime() + mins * 60_000)
  const startLabel = formatOpsClockTime(start.toISOString())
  const endLabel = formatOpsClockTime(endDate.toISOString())
  return `${startLabel}/${mins}m/${endLabel}`
}

export function employeesLabel(job: TimelineJob): string {
  const active = job.allocations?.filter((a) => a.employee) ?? []
  if (!active.length) return '—'
  return active
    .map((a) => {
      const e = a.employee
      if (!e) return ''
      const name = [e.firstName, e.lastName].filter(Boolean).join(' ')
      return a.isLeadCarer && job.requiredCarers > 1 ? `${name} (Lead)` : name
    })
    .filter(Boolean)
    .join(', ')
}

/** Compact carer label for narrow rota blocks — first carer + count. */
export function employeesShortLabel(job: TimelineJob): string {
  const active = job.allocations?.filter((a) => a.employee) ?? []
  if (!active.length) return 'Unassigned'
  const first = active[0]!.employee!
  const firstName = first.firstName?.trim() ?? ''
  const lastInitial = first.lastName?.trim()?.charAt(0)
  const name = [firstName, lastInitial ? `${lastInitial}.` : ''].filter(Boolean).join(' ')
  const lead = active[0]!.isLeadCarer && job.requiredCarers > 1 ? ' ★' : ''
  const extra = active.length > 1 ? ` +${active.length - 1}` : ''
  return `${name}${lead}${extra}`.trim()
}

export function leadCarerAllocation(job: TimelineJob) {
  if (job.requiredCarers <= 1) return null
  return job.allocations?.find((a) => a.isLeadCarer && a.employee) ?? null
}

import { visitPlanCalendarOutcomeLabel } from '@/features/service-users/visit-plan/visit-plan-calendar-outcome.constants'

const JOB_STATUS_TO_OUTCOME_LABEL: Record<string, string> = {
  DRAFT: 'Planned',
  UNALLOCATED: 'Planned',
  ALLOCATED: 'Planned',
  IN_PROGRESS: 'In progress',
}

export function jobStatusLabel(status: string): string {
  return JOB_STATUS_TO_OUTCOME_LABEL[status] ?? visitPlanCalendarOutcomeLabel(status)
}

export function allocationStatusLabel(status: string): string {
  if (status === 'PENDING_CONFIRMATION') return 'Pending confirmation'
  if (status === 'CONFIRMED') return 'Confirmed'
  if (status === 'ALLOCATED') return 'Allocated'
  return jobStatusLabel(status)
}

export function isAllocationPendingConfirmation(status: string): boolean {
  return status === 'PENDING_CONFIRMATION'
}

export function activeJobAllocationCount(job: TimelineJob): number {
  if (typeof job.allocatedCarers === 'number') return job.allocatedCarers
  return job.allocations?.length ?? 0
}

export function jobNeedsCarerAssignment(job: TimelineJob): boolean {
  return activeJobAllocationCount(job) < job.requiredCarers
}

export function jobIsOverAllocated(job: TimelineJob): boolean {
  return activeJobAllocationCount(job) > job.requiredCarers
}

export function jobNeedsAlert(job: TimelineJob): boolean {
  return (
    jobNeedsCarerAssignment(job) ||
    ['NEEDS_ATTENTION', 'MISSED', 'PARTIALLY_COMPLETED', 'UNALLOCATED'].includes(job.status)
  )
}

/** Board / schedule "Today" = organisation operational calendar, not browser local. */
export function todayIso(): string {
  return operationalTodayIso()
}
