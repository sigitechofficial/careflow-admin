import { Info } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { formatDate } from '@/shared/lib/utils'
import type { ServiceUserVisitPlan } from '@/features/service-users/visit-plan/types'
import {
  formatVisitPlanEffectiveRange,
  isScheduledVisitPlanEnd,
  summarizeVisitPlanDailyCalls,
} from '@/features/service-users/visit-plan/visit-plan-version.util'

type Props = {
  plan: ServiceUserVisitPlan
  context: 'summary' | 'calendar' | 'history' | 'configure'
  otherPlanCount: number
}

export function VisitPlanContextBanner({ plan, context, otherPlanCount }: Props) {
  const isPast = plan.status === 'ENDED'
  const isDraft = plan.status === 'DRAFT'
  const isSuspended = plan.status === 'SUSPENDED'
  const scheduledEnd = isScheduledVisitPlanEnd(plan)

  let detail = ''
  if (context === 'calendar') {
    detail =
      'This calendar shows visits linked to this plan version\'s call slots. Visits from a different plan (e.g. when you had more or fewer calls per day) appear when you select that version above.'
  } else if (context === 'history') {
    detail =
      'Compare plan versions below. Open a version to see its full call pattern, or use Summary / Calendar for that version.'
  } else if (isPast) {
    detail =
      'This is a past plan version. New visits are generated from the current active plan, not this one.'
  } else if (isDraft) {
    detail = 'This draft is not live until you activate it. Activating will end the current active plan.'
  } else if (scheduledEnd && context === 'configure') {
    detail =
      'Closure is scheduled — visits continue until the end date. You can still amend the package or cancel visits from that date via End plan.'
  } else if (scheduledEnd) {
    detail = 'This package is scheduled to end — switch to Set up visits for details.'
  } else if (isSuspended && context === 'configure') {
    detail =
      'Visits are paused. Scroll to Step 4 and click Re-activate package, then generate the rota when care should resume.'
  } else if (isSuspended) {
    detail = 'This package is suspended. Open Set up visits to re-activate it.'
  } else if (otherPlanCount > 0) {
    detail = `This person has ${otherPlanCount} other plan version${otherPlanCount === 1 ? '' : 's'} — switch above to compare call patterns.`
  }

  if (!detail && context === 'summary') return null

  return (
    <div
      className={cn(
        'flex gap-3 rounded-lg border px-4 py-3 text-sm',
        isSuspended && context === 'configure'
          ? 'border-orange-300/80 bg-orange-50/70 dark:border-orange-900 dark:bg-orange-950/30'
          : scheduledEnd
            ? 'border-amber-300/80 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30'
            : 'border-sky-200/80 bg-sky-50/60 dark:border-sky-900 dark:bg-sky-950/25',
      )}
      data-testid="visit-plan-context-banner"
    >
      <Info
        className={cn(
          'mt-0.5 h-4 w-4 shrink-0',
          isSuspended && context === 'configure'
            ? 'text-orange-700 dark:text-orange-300'
            : 'text-sky-700 dark:text-sky-300',
        )}
        aria-hidden
      />
      <div className="min-w-0 space-y-1">
        <p className="font-medium text-foreground">
          Viewing {plan.status.toLowerCase()} plan · {summarizeVisitPlanDailyCalls(plan)}
        </p>
        <p className="text-xs text-muted-foreground">{formatVisitPlanEffectiveRange(plan)}</p>
        {plan.status === 'SUSPENDED' ? (
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {plan.pauseReasonCatalog ? (
              <li>
                Pause reason: <span className="font-medium text-foreground">{plan.pauseReasonCatalog.name}</span>
              </li>
            ) : null}
            {plan.suspendedAt ? (
              <li>Suspended: {formatDate(plan.suspendedAt)}</li>
            ) : null}
            <li>
              Expected resume:{' '}
              <span className="font-medium text-foreground">
                {plan.expectedResumeAt ? formatDate(plan.expectedResumeAt) : 'Indefinite / not set'}
              </span>
            </li>
            {plan.suspensionReviewDueAt ? (
              <li>Review suspension by: {formatDate(plan.suspensionReviewDueAt)}</li>
            ) : null}
            {plan.suspensionContingencyNotes?.trim() ? (
              <li>Contingency: {plan.suspensionContingencyNotes.trim()}</li>
            ) : null}
          </ul>
        ) : null}
        {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
      </div>
    </div>
  )
}
