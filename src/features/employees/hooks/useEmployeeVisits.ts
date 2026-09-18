import { useQuery } from '@tanstack/react-query'
import {
  getEmployeeVisits,
  type EmployeeVisitBucket,
} from '@/features/employees/api/employee-visits.api'
import { employeeKeys } from '@/features/employees/keys'
import { jobStatusLabel } from '@/features/scheduling/utils/scheduling-format'
import { timelineJobVisitPlanSlot } from '@/features/scheduling/utils/scheduling-visit-plan.util'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { syncOrganisationOperationalTimezone } from '@/shared/lib/operational-day.util'

export type { EmployeeVisitBucket }

export function classifyEmployeeVisit(
  job: TimelineJob,
  now: Date = new Date(),
): EmployeeVisitBucket {
  const status = (job.status ?? '').toUpperCase()
  if (status === 'COMPLETED' || status === 'PARTIALLY_COMPLETED') return 'completed'
  if (status === 'IN_PROGRESS') return 'ongoing'
  if (status === 'MISSED' || status === 'CANCELLED' || status === 'CALLED_OFF') return 'other'

  const start = new Date(job.scheduledStartDateTime)
  if (Number.isNaN(start.getTime())) return 'other'
  const end = job.scheduledEndDateTime
    ? new Date(job.scheduledEndDateTime)
    : new Date(start.getTime() + (job.durationMinutes ?? 60) * 60_000)

  if (now >= start && now <= end) return 'ongoing'
  if (now > end) return 'other'
  return 'upcoming'
}

/** Specific outcome for the Status column (Missed / Cancelled / Not completed, etc.). */
export function employeeVisitOutcomeLabel(
  job: TimelineJob,
  bucket: EmployeeVisitBucket,
): string {
  const status = (job.status ?? '').toUpperCase()
  if (status === 'MISSED') return 'Missed'
  if (status === 'CANCELLED') return 'Cancelled'
  if (status === 'CALLED_OFF') return 'Called off'
  if (status === 'COMPLETED') return 'Completed'
  if (status === 'PARTIALLY_COMPLETED') return 'Partially completed'
  if (status === 'IN_PROGRESS') return 'In progress'
  if (status === 'NEEDS_ATTENTION') return 'Needs attention'
  if (bucket === 'other') return 'Not completed'
  if (bucket === 'upcoming') return 'Allocated'
  if (bucket === 'completed') return jobStatusLabel(status)
  return jobStatusLabel(status)
}

export function employeeVisitOutcomeBadgeClass(
  job: TimelineJob,
  bucket: EmployeeVisitBucket,
): string {
  const status = (job.status ?? '').toUpperCase()
  if (status === 'COMPLETED') return 'bg-success/10 text-success border-success/20'
  if (status === 'PARTIALLY_COMPLETED') return 'bg-amber-500/10 text-amber-800 border-amber-500/30 dark:text-amber-200'
  if (status === 'IN_PROGRESS') return 'bg-primary/10 text-primary border-primary/20'
  if (status === 'MISSED') return 'bg-destructive/10 text-destructive border-destructive/20'
  if (status === 'CANCELLED' || status === 'CALLED_OFF') {
    return 'bg-orange-500/10 text-orange-800 border-orange-500/30 dark:text-orange-200'
  }
  if (status === 'NEEDS_ATTENTION') return 'bg-warning/10 text-warning border-warning/20'
  if (bucket === 'upcoming') return 'bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300'
  if (bucket === 'other') return 'bg-muted text-muted-foreground border-border'
  return 'bg-muted text-muted-foreground border-border'
}

/** Slot / call name only — not "Morning — George" (service user is a separate column). */
export function employeeVisitSlotLabel(job: TimelineJob): string {
  const fromPlan = timelineJobVisitPlanSlot(job)?.trim()
  if (fromPlan) return fromPlan

  const raw = (job.jobName ?? '').trim()
  if (!raw) return 'Visit'

  const first =
    job.serviceUser?.preferredName?.trim() || job.serviceUser?.firstName?.trim() || ''
  if (first) {
    const suffix = ` — ${first}`
    if (raw.endsWith(suffix)) {
      const slot = raw.slice(0, -suffix.length).trim()
      if (slot) return slot
    }
  }

  const sep = ' — '
  const idx = raw.indexOf(sep)
  if (idx > 0) {
    const left = raw.slice(0, idx).trim()
    if (left) return left
  }
  return raw
}

export function employeeVisitActualStart(job: TimelineJob): string | null {
  return (
    job.actualStartDateTime ??
    job.visits?.find(v => v.actualStartDateTime)?.actualStartDateTime ??
    null
  )
}

export function employeeVisitActualEnd(job: TimelineJob): string | null {
  return (
    job.actualEndDateTime ??
    job.visits?.find(v => v.actualEndDateTime)?.actualEndDateTime ??
    null
  )
}

function minutesBetweenIso(startIso: string, endIso: string): number | null {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return null
  return Math.round(ms / 60_000)
}

export function employeeVisitPlannedDurationMinutes(job: TimelineJob): number | null {
  if (typeof job.durationMinutes === 'number' && job.durationMinutes > 0) {
    return job.durationMinutes
  }
  if (job.scheduledStartDateTime && job.scheduledEndDateTime) {
    return minutesBetweenIso(job.scheduledStartDateTime, job.scheduledEndDateTime)
  }
  return null
}

export function employeeVisitActualDurationMinutes(job: TimelineJob): number | null {
  const actualStart = employeeVisitActualStart(job)
  const actualEnd = employeeVisitActualEnd(job)
  if (!actualStart || !actualEnd) return null
  return minutesBetweenIso(actualStart, actualEnd)
}

/** Duration in minutes: actual window when both ends exist, else planned. */
export function employeeVisitDurationMinutes(job: TimelineJob): number | null {
  return employeeVisitActualDurationMinutes(job) ?? employeeVisitPlannedDurationMinutes(job)
}

/**
 * Matches billing visit reconciliation:
 * - overrun: any minute over planned
 * - underrun (short): more than {@link VISIT_DURATION_UNDERRUN_TOLERANCE_MINUTES} under planned
 */
export const VISIT_DURATION_UNDERRUN_TOLERANCE_MINUTES = 15

export type VisitDurationVarianceKind = 'short' | 'exceeded' | 'on_time' | 'unknown'

export type VisitDurationVariance = {
  kind: VisitDurationVarianceKind
  plannedMinutes: number | null
  actualMinutes: number | null
  /** actual − planned; negative means shorter than planned */
  deltaMinutes: number | null
  isShort: boolean
  isExceeded: boolean
}

export function employeeVisitDurationVariance(job: TimelineJob): VisitDurationVariance {
  const plannedMinutes = employeeVisitPlannedDurationMinutes(job)
  const actualMinutes = employeeVisitActualDurationMinutes(job)

  if (plannedMinutes == null || actualMinutes == null || plannedMinutes <= 0) {
    return {
      kind: 'unknown',
      plannedMinutes,
      actualMinutes,
      deltaMinutes: null,
      isShort: false,
      isExceeded: false,
    }
  }

  const deltaMinutes = actualMinutes - plannedMinutes
  if (deltaMinutes > 0) {
    return {
      kind: 'exceeded',
      plannedMinutes,
      actualMinutes,
      deltaMinutes,
      isShort: false,
      isExceeded: true,
    }
  }
  if (actualMinutes > 0 && actualMinutes < plannedMinutes - VISIT_DURATION_UNDERRUN_TOLERANCE_MINUTES) {
    return {
      kind: 'short',
      plannedMinutes,
      actualMinutes,
      deltaMinutes,
      isShort: true,
      isExceeded: false,
    }
  }
  return {
    kind: 'on_time',
    plannedMinutes,
    actualMinutes,
    deltaMinutes,
    isShort: false,
    isExceeded: false,
  }
}

export function formatDurationMinutes(minutes: number | null): string {
  if (minutes == null || !Number.isFinite(minutes)) return '—'
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/**
 * Authority / export friendly fields — keep categories stable for CSV/PDF reports.
 * - Duration variance: Exceeded | Short | On time | Not assessed
 * - Variance minutes: signed integer string (+15, -20, 0) or empty when not assessed
 */
export function visitDurationVarianceExportFields(variance: VisitDurationVariance): {
  durationVariance: 'Exceeded' | 'Short' | 'On time' | 'Not assessed'
  varianceMinutes: string
} {
  if (variance.kind === 'exceeded' && variance.deltaMinutes != null) {
    return {
      durationVariance: 'Exceeded',
      varianceMinutes: `+${variance.deltaMinutes}`,
    }
  }
  if (variance.kind === 'short' && variance.deltaMinutes != null) {
    return {
      durationVariance: 'Short',
      varianceMinutes: String(variance.deltaMinutes),
    }
  }
  if (variance.kind === 'on_time') {
    return {
      durationVariance: 'On time',
      varianceMinutes: variance.deltaMinutes != null ? String(variance.deltaMinutes) : '0',
    }
  }
  return { durationVariance: 'Not assessed', varianceMinutes: '' }
}

export function visitDurationVarianceBadgeClass(variance: VisitDurationVariance): string {
  if (variance.kind === 'exceeded') {
    return 'bg-orange-500/10 text-orange-800 border-orange-500/30 dark:text-orange-200'
  }
  if (variance.kind === 'short') {
    return 'bg-amber-500/10 text-amber-800 border-amber-500/30 dark:text-amber-200'
  }
  if (variance.kind === 'on_time') {
    return 'bg-success/10 text-success border-success/20'
  }
  return 'bg-muted text-muted-foreground border-border'
}

export function useEmployeeVisits(employeeId: string, month: string, enabled = true) {
  return useQuery({
    queryKey: employeeKeys.visits(employeeId, month),
    queryFn: ({ signal }) => getEmployeeVisits(employeeId, month, { signal }),
    enabled: Boolean(enabled && employeeId && /^\d{4}-\d{2}$/.test(month)),
    select: (data) => {
      const jobs = data.visits
        .map((row) => ({
          ...row.job,
          // Prefer allocation-resolved times from the visit row (per-carer window).
          scheduledStartDateTime: row.scheduledStartDateTime || row.job.scheduledStartDateTime,
          scheduledEndDateTime: row.scheduledEndDateTime ?? row.job.scheduledEndDateTime,
          durationMinutes: row.plannedMinutes || row.job.durationMinutes,
          deliveryAssessment: row.deliveryAssessment ?? row.job.deliveryAssessment,
          visitRef: row.visitRef ?? null,
        }))
        .slice()
        .sort(
          (a, b) =>
            new Date(a.scheduledStartDateTime).getTime() -
            new Date(b.scheduledStartDateTime).getTime(),
        )
      if (data.organisationTimezone) {
        syncOrganisationOperationalTimezone(data.organisationTimezone)
      }
      return {
        month: data.month,
        organisationTimezone: data.organisationTimezone ?? null,
        jobs,
        totalMinutes: data.summary.totalPlannedMinutes,
        summary: data.summary,
        visits: data.visits,
      }
    },
  })
}
