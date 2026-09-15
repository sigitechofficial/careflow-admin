import { Clock } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

type Props = {
  active: boolean
  count: number
  onToggle: () => void
}

export function ScheduleTimeSensitiveFilterChip({ active, count, onToggle }: Props) {
  return (
    <button
      type="button"
      data-testid="schedule-filter-time-sensitive"
      aria-pressed={active}
      title="Show only visits with a time-critical medicine or task. Combines with branch, service user, carer, and issue filters."
      onClick={onToggle}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-rose-500/50 bg-rose-50 text-rose-900 shadow-sm dark:bg-rose-950/40 dark:text-rose-100'
          : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50',
      )}
    >
      <Clock className="h-3 w-3 shrink-0" strokeWidth={2.2} aria-hidden />
      Time critical
      <span className="tabular-nums opacity-80">({count})</span>
    </button>
  )
}
