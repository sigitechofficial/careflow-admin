import * as React from 'react'
import { AlertTriangle, BarChart3 } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Input } from '@/shared/ui/input'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { useIncidentAnalytics } from '@/features/incidents/hooks/useIncidents'
import type { IncidentAnalyticsFilters, IncidentSeverity } from '@/features/incidents/types'

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

function BarList({
  title,
  rows,
}: {
  title: string
  rows: { label: string; count: number }[]
}) {
  const max = Math.max(1, ...rows.map(r => r.count))
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className="w-32 shrink-0 truncate text-muted-foreground" title={r.label}>
                {r.label}
              </span>
              <div className="h-3.5 flex-1 overflow-hidden rounded-sm bg-muted">
                <div
                  className="h-full rounded-sm bg-primary/70"
                  style={{ width: `${Math.round((r.count / max) * 100)}%` }}
                  aria-hidden
                />
              </div>
              <span className="w-8 shrink-0 text-right tabular-nums">{r.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function IncidentAnalyticsPage() {
  const { locationId } = useGlobalLocationScope()
  const [filters, setFilters] = React.useState<IncidentAnalyticsFilters>({})
  const { data, isLoading, isError } = useIncidentAnalytics({
    ...filters,
    locationId: locationId ?? filters.locationId,
  })

  const t = data?.totals
  const hasDateFilter = Boolean(filters.dateFrom || filters.dateTo)
  const rangeReversed = Boolean(filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Incident Analytics"
        description="Simple overview of incidents in the selected period."
        icon={<BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Accident & Incident' },
          { label: 'Analytics' },
        ]}
      />

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          From
          <Input
            type="date"
            value={filters.dateFrom ?? ''}
            max={filters.dateTo || undefined}
            onChange={e =>
              setFilters(f => ({ ...f, dateFrom: e.target.value || undefined }))
            }
            className="h-9 w-40"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          To
          <Input
            type="date"
            value={filters.dateTo ?? ''}
            min={filters.dateFrom || undefined}
            onChange={e =>
              setFilters(f => ({ ...f, dateTo: e.target.value || undefined }))
            }
            className="h-9 w-40"
          />
        </label>
        {hasDateFilter ? (
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={() => setFilters({})}
          >
            Clear dates
          </button>
        ) : null}
      </div>
      {rangeReversed ? (
        <p className="text-sm text-destructive">
          “From” is after “To”, so no incidents can match. Adjust the dates.
        </p>
      ) : null}

      {data && data.warnings.length > 0 ? (
        <div className="space-y-1.5">
          {data.warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {w.label}
            </div>
          ))}
        </div>
      ) : null}

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading analytics…</p>
      ) : isError || !data || !t ? (
        <p className="py-10 text-center text-sm text-destructive">Could not load analytics.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total" value={t.total} />
            <StatCard label="Open" value={t.open} />
            <StatCard label="High / Critical" value={t.highCritical} />
            <StatCard label="Overdue actions" value={t.overdueActions} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BarList
              title="By category"
              rows={data.byCategory.map(c => ({ label: c.label, count: c.count }))}
            />
            <BarList
              title="By severity"
              rows={(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as IncidentSeverity[]).map(s => ({
                label: s.charAt(0) + s.slice(1).toLowerCase(),
                count: data.bySeverity[s] ?? 0,
              }))}
            />
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Monthly trend</h3>
            <div className="flex items-end gap-1.5" style={{ height: 120 }}>
              {data.monthlyTrend.map(m => {
                const max = Math.max(1, ...data.monthlyTrend.map(x => x.count))
                return (
                  <div
                    key={m.month}
                    className="flex flex-1 flex-col items-center gap-1"
                    title={`${m.month}: ${m.count}`}
                  >
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-t-sm bg-primary/70"
                        style={{ height: `${Math.round((m.count / max) * 100)}%` }}
                        aria-hidden
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{m.month.slice(5)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
