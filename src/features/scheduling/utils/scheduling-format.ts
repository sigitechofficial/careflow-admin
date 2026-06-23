import type { ServiceUserBrief, TimelineJob } from '../types/scheduling.types'

export function serviceUserLabel(su: ServiceUserBrief): string {
  const name = su.preferredName?.trim() || [su.firstName, su.lastName].filter(Boolean).join(' ')
  const num = su.serviceUserNumber ? ` (${su.serviceUserNumber})` : ''
  return `${name}${num}`.trim() || su.id
}

/** Shorter rota block label — name without service-user number. */
export function serviceUserNameOnly(su: ServiceUserBrief): string {
  const name = su.preferredName?.trim() || [su.firstName, su.lastName].filter(Boolean).join(' ')
  return name.trim() || su.serviceUserNumber || su.id
}

export function formatDateTimeLocal(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

export function formatJobTimeRange(job: Pick<TimelineJob, 'scheduledStartDateTime' | 'scheduledEndDateTime' | 'durationMinutes'>): string {
  const start = new Date(job.scheduledStartDateTime)
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
  const end = job.scheduledEndDateTime ? new Date(job.scheduledEndDateTime) : null
  const mins = job.durationMinutes ?? (end ? Math.round((end.getTime() - start.getTime()) / 60_000) : 60)
  const endLabel = end ? fmt(end) : fmt(new Date(start.getTime() + mins * 60_000))
  return `${fmt(start)}/${mins}m/${endLabel}`
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

export function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
