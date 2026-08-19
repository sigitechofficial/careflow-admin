import { Link } from '@tanstack/react-router'
import { Clock3, Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { contentHelperClass } from '@/shared/ui/content-section'
import { useIaPreferredVisitTimes } from '@/features/service-users/visit-plan/hooks/useIaPreferredVisitTimes'

type Props = {
  serviceUserId: string
  className?: string
}

export function VisitPlanIaPreferredVisitTimesPanel({ serviceUserId, className }: Props) {
  const iaPreferred = useIaPreferredVisitTimes(serviceUserId)

  if (iaPreferred.isLoading) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border border-violet-200/80 bg-violet-50/50 px-4 py-3 text-sm text-muted-foreground dark:border-violet-900 dark:bg-violet-950/20',
          className,
        )}
        data-testid="visit-plan-ia-preferred-times-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading preferred visit times from initial assessment…
      </div>
    )
  }

  if (!iaPreferred.hasAnswer) return null

  return (
    <div
      className={cn(
        'rounded-lg border border-violet-200/80 bg-violet-50/60 px-4 py-3 text-sm dark:border-violet-900 dark:bg-violet-950/25',
        className,
      )}
      data-testid="visit-plan-ia-preferred-times"
    >
      <div className="flex gap-3">
        <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-violet-700 dark:text-violet-300" aria-hidden />
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-medium text-foreground">Preferred visit times (from initial assessment)</p>
            <Link
              to="/service-users/initial-assessment"
              search={{ serviceUserId }}
              className="shrink-0 text-xs font-medium text-violet-800 underline underline-offset-2 hover:text-violet-950 dark:text-violet-300 dark:hover:text-violet-100"
            >
              View in IA
            </Link>
          </div>
          <p className={contentHelperClass}>
            Recorded during assessment — use this when turning on call slots and setting visit windows below.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {iaPreferred.selectedSlots.map((slot) => (
              <span
                key={slot.code}
                className="inline-flex items-center rounded-full border border-violet-300/80 bg-white/80 px-2.5 py-0.5 text-xs font-medium text-violet-950 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100"
              >
                {slot.from && slot.to ? `${slot.label} (${slot.from}–${slot.to})` : slot.label}
              </span>
            ))}
          </div>
          {iaPreferred.summaryText ? (
            <p className="text-xs text-muted-foreground">Summary: {iaPreferred.summaryText}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
