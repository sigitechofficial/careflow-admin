import { cn } from '@/shared/lib/utils'
import type { BodyMapSummary } from '@/features/service-users/body-map/types'

type Props = {
  summary: BodyMapSummary | undefined
  className?: string
}

type PillProps = {
  label: string
  value: number
  warn?: boolean
  danger?: boolean
}

function Pill({ label, value, warn, danger }: PillProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs',
        danger && value > 0 && 'border-red-200 bg-red-50',
        warn && value > 0 && !danger && 'border-amber-200 bg-amber-50',
      )}
    >
      <span
        className={cn(
          'font-semibold tabular-nums',
          danger && value > 0 && 'text-red-700',
          warn && value > 0 && !danger && 'text-amber-800',
        )}
      >
        {value}
      </span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  )
}

export function BodyMapSummaryStrip({ summary, className }: Props) {
  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      <Pill label="Active" value={summary?.activeCount ?? 0} />
      <Pill label="Review due" value={summary?.reviewDueCount ?? 0} warn />
      <Pill label="High / urgent" value={summary?.highRiskCount ?? 0} danger />
      <Pill label="Safeguarding" value={summary?.safeguardingCount ?? 0} danger />
      <Pill
        label="MAR no site"
        value={summary?.medicationAlerts?.missingBodyMapSiteCount ?? 0}
        warn
      />
      <Pill
        label="Patch overdue"
        value={summary?.medicationAlerts?.overduePatchChangeCount ?? 0}
        danger
      />
    </div>
  )
}
