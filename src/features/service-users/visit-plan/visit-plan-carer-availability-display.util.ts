import { VISIT_PLAN_DAY_LABELS } from '@/features/service-users/visit-plan/types'
import type { VisitPlanCarerCandidate } from '@/features/service-users/visit-plan/types'

export function formatVisitPlanDayList(days: number[]): string {
  return [...days]
    .sort((a, b) => a - b)
    .map((day) => VISIT_PLAN_DAY_LABELS[day])
    .join(', ')
}

/** Fortnight cycle notes embedded in API summary, e.g. "Wed: W1 partial, W2 off". */
export function extractFortnightNotesFromAvailabilitySummary(summary: string): string[] {
  if (!summary.trim()) return []
  return summary
    .split(' · ')
    .flatMap((part) => part.split('; '))
    .map((part) => part.trim())
    .filter((part) => /:\s*W[12]\b/.test(part))
}

export type CarerAvailabilityBreakdown = {
  availableDays: number[]
  unavailableDays: number[]
  fortnightNotes: string[]
  timeMismatchMessages: string[]
}

type CarerAvailabilityInput = VisitPlanCarerCandidate['availability'] & {
  timeMismatchMessages?: string[]
}

/**
 * Keep only the "On <Day>, …" working-hours messages whose day is in `days`. The backend
 * computes availability across every slot day, so a carer covering only Saturday would
 * otherwise show a Friday "outside working hours" message. Messages we can't attribute to a
 * day are kept (fail-open) so a genuine warning is never hidden.
 */
export function filterTimeMismatchMessagesToDays(messages: string[], days: number[]): string[] {
  if (!days.length) return messages
  const labels = new Set<string>()
  for (const day of days) {
    const label = VISIT_PLAN_DAY_LABELS[day]
    if (label) labels.add(label)
  }
  return messages.filter((message) => {
    const day = /^On ([A-Za-z]{3})\b/.exec(message)?.[1]
    return day ? labels.has(day) : true
  })
}

export function buildCarerAvailabilityBreakdown(
  availability: CarerAvailabilityInput,
  slotDaysOfWeek: number[],
): CarerAvailabilityBreakdown {
  const slotSet = new Set(slotDaysOfWeek)
  const onSlot = (day: number) => slotSet.has(day)
  const fortnightNotes = extractFortnightNotesFromAvailabilitySummary(availability.summary).filter((note) => {
    if (!slotDaysOfWeek.length) return true
    return slotDaysOfWeek.some((day) => note.startsWith(`${VISIT_PLAN_DAY_LABELS[day]}:`))
  })

  return {
    availableDays: availability.availableDays.filter(onSlot),
    unavailableDays: availability.unavailableDays.filter(onSlot),
    fortnightNotes,
    timeMismatchMessages: filterTimeMismatchMessagesToDays(
      availability.timeMismatchMessages ?? [],
      slotDaysOfWeek,
    ),
  }
}
