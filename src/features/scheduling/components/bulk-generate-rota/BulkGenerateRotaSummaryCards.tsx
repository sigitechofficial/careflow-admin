import type { BulkGenerateRotaSummary } from '@/features/scheduling/hooks/useBulkGenerateRotaPage'

type Props = {
  summary: BulkGenerateRotaSummary
}

export function BulkGenerateRotaSummaryCards({ summary }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Active plans
        </p>
        <p className="mt-1 text-2xl font-semibold">{summary.totalActivePlans}</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Ready to generate
        </p>
        <p className="mt-1 text-2xl font-semibold text-emerald-700">{summary.readyCount}</p>
        <p className="text-xs text-muted-foreground">Slots, times & days set</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Need setup
        </p>
        <p className="mt-1 text-2xl font-semibold text-amber-700">{summary.notReadyCount}</p>
        <p className="text-xs text-muted-foreground">Missing slot setup</p>
      </div>
    </div>
  )
}
