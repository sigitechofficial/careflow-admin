import type { VisitPlanCarerPatternConflict } from '@/features/service-users/visit-plan/types'

export type PatternConflictTimeMessagesInput = {
  summary: string
  timeMismatchMessages?: string[]
}

function extractTimeMismatchMessagesFromSummary(summary: string): string[] {
  if (!summary.trim()) return []

  return summary
    .split(' · ')
    .map((part) => part.trim())
    .filter(
      (part) =>
        part.startsWith('On ') ||
        part === 'Visit time outside working hours on some days' ||
        part.includes('working pattern') ||
        part.includes('hours before') ||
        part.includes('hours after'),
    )
}

export function getPatternConflictTimeMessages(input: PatternConflictTimeMessagesInput): string[] {
  if (input.timeMismatchMessages?.length) {
    return input.timeMismatchMessages
  }
  return extractTimeMismatchMessagesFromSummary(input.summary)
}

export function getVisitPlanCarerPatternConflictTimeMessages(
  conflict: VisitPlanCarerPatternConflict,
): string[] {
  return getPatternConflictTimeMessages(conflict)
}
