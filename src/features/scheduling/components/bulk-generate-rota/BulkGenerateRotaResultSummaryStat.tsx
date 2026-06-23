import { cn } from '@/shared/lib/utils'

type Props = {
  label: string
  value: number
  tone?: 'default' | 'success' | 'warning' | 'danger'
}

export function BulkGenerateRotaResultSummaryStat({ label, value, tone = 'default' }: Props) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'mt-0.5 text-xl font-semibold tabular-nums',
          tone === 'success' && 'text-emerald-700',
          tone === 'warning' && 'text-amber-700',
          tone === 'danger' && 'text-destructive',
        )}
      >
        {value}
      </p>
    </div>
  )
}
