import { Progress } from '@/shared/ui/misc'
import { cn } from '@/shared/lib/utils'

type SurveyCompletionProgressProps = {
  completed: number
  recipients: number
  /** Compact row for tables; default is a card-friendly block. */
  compact?: boolean
  className?: string
  hint?: string
}

export function surveyResponseRate(completed: number, recipients: number): number {
  return recipients > 0 ? Math.round((completed / recipients) * 100) : 0
}

export function SurveyCompletionProgress({
  completed,
  recipients,
  compact = false,
  className,
  hint,
}: SurveyCompletionProgressProps) {
  const rate = surveyResponseRate(completed, recipients)
  const variant = rate >= 100 ? 'success' : rate >= 50 ? 'default' : rate > 0 ? 'warning' : 'default'

  if (compact) {
    return (
      <div className={cn('min-w-[7.5rem]', className)} title={`${completed} of ${recipients} completed`}>
        <div className="mb-1 flex items-center justify-between gap-2 text-xs tabular-nums text-muted-foreground">
          <span>
            {completed}/{recipients}
          </span>
          <span className="font-medium text-foreground">{rate}%</span>
        </div>
        <Progress value={rate} size="sm" variant={variant} aria-label={`Completion ${rate}%`} />
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border border-border bg-card px-4 py-3', className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Completion progress</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
            {completed}
            <span className="text-sm font-normal text-muted-foreground"> / {recipients}</span>
          </p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <p className="text-lg font-semibold tabular-nums text-foreground">{rate}%</p>
      </div>
      <div className="mt-3">
        <Progress value={rate} size="lg" variant={variant} aria-label={`Completion ${rate}%`} />
      </div>
    </div>
  )
}
