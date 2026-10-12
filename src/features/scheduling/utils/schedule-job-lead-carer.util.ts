import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'

type LeadAllocationLike = {
  id: string
  employeeId: string
  status: string
  isLeadCarer?: boolean
  allocatedAt?: string | null
}

const ACTIVE_ALLOCATION_STATUSES = new Set(['PENDING_CONFIRMATION', 'ALLOCATED', 'CONFIRMED'])

function allocatedAtMs(value: string | null | undefined): number {
  if (!value) return Number.POSITIVE_INFINITY
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms
}

/** Earliest assigned first, then allocation id — same order as the API / carer app. */
export function sortAllocationsByAssignedOrder<T extends LeadAllocationLike>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aMs = allocatedAtMs(a.allocatedAt)
    const bMs = allocatedAtMs(b.allocatedAt)
    if (aMs !== bMs) return aMs < bMs ? -1 : 1
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
}

export type JobLeadCarer<T extends LeadAllocationLike> = {
  allocation: T
  /** False when no lead was chosen and the first-assigned carer is used (older visits). */
  explicit: boolean
}

/**
 * Lead carer exactly as the carer app resolves it: the flagged lead, otherwise the
 * earliest-assigned active carer. Null for single-carer visits.
 */
export function resolveJobLeadCarer<T extends LeadAllocationLike>(
  requiredCarers: number,
  allocations: T[],
): JobLeadCarer<T> | null {
  const active = sortAllocationsByAssignedOrder(
    allocations.filter((a) => ACTIVE_ALLOCATION_STATUSES.has(a.status)),
  )
  if ((requiredCarers ?? 1) < 2 && active.length < 2) return null
  const flagged = active.find((a) => a.isLeadCarer)
  if (flagged) return { allocation: flagged, explicit: true }
  const first = active[0]
  return first ? { allocation: first, explicit: false } : null
}

export function jobLeadCarer(job: TimelineJob) {
  return resolveJobLeadCarer(job.requiredCarers, job.allocations ?? [])
}

const CLOSED_JOB_STATUSES = new Set([
  'COMPLETED',
  'PARTIALLY_COMPLETED',
  'MISSED',
  'CANCELLED',
  'CALLED_OFF',
])

/**
 * Same rule as the API: a carer clocked in on an open visit can't be removed,
 * replaced or dragged off. Returns the message to show, else null.
 */
export function clockedInRemovalMessage(
  job: Pick<TimelineJob, 'status'>,
  allocation: {
    actualStartDateTime?: string | null
    actualEndDateTime?: string | null
    employee?: { firstName?: string | null; lastName?: string | null } | null
  },
): string | null {
  if (!allocation.actualStartDateTime || allocation.actualEndDateTime) return null
  if (CLOSED_JOB_STATUSES.has(job.status)) return null
  const name =
    [allocation.employee?.firstName, allocation.employee?.lastName].filter(Boolean).join(' ').trim() ||
    'This carer'
  return `${name} is clocked in on this visit and can't be removed. Ask them to clock out first.`
}

const CARER_ATTENDANCE_CLOSED_STATUSES = new Set(['COMPLETED', 'PARTIALLY_COMPLETED'])

/**
 * Shared visit closed, this carer never clocked in but a co-carer did — the API holds
 * their pay line for review (MISSING_CHECK_IN). Mirrors billing isAbsentCoCarer.
 */
export function isAbsentCoCarerAllocation(
  job: Pick<TimelineJob, 'status' | 'requiredCarers' | 'allocations'>,
  allocation: { id: string; actualStartDateTime?: string | null },
): boolean {
  if (!CARER_ATTENDANCE_CLOSED_STATUSES.has(job.status)) return false
  const carers = job.allocations ?? []
  const multi = (job.requiredCarers ?? 1) >= 2 || carers.length >= 2
  if (!multi || allocation.actualStartDateTime) return false
  return carers.some((a) => a.id !== allocation.id && Boolean(a.actualStartDateTime))
}

/**
 * Visit closed while this carer was still clocked in and they never clocked out
 * themselves (the lead's clock-out does not end a support carer's session).
 */
export function isClockOutMissingAllocation(
  job: Pick<TimelineJob, 'status'>,
  allocation: { actualStartDateTime?: string | null; actualEndDateTime?: string | null },
): boolean {
  if (!CARER_ATTENDANCE_CLOSED_STATUSES.has(job.status)) return false
  return Boolean(allocation.actualStartDateTime) && !allocation.actualEndDateTime
}
