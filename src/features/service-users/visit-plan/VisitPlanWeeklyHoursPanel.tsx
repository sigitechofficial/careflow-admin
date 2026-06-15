import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import {
  formatVisitPlanWeeklyHours,
  summarizeVisitPlanWeeklyHours,
  type VisitPlanWeeklyHoursSummary,
} from '@/features/service-users/visit-plan/visit-plan-weekly-hours.util'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'

type Props = {
  slots: VisitPlanSlot[]
  weeklyContractedHours: string
  anchorIso?: string | null
  className?: string
}

function statusMessage(summary: VisitPlanWeeklyHoursSummary): string {
  if (summary.contractedMinutes == null) {
    return `Call pattern totals ${formatVisitPlanWeeklyHours(summary.plannedMinutes)} per week.`
  }
  if (summary.isOverContract) {
    return `${formatVisitPlanWeeklyHours(summary.excessMinutes)} over weekly contract — excess visits show amber stripes on Schedule Jobs (rota is not blocked).`
  }
  if (summary.isUnderContract) {
    return `Within contract — ${formatVisitPlanWeeklyHours((summary.contractedMinutes ?? 0) - summary.plannedMinutes)} remaining in the package.`
  }
  return 'Call pattern matches weekly contracted hours.'
}

export function VisitPlanWeeklyHoursPanel({
  slots,
  weeklyContractedHours,
  anchorIso,
  className,
}: Props) {
  const summary = summarizeVisitPlanWeeklyHours(slots, weeklyContractedHours, {
    anchorIso: anchorIso ?? undefined,
  })

  if (summary.plannedMinutes <= 0 && summary.contractedMinutes == null) return null

  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-3',
        summary.isOverContract
          ? 'border-amber-300 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/30'
          : summary.contractedMinutes != null && !summary.isUnderContract
            ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/25'
            : 'border-border bg-muted/20',
        className,
      )}
    >
      <div className="flex flex-wrap items-start gap-3">
        {summary.isOverContract ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
        ) : summary.contractedMinutes != null && !summary.isUnderContract && summary.plannedMinutes > 0 ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span>
              <span className="text-muted-foreground">Planned from call pattern:</span>{' '}
              <strong className="font-semibold text-foreground">
                {formatVisitPlanWeeklyHours(summary.plannedMinutes)}
              </strong>
              <span className="text-muted-foreground"> / week</span>
            </span>
            {summary.contractedHours != null ? (
              <span>
                <span className="text-muted-foreground">Weekly contract:</span>{' '}
                <strong className="font-semibold text-foreground">{summary.contractedHours}h</strong>
              </span>
            ) : null}
          </div>
          <p
            className={cn(
              'mt-1 text-xs',
              summary.isOverContract ? 'text-amber-900 dark:text-amber-100' : 'text-muted-foreground',
            )}
          >
            {statusMessage(summary)}
          </p>
        </div>
      </div>
    </div>
  )
}
