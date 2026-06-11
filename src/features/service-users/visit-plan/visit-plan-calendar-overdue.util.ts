import { normalizeTimeForInput } from '@/features/service-users/visit-plan/visit-plan-time.util'
import { visitPlanTodayIsoDate } from '@/features/service-users/visit-plan/visit-plan-calendar-view.util'
import {
  visitPlanCalendarDisplayStatus,
  visitPlanCalendarOutcomeShortLabel,
  type VisitPlanCalendarOutcomeStatus,
} from '@/features/service-users/visit-plan/visit-plan-calendar-outcome.constants'
import type { VisitPlanCalendarVisit } from '@/features/service-users/visit-plan/api'

/** Visit outcomes that mean staff have recorded what happened. */
const RESOLVED_VISIT_OUTCOME_STATUSES = new Set<VisitPlanCalendarOutcomeStatus>([
  'COMPLETED',
  'PARTIALLY_COMPLETED',
  'MISSED',
  'CALLED_OFF',
  'CANCELLED',
])

export function visitPlanCalendarOutcomeNeedsAction(
  status: VisitPlanCalendarOutcomeStatus,
): boolean {
  return !RESOLVED_VISIT_OUTCOME_STATUSES.has(status)
}

function hmToMinutes(hm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hm)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function localMinutesNow(now: Date): number {
  return now.getHours() * 60 + now.getMinutes()
}

function occurrenceEndMinutes(plannedEndTime: string): number | null {
  const normalized = normalizeTimeForInput(plannedEndTime)
  if (!normalized) return null
  return hmToMinutes(normalized)
}

/**
 * True when the visit window has passed and no carer outcome was recorded.
 * Uses UTC calendar dates (aligned with the visit plan grid) and local wall-clock end times.
 */
export function isVisitPlanCalendarSlotOverdue(params: {
  occurrenceIso: string
  plannedEndTime: string
  outcomeStatus: VisitPlanCalendarOutcomeStatus
  scheduledEndDateTime?: string | null
  now?: Date
}): boolean {
  const { occurrenceIso, plannedEndTime, outcomeStatus, scheduledEndDateTime, now = new Date() } =
    params

  if (!visitPlanCalendarOutcomeNeedsAction(outcomeStatus)) return false

  const todayIso = visitPlanTodayIsoDate()
  if (occurrenceIso < todayIso) return true
  if (occurrenceIso > todayIso) return false

  if (scheduledEndDateTime) {
    return now.getTime() > new Date(scheduledEndDateTime).getTime()
  }

  const endMinutes = occurrenceEndMinutes(plannedEndTime)
  if (endMinutes == null) return false
  return localMinutesNow(now) > endMinutes
}

export function visitPlanCalendarSlotPresentation(params: {
  occurrenceIso: string
  plannedEndTime: string
  outcome: VisitPlanCalendarVisit | null | undefined
  now?: Date
}): {
  outcomeStatus: VisitPlanCalendarOutcomeStatus
  isOverdue: boolean
  shortLabel: string
} {
  const outcomeStatus = visitPlanCalendarDisplayStatus(params.outcome)
  const isOverdue = isVisitPlanCalendarSlotOverdue({
    occurrenceIso: params.occurrenceIso,
    plannedEndTime: params.plannedEndTime,
    outcomeStatus,
    scheduledEndDateTime: params.outcome?.scheduledEndDateTime,
    now: params.now,
  })

  const shortLabel = isOverdue
    ? outcomeStatus === 'NOT_GENERATED'
      ? 'Overdue · no rota'
      : 'Overdue · no action'
    : visitPlanCalendarOutcomeShortLabel(outcomeStatus)

  return { outcomeStatus, isOverdue, shortLabel }
}
