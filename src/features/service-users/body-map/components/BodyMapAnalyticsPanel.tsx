import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { fetchBodyMapAnalytics } from '@/features/service-users/body-map/api'
import { bodyMapKeys } from '@/features/service-users/body-map/keys'
import { recordTypeLabel } from '@/features/service-users/body-map/catalog/record-types'
import type { BodyMapRecordTypeCode } from '@/features/service-users/body-map/catalog/record-types'

export function BodyMapAnalyticsPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: [...bodyMapKeys.all, 'analytics'] as const,
    queryFn: ({ signal }) => fetchBodyMapAnalytics(signal),
  })

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading analytics…
      </p>
    )
  }

  if (error || !data) {
    return <p className="text-sm text-muted-foreground">Analytics unavailable.</p>
  }

  const t = data.totals

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">Body map governance (branch)</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">§22 manager dashboard — active records</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Active" value={t.activeCount} />
        <Stat label="Review overdue" value={t.reviewDueCount} warn />
        <Stat label="High / urgent" value={t.highRiskCount} danger />
        <Stat label="Safeguarding" value={t.safeguardingCount} danger={t.safeguardingCount > 0} />
        <Stat label="Review queue" value={t.reviewQueueCount} />
        <Stat label="Governance gaps" value={t.outstandingGapCount} warn />
      </div>
      {data.byRecordType.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2 text-xs">
          {data.byRecordType.map(row => (
            <li
              key={row.recordType}
              className="rounded-full bg-muted px-2 py-0.5 font-medium"
            >
              {recordTypeLabel(row.recordType as BodyMapRecordTypeCode)}: {row.count}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function Stat({
  label,
  value,
  warn,
  danger,
}: {
  label: string
  value: number
  warn?: boolean
  danger?: boolean
}) {
  return (
    <div className="rounded-lg border border-border/80 px-2 py-1.5">
      <p
        className={`text-lg font-semibold tabular-nums ${
          danger ? 'text-red-600' : warn ? 'text-amber-600' : ''
        }`}
      >
        {value}
      </p>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  )
}
