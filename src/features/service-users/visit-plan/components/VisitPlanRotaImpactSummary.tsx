import { AlertTriangle } from 'lucide-react'
import type { ScheduleImpactSummary } from '@/features/service-users/visit-plan/types'

type Props = {
  impact: ScheduleImpactSummary | null | undefined
  fromDate?: string
  loading?: boolean
  className?: string
}

export function VisitPlanRotaImpactSummary({ impact, fromDate, loading, className }: Props) {
  if (loading) {
    return <p className={`text-sm text-muted-foreground ${className ?? ''}`}>Checking rota impact…</p>
  }
  if (!impact) return null

  const cancelled = impact.jobsCancelled ?? 0
  const unallocated = impact.jobsUnallocated ?? 0
  const rescheduled = impact.jobsRescheduled ?? 0
  const total = cancelled + unallocated + rescheduled

  if (total === 0) {
    return (
      <p className={`text-sm text-muted-foreground ${className ?? ''}`}>
        No cancellable visits on the rota match this change.
      </p>
    )
  }

  const parts: string[] = []
  if (cancelled > 0) parts.push(`${cancelled} visit${cancelled === 1 ? '' : 's'} cancelled`)
  if (unallocated > 0) parts.push(`${unallocated} visit${unallocated === 1 ? '' : 's'} unallocated`)
  if (rescheduled > 0) parts.push(`${rescheduled} visit${rescheduled === 1 ? '' : 's'} rescheduled`)

  return (
    <div className={`rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 ${className ?? ''}`}>
      <p>
        {fromDate ? `From ${fromDate}: ` : ''}
        {parts.join('; ')}.
      </p>
      {impact.truncated ? (
        <p className="mt-1 flex items-center gap-1 text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Preview capped — additional visits may be affected.
        </p>
      ) : null}
    </div>
  )
}
