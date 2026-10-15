import { AlertOctagon, CheckCircle2, Clock, ListChecks } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { JobHealthFilter } from '@/features/system-jobs/types'
import type { JobCounts } from '@/features/system-jobs/lib/system-jobs-format'

interface CardDef {
  filter: JobHealthFilter
  label: string
  value: number
  sub: string
  Icon: typeof Clock
  /** Icon tile + active ring colours. */
  tone: string
  ring: string
  /** Value colour when > 0 (attention cards only). */
  alert?: string
}

export function JobSummaryCards({
  counts,
  active,
  onSelect,
}: {
  counts: JobCounts
  active: JobHealthFilter
  onSelect: (filter: JobHealthFilter) => void
}) {
  const cards: CardDef[] = [
    {
      filter: 'all',
      label: 'Total jobs',
      value: counts.total,
      sub: counts.neverRun > 0 ? `${counts.neverRun} not run yet` : 'All have run at least once',
      Icon: ListChecks,
      tone: 'bg-primary/10 text-primary',
      ring: 'ring-primary',
    },
    {
      filter: 'healthy',
      label: 'Healthy',
      value: counts.healthy,
      sub: counts.running > 0 ? `${counts.running} running now` : 'On schedule',
      Icon: CheckCircle2,
      tone: 'bg-success/10 text-success',
      ring: 'ring-success',
    },
    {
      filter: 'late',
      label: 'Late',
      value: counts.late,
      sub: 'No recent success',
      Icon: Clock,
      tone: 'bg-warning/10 text-warning',
      ring: 'ring-warning',
      alert: 'text-warning',
    },
    {
      filter: 'failing',
      label: 'Failing',
      value: counts.failing,
      sub: 'Last run failed',
      Icon: AlertOctagon,
      tone: 'bg-destructive/10 text-destructive',
      ring: 'ring-destructive',
      alert: 'text-destructive',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" role="group" aria-label="Filter jobs by health">
      {cards.map(card => {
        const isActive = active === card.filter
        return (
          <SummaryCardButton
            key={card.filter}
            card={card}
            active={isActive}
            // Clicking the active attention card again clears the filter.
            onClick={() => onSelect(isActive && card.filter !== 'all' ? 'all' : card.filter)}
          />
        )
      })}
    </div>
  )
}

function SummaryCardButton({ card, active, onClick }: { card: CardDef; active: boolean; onClick: () => void }) {
  const { Icon } = card
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${card.label}: ${card.value}. ${active ? 'Filter applied' : 'Show these jobs'}`}
      data-testid={`system-jobs-card-${card.filter}`}
      className={cn(
        'flex min-w-0 items-start gap-3 rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-colors sm:p-4',
        'hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active && cn('ring-2 ring-offset-1 ring-offset-background', card.ring),
      )}
    >
      <span className={cn('hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:flex', card.tone)}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">{card.label}</span>
        <span
          className={cn(
            'block text-2xl font-bold tabular-nums tracking-tight text-foreground',
            card.value > 0 && card.alert,
          )}
        >
          {card.value}
        </span>
        <span className="block truncate text-xs text-muted-foreground">{card.sub}</span>
      </span>
    </button>
  )
}
