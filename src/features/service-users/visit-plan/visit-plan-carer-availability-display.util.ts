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
    timeMismatchMessages: availability.timeMismatchMessages ?? [],
  }
}
