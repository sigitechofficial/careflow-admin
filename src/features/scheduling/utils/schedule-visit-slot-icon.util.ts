import type { LucideIcon } from 'lucide-react'
import { CalendarClock, CloudSun, Moon, Sun, Sunrise, Sunset } from 'lucide-react'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  scheduleJobsPeriodBandForHour,
  type ScheduleJobsDayPeriod,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { formatOpsHm } from '@/shared/lib/operational-day.util'

export type ScheduleVisitSlotVisual = {
  period: ScheduleJobsDayPeriod
  label: string
  Icon: LucideIcon
  iconClassName: string
}

function periodFromText(text: string): ScheduleJobsDayPeriod | null {
  const t = text.toLowerCase()
  if (/\b(night|bed|sleep|nocturnal)\b/.test(t)) return 'night'
  if (/\b(evening|tea|supper|dusk)\b/.test(t)) return 'evening'
  if (/\b(afternoon|pm call)\b/.test(t)) return 'afternoon'
  if (/\b(midday|lunch|noon)\b/.test(t)) return 'midday'
  if (/\b(morning|breakfast|am call)\b/.test(t)) return 'morning'
  return null
}

function iconForPeriod(period: ScheduleJobsDayPeriod): LucideIcon {
  switch (period) {
    case 'morning':
      return Sunrise
    case 'midday':
      return Sun
    case 'afternoon':
      return CloudSun
    case 'evening':
      return Sunset
    case 'night':
      return Moon
    default:
      return CalendarClock
  }
}

function iconClassForPeriod(period: ScheduleJobsDayPeriod): string {
  switch (period) {
    case 'morning':
      return 'text-amber-600 dark:text-amber-400'
    case 'midday':
      return 'text-sky-600 dark:text-sky-400'
    case 'afternoon':
      return 'text-orange-600 dark:text-orange-400'
    case 'evening':
      return 'text-violet-600 dark:text-violet-400'
    case 'night':
      return 'text-slate-600 dark:text-slate-300'
    default:
      return 'text-muted-foreground'
  }
}

function periodLabel(period: ScheduleJobsDayPeriod): string {
  switch (period) {
    case 'morning':
      return 'Morning'
    case 'midday':
      return 'Midday'
    case 'afternoon':
      return 'Afternoon'
    case 'evening':
      return 'Evening'
    case 'night':
      return 'Night'
  }
}

/** Resolve call-round period from visit-plan slot code/label, else scheduled start hour (UTC). */
export function resolveScheduleVisitSlotPeriod(
  job: Pick<TimelineJob, 'jobName' | 'scheduledStartDateTime' | 'visitPlan' | 'visits'>,
): ScheduleJobsDayPeriod {
  const fromCode = periodFromText(job.visitPlan?.slotCode ?? '')
  if (fromCode) return fromCode

  const fromLabel = periodFromText(job.visitPlan?.label ?? '')
  if (fromLabel) return fromLabel

  const visitName = job.visits?.[0]?.visitName ?? ''
  const fromVisit = periodFromText(visitName)
  if (fromVisit) return fromVisit

  const fromJobName = periodFromText(job.jobName ?? '')
  if (fromJobName) return fromJobName

  const hour = Number(formatOpsHm(job.scheduledStartDateTime).slice(0, 2)) || 0
  return scheduleJobsPeriodBandForHour(hour).period
}

export function scheduleVisitSlotVisual(
  job: Pick<TimelineJob, 'jobName' | 'scheduledStartDateTime' | 'visitPlan' | 'visits'>,
): ScheduleVisitSlotVisual {
  const period = resolveScheduleVisitSlotPeriod(job)
  const slotLabel = job.visitPlan?.label?.trim() || job.visits?.[0]?.visitName?.trim() || ''
  return {
    period,
    label: slotLabel || periodLabel(period),
    Icon: iconForPeriod(period),
    iconClassName: iconClassForPeriod(period),
  }
}
