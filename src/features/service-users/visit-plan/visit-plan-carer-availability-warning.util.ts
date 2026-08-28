import { VISIT_PLAN_DAY_LABELS } from '@/features/service-users/visit-plan/types'
import type { VisitPlanCarerCandidate } from '@/features/service-users/visit-plan/types'
import { CARER_ROTA_CONFLICT_MESSAGE } from '@/features/scheduling/utils/schedule-job-carer-rota-conflict.util'
import { filterTimeMismatchMessagesToDays } from '@/features/service-users/visit-plan/visit-plan-carer-availability-display.util'

/** Days a carer assignment applies to within the slot schedule. */
export function carerAssignmentCoversSlotDays(
  assignmentDays: number[] | null,
  slotDaysOfWeek: number[],
): number[] {
  if (!slotDaysOfWeek.length) return []
  if (assignmentDays == null) return [...slotDaysOfWeek].sort((a, b) => a - b)
  const slotSet = new Set(slotDaysOfWeek)
  return assignmentDays.filter((day) => slotSet.has(day)).sort((a, b) => a - b)
}

function carerPatternAvailabilityWarning(
  candidate: VisitPlanCarerCandidate | undefined,
  coveredDays: number[],
): string | null {
  if (!coveredDays.length) return null
  if (!candidate) return 'Working pattern could not be checked'

  const { unavailableDays, timeMismatchDays = [], timeMismatchMessages = [], summary } =
    candidate.availability
  const unavailableOnAssignment = coveredDays.filter((day) => unavailableDays.includes(day))
  const timeMismatchOnAssignment = coveredDays.filter((day) => timeMismatchDays.includes(day))
  // Availability is computed across every slot day, so scope the messages to the days this
  // carer actually covers — otherwise a Saturday-only carer shows a Friday warning.
  const messagesOnAssignment = filterTimeMismatchMessagesToDays(timeMismatchMessages, coveredDays)

  if (unavailableOnAssignment.length === coveredDays.length) {
    if (messagesOnAssignment.length) {
      return messagesOnAssignment.join(' · ')
    }
    if (summary.includes('No pattern data')) return 'No working pattern set for these days'
    if (summary.trim()) return summary
    return 'No working pattern set for these days'
  }

  if (timeMismatchOnAssignment.length > 0) {
    if (messagesOnAssignment.length) {
      return messagesOnAssignment.join(' · ')
    }
    return 'Visit time is outside working hours on some assigned days'
  }

  if (unavailableOnAssignment.length > 0) {
    const patternUnavailable = unavailableOnAssignment.filter(
      (day) => !timeMismatchDays.includes(day),
    )
    if (patternUnavailable.length) {
      const labels = patternUnavailable.map((day) => VISIT_PLAN_DAY_LABELS[day]).join(', ')
      return `Not available on assigned days: ${labels}`
    }
  }

  return null
}

export function carerRotaConflictWarning(
  candidate: VisitPlanCarerCandidate | undefined,
): string | null {
  if (!candidate?.hasRotaConflict) return null
  return CARER_ROTA_CONFLICT_MESSAGE
}

export function carerAvailabilityWarnings(
  candidate: VisitPlanCarerCandidate | undefined,
  coveredDays: number[],
): { rota: string | null; pattern: string | null } {
  return {
    rota: carerRotaConflictWarning(candidate),
    pattern: carerPatternAvailabilityWarning(candidate, coveredDays),
  }
}

export function formatCarerAvailabilityWarning(
  candidate: VisitPlanCarerCandidate | undefined,
  coveredDays: number[],
): string | null {
  const { rota, pattern } = carerAvailabilityWarnings(candidate, coveredDays)
  if (rota) return rota
  return pattern
}

export function carerCandidatesByEmployeeId(
  candidates: VisitPlanCarerCandidate[],
): Map<string, VisitPlanCarerCandidate> {
  return new Map(candidates.map((candidate) => [candidate.employeeId, candidate]))
}

export function visitPlanSuggestIncludeEmployeeIds(slot: {
  assignedEmployeeIds?: string[]
  carerAssignments?: Array<{ employeeId?: string | null }>
}): string[] {
  return [
    ...new Set(
      [
        ...(slot.assignedEmployeeIds ?? []),
        ...(slot.carerAssignments ?? []).map((row) => row.employeeId?.trim()).filter(Boolean),
      ].filter((id): id is string => Boolean(id)),
    ),
  ]
}
