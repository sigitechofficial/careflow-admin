import { AlertTriangle, CalendarRange, CheckCircle2, ChevronRight, XCircle } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { CarerAvailabilityBreakdown } from '@/features/service-users/visit-plan/visit-plan-carer-availability-display.util'
import { formatVisitPlanDayList } from '@/features/service-users/visit-plan/visit-plan-carer-availability-display.util'

type RowProps = {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
  className?: string
}

export function VisitPlanCarerAvailabilityRow({ icon, label, children, className }: RowProps) {
  return (
    <div className={cn('flex gap-2.5 text-xs leading-relaxed', className)}>
      <div className="mt-0.5 shrink-0 text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="font-medium text-foreground">{label}</p>
        <div className="text-muted-foreground">{children}</div>
      </div>
    </div>
  )
}

type Props = {
  breakdown: CarerAvailabilityBreakdown
}

function accordionSummary(breakdown: CarerAvailabilityBreakdown): string {
  if (breakdown.availableDays.length > 0) {
    return `Available on ${formatVisitPlanDayList(breakdown.availableDays)}`
  }
  if (breakdown.unavailableDays.length > 0) {
    return `Not working on ${formatVisitPlanDayList(breakdown.unavailableDays)}`
  }
  if (breakdown.timeMismatchMessages.length > 0) {
    return 'Visit vs working hours'
  }
  return 'Availability breakdown'
}

export function VisitPlanCarerAvailabilityBreakdown({ breakdown }: Props) {
  const { availableDays, unavailableDays, fortnightNotes, timeMismatchMessages } = breakdown
  const hasRows =
    availableDays.length > 0 ||
    unavailableDays.length > 0 ||
    fortnightNotes.length > 0 ||
    timeMismatchMessages.length > 0

  if (!hasRows) return null

  return (
    <details className="group mt-2 overflow-hidden rounded-md border border-border/60 bg-background/80">
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center gap-2 px-2.5 py-2 text-xs font-medium text-foreground',
          '[&::-webkit-details-marker]:hidden',
        )}
      >
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
        <span className="min-w-0 truncate">{accordionSummary(breakdown)}</span>
      </summary>
      <div className="space-y-2.5 border-t border-border/60 px-2.5 py-2">
        {availableDays.length > 0 ? (
          <VisitPlanCarerAvailabilityRow
            icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />}
            label="Available on"
          >
            <p className="font-medium text-emerald-900 dark:text-emerald-100">{formatVisitPlanDayList(availableDays)}</p>
          </VisitPlanCarerAvailabilityRow>
        ) : null}

        {unavailableDays.length > 0 ? (
          <VisitPlanCarerAvailabilityRow
            icon={<XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" aria-hidden />}
            label="Not working on"
          >
            <p className="font-medium text-red-900 dark:text-red-100">{formatVisitPlanDayList(unavailableDays)}</p>
          </VisitPlanCarerAvailabilityRow>
        ) : null}

        {fortnightNotes.length > 0 ? (
          <VisitPlanCarerAvailabilityRow
            icon={<CalendarRange className="h-3.5 w-3.5" aria-hidden />}
            label="Fortnight pattern"
          >
            <ul className="space-y-1">
              {fortnightNotes.map((note) => (
                <li key={note} className="text-foreground/90">
                  {note}
                </li>
              ))}
            </ul>
          </VisitPlanCarerAvailabilityRow>
        ) : null}

        {timeMismatchMessages.length > 0 ? (
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
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
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
