import { AlertTriangle, ChevronRight, XCircle } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { VisitPlanCarerPatternConflict } from '@/features/service-users/visit-plan/types'
import { VisitPlanCarerAvailabilityRow } from '@/features/service-users/visit-plan/VisitPlanCarerAvailabilityBreakdown'
import { getVisitPlanCarerPatternConflictTimeMessages } from '@/features/service-users/visit-plan/visit-plan-carer-pattern-conflict-display.util'

type Props = {
  conflict: VisitPlanCarerPatternConflict
}

function patternConflictAccordionSummary(
  conflict: VisitPlanCarerPatternConflict,
  timeMismatchCount: number,
): string {
  if (conflict.unavailableDayLabels.length > 0) {
    return `Not working on ${conflict.unavailableDayLabels.join(', ')}`
  }
  if (timeMismatchCount > 0) {
    return timeMismatchCount === 1
      ? 'Visit vs working hours (1 issue)'
      : `Visit vs working hours (${timeMismatchCount} issues)`
  }
  return conflict.summary || 'Pattern conflict details'
}

export function VisitPlanCarerPatternConflictDetails({ conflict }: Props) {
  const timeMismatchMessages = getVisitPlanCarerPatternConflictTimeMessages(conflict)
  const hasUnavailable = conflict.unavailableDayLabels.length > 0
  const hasTimeMismatch = timeMismatchMessages.length > 0

  if (!hasUnavailable && !hasTimeMismatch) {
    return conflict.summary ? (
      <p className="mt-2 text-left text-xs leading-relaxed text-muted-foreground">{conflict.summary}</p>
    ) : null
  }

  return (
    <details className="group mt-2 overflow-hidden rounded-md border border-border/60 bg-background/80">
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center gap-2 px-2.5 py-2 text-xs font-medium text-foreground',
          '[&::-webkit-details-marker]:hidden',
        )}
      >
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
        <span className="min-w-0 truncate">
          {patternConflictAccordionSummary(conflict, timeMismatchMessages.length)}
        </span>
      </summary>
      <div className="space-y-2.5 border-t border-border/60 px-2.5 py-2 text-left">
        {hasUnavailable ? (
          <VisitPlanCarerAvailabilityRow
            icon={<XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" aria-hidden />}
            label="Not working on"
          >
            <p className="font-medium text-red-900 dark:text-red-100">{conflict.unavailableDayLabels.join(', ')}</p>
          </VisitPlanCarerAvailabilityRow>
        ) : null}

        {hasTimeMismatch ? (
          <div className="space-y-1.5 border-t border-border/60 pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
              Visit vs working hours
            </p>
            <ul className="space-y-1.5">
              {timeMismatchMessages.map((message) => (
                <li
                  key={message}
                  className="flex items-start gap-1.5 rounded-md border border-amber-200/80 bg-amber-50/90 px-2 py-1.5 text-xs leading-snug text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                >
                  <AlertTriangle
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
                    aria-hidden
                  />
                  <span>{message}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </details>
  )
}
