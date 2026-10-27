import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { useVisitPlanWeeklyHoursPreview } from '@/features/service-users/visit-plan/hooks'
import { formatVisitPlanWeeklyHours } from '@/features/service-users/visit-plan/visit-plan-weekly-hours.util'
import type { VisitPlanSlotInput } from '@/features/service-users/visit-plan/api'

type Props = {
  serviceUserId: string
  planId: string
  /** The whole schedule as it would be with this visit. */
  slots: VisitPlanSlotInput[]
}

/**
 * Live line in the Add / Edit visit dialog: the busiest week's hours with this visit, against
 * the service user's weekly contracted hours. Saving over the limit is blocked on the server.
 */
export function VisitPlanVisitHoursCheck({ serviceUserId, planId, slots }: Props) {
  const { formatDate } = useOrganisationDisplayFormat()
  const query = useVisitPlanWeeklyHoursPreview(serviceUserId, planId, slots)
  const result = query.data
  if (!result) {
    return query.isFetching ? (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        Checking weekly hours…
      </p>
    ) : null
  }
  const limit = result.limitWeeklyHours
  if (limit == null) return null
  const limitMinutes = Math.round(limit * 60)
  const busiest = result.heaviestWeek
  const planned = busiest?.minutes ?? 0
  const over = planned - limitMinutes
  return (
    <div
      className={cn(
        'flex gap-2 rounded-md border px-3 py-2 text-xs',
        over > 0
          ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100'
          : 'border-border bg-muted/20 text-muted-foreground',
      )}
      data-testid="visit-dialog-hours-check"
    >
      {over > 0 ? (
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : (
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
      )}
      <p>
        With this visit the busiest week
        {busiest ? ` (week of ${formatDate(busiest.weekStart)})` : ''} has{' '}
        <span className="font-semibold tabular-nums">
          {formatVisitPlanWeeklyHours(planned)} of {formatVisitPlanWeeklyHours(limitMinutes)}
        </span>{' '}
        weekly contracted hours.{' '}
        {over > 0
          ? result.planOverLimit === 'WARN'
            ? `That is ${formatVisitPlanWeeklyHours(over)} over — it can still be saved (warning only, set in Settings).`
            : result.planOverLimit === 'MANAGER_APPROVAL'
              ? `That is ${formatVisitPlanWeeklyHours(over)} over — the draft can be saved, but a manager must approve it before it's activated.`
            : `That is ${formatVisitPlanWeeklyHours(over)} over — the plan can't be saved like this. Increase the weekly hours first (manager approval).`
          : `${formatVisitPlanWeeklyHours(-over)} left.`}
        {query.isFetching ? <Loader2 className="ml-1 inline h-3 w-3 animate-spin" aria-hidden /> : null}
      </p>
    </div>
  )
}
