import type {
  TimeSensitiveChip,
  TimeSensitiveStatus,
  TimeSensitiveVisitFlag,
  TimelineJob,
} from '@/features/scheduling/types/scheduling.types'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { resolveJobTimeCritical } from '@/features/scheduling/utils/schedule-job-time-critical.util'
import type { ScheduleJobsBoard } from '@/features/scheduling/utils/schedule-jobs-timeline.util'

export function parseScheduleJobsTimeSensitiveFilter(value?: string | null): boolean {
  const raw = value?.trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'time-sensitive'
}

export function countScheduleJobsTimeSensitive(
  jobs: TimelineJob[],
  visitPlanSlotsByServiceUser?: Map<string, VisitPlanSlot[]>,
): number {
  return jobs.filter((job) => jobHasTimeSensitive(job, visitPlanSlotsByServiceUser)).length
}

export function filterTimelineJobsByTimeSensitive(
  jobs: TimelineJob[],
  enabled: boolean,
  visitPlanSlotsByServiceUser?: Map<string, VisitPlanSlot[]>,
): TimelineJob[] {
  if (!enabled) return jobs
  return jobs.filter((job) => jobHasTimeSensitive(job, visitPlanSlotsByServiceUser))
}

/** AND-narrows the board to time-sensitive visits. Stacks with branch / SU / carer / issue filters. */
export function applyScheduleJobsTimeSensitiveFilter(
  board: ScheduleJobsBoard,
  enabled: boolean,
  visitPlanSlotsByServiceUser?: Map<string, VisitPlanSlot[]>,
): ScheduleJobsBoard {
  if (!enabled) return board

  const visible = (job: TimelineJob) => jobHasTimeSensitive(job, visitPlanSlotsByServiceUser)

  const employeeRows = board.employeeRows.map((row) => ({
    ...row,
    allocations: row.allocations.filter((allocation) => visible(allocation.job)),
  }))
  const unassignedJobs = board.unassignedJobs.filter(visible)
  const cancelledJobs = board.cancelledJobs.filter(visible)
  const allJobs = board.allJobs.filter(visible)
  const carers = employeeRows.filter((row) => row.allocations.length > 0)

  return { employeeRows, carers, unassignedJobs, cancelledJobs, allJobs }
}

export function jobTimeSensitiveFlag(job: TimelineJob): TimeSensitiveVisitFlag | null {
  if (job.timeSensitive?.hasAny) return job.timeSensitive
  return null
}

export function jobHasTimeSensitive(
  job: TimelineJob,
  visitPlanSlotsByServiceUser?: Map<string, VisitPlanSlot[]>,
): boolean {
  if (job.timeSensitive?.hasAny) return true
  return resolveJobTimeCritical(job, visitPlanSlotsByServiceUser) != null
}

export function timeSensitiveClockStatus(
  job: TimelineJob,
  visitPlanSlotsByServiceUser?: Map<string, VisitPlanSlot[]>,
): TimeSensitiveStatus | null {
  if (job.timeSensitive?.hasAny) return job.timeSensitive.clock
  if (resolveJobTimeCritical(job, visitPlanSlotsByServiceUser)) return 'due'
  return null
}

export function timeSensitiveChips(job: TimelineJob): TimeSensitiveChip[] {
  return job.timeSensitive?.chips ?? []
}

export function timeSensitiveHoverTitle(
  job: TimelineJob,
  visitPlanSlotsByServiceUser?: Map<string, VisitPlanSlot[]>,
): string {
  const flag = job.timeSensitive
  if (flag?.hasAny) {
    const notable = flag.items.filter((item) => item.status !== 'due')
    const list = notable.length > 0 ? notable : flag.items
    if (list.length > 0) {
      return list
        .map((item) => {
          const noun = item.kind === 'MEDICINE' ? 'medicine' : 'task'
          const verb =
            item.status === 'early'
              ? 'early'
              : item.status === 'delayed'
                ? 'delayed'
                : item.status === 'missed'
                  ? 'missed'
                  : 'due'
          return [
            `Time-sensitive ${noun} ${verb}`,
            item.name,
            item.dueTime ? `due ${item.dueTime}` : null,
            item.givenTime ? `given ${item.givenTime}` : null,
          ]
            .filter(Boolean)
            .join(' · ')
        })
        .join(' · ')
    }
    return 'Time-sensitive visit'
  }
  const slot = resolveJobTimeCritical(job, visitPlanSlotsByServiceUser)
  return slot ? `Time-sensitive visit · ±${slot.timeToleranceMinutes} min` : ''
}

export function timeSensitiveChipClass(status: TimeSensitiveChip['status']): string {
  if (status === 'missed') return 'bg-destructive text-destructive-foreground'
  if (status === 'delayed') return 'bg-amber-600 text-white'
  return 'bg-sky-600 text-white'
}

export function timeSensitiveClockClass(status: TimeSensitiveStatus): string {
  if (status === 'missed') return 'text-red-700'
  if (status === 'delayed') return 'text-amber-500'
  if (status === 'early') return 'text-sky-600'
  return 'text-red-600'
}

const VISIT_DELIVERY_STARTED = new Set([
  'STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'PARTIALLY_COMPLETED',
  'MISSED',
])

/** Clock-in / in-progress / finished. Reset visits go back to planned and should not pop. */
export function jobHasVisitDeliveryStarted(job: TimelineJob): boolean {
  if (VISIT_DELIVERY_STARTED.has(String(job.status ?? '').toUpperCase())) return true
  if (job.actualStartDateTime) return true
  return Boolean(
    job.visits?.some(
      (visit) =>
        VISIT_DELIVERY_STARTED.has(String(visit.status ?? '').toUpperCase()) ||
        Boolean(visit.actualStartDateTime),
    ),
  )
}

/** Delayed / missed time-sensitive care pops the visit like an office alert. */
export function timeSensitiveNeedsPopup(job: TimelineJob): boolean {
  if (!jobHasVisitDeliveryStarted(job)) return false
  const clock = job.timeSensitive?.clock
  return clock === 'delayed' || clock === 'missed'
}

export function timeSensitivePopupHeadline(job: TimelineJob): string {
  const chips = job.timeSensitive?.chips ?? []
  const clock = job.timeSensitive?.clock
  if (clock === 'missed') {
    return chips.find((chip) => chip.status === 'missed')?.label ?? 'Medicine missed'
  }
  if (clock === 'delayed') {
    return chips.find((chip) => chip.status === 'delayed')?.label ?? 'Medicine delayed'
  }
  return chips[0]?.label ?? 'Time-sensitive'
}

export function timeSensitivePopupPulseClass(job: TimelineJob): string {
  if (job.timeSensitive?.clock === 'missed') {
    return 'z-[30] origin-center overflow-visible border-2 border-red-500 bg-rose-50 text-rose-950 dark:bg-rose-950/80 dark:text-rose-50 schedule-job-live-alert-danger'
  }
  return 'z-[30] origin-center overflow-visible border-2 border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950/80 dark:text-amber-50 schedule-job-live-alert-warn'
}

export function timeSensitivePopupMeta(job: TimelineJob): string | null {
  const notable = (job.timeSensitive?.items ?? []).filter((item) => item.status !== 'due')
  const item = notable[0] ?? job.timeSensitive?.items[0]
  if (!item) return null
  return [item.name, item.dueTime ? `due ${item.dueTime}` : null, item.givenTime ? `given ${item.givenTime}` : null]
    .filter(Boolean)
    .join(' · ')
}

export function timeSensitiveFlagKey(flag: TimeSensitiveVisitFlag | null | undefined): string {
  if (!flag?.hasAny) return ''
  return `${flag.clock}:${flag.chips.map((chip) => chip.label).join(',')}:${flag.items
    .map((item) => `${item.kind}:${item.status}:${item.name}`)
    .join('|')}`
}
