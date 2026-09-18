import * as React from 'react'
import { AlertTriangle, BarChart3, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Input } from '@/shared/ui/input'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { useIncidentAnalytics, useIncidentCategories } from '@/features/incidents/hooks/useIncidents'
import type { IncidentAnalyticsFilters, IncidentSeverity } from '@/features/incidents/types'

const selectClass =
  'h-9 rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

function BarList({
  title,
  rows,
  emptyText = 'No data.',
}: {
  title: string
  rows: { label: string; count: number }[]
  emptyText?: string
}) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className="w-36 shrink-0 truncate text-muted-foreground" title={r.label}>{r.label}</span>
              <div className="h-4 flex-1 overflow-hidden rounded-sm bg-muted">
                <div
                  className="h-full rounded-sm bg-primary/70"
                  style={{ width: `${Math.round((r.count / max) * 100)}%` }}
                  aria-hidden
                />
              </div>
              <span className="w-8 shrink-0 text-right tabular-nums text-foreground">{r.count}</span>
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
  const categoriesQuery = useIncidentCategories()
  const { data, isLoading, isError } = useIncidentAnalytics({
    ...filters,
    locationId: locationId ?? filters.locationId,
  })

  function set<K extends keyof IncidentAnalyticsFilters>(key: K, value: IncidentAnalyticsFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value || undefined }))
  }

  const t = data?.totals

  return (
    <div className="space-y-4">
      <PageHeader
        title="Incident Analytics"
        description="Trends and breakdowns across recorded incidents. Confidential incidents you can't access are excluded."
        icon={<BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Accident & Incident' },
          { label: 'Analytics' },
        ]}
      />

      {/* Trend / duplicate warnings */}
      {data && data.warnings.length > 0 && (
        <div className="space-y-1.5">
          {data.warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {w.label}
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          From
          <Input type="date" value={filters.dateFrom ?? ''} onChange={(e) => set('dateFrom', e.target.value)} className="h-9 w-40" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          To
          <Input type="date" value={filters.dateTo ?? ''} onChange={(e) => set('dateTo', e.target.value)} className="h-9 w-40" />
        </label>
        <select className={selectClass} value={filters.severity ?? ''} onChange={(e) => set('severity', (e.target.value || undefined) as IncidentSeverity | undefined)} aria-label="Severity">
          <option value="">All severities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
        <select className={selectClass} value={filters.categoryId ?? ''} onChange={(e) => set('categoryId', e.target.value || undefined)} aria-label="Category">
          <option value="">All categories</option>
          {(categoriesQuery.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        {(filters.dateFrom || filters.dateTo || filters.severity || filters.categoryId) && (
          <button type="button" className="text-sm text-primary hover:underline" onClick={() => setFilters({})}>
            Clear
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="p-8 text-center text-muted-foreground">Loading analytics…</p>
      ) : isError || !data || !t ? (
        <p className="p-8 text-center text-destructive">Could not load analytics.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <StatCard label="Total" value={t.total} />
            <StatCard label="Open" value={t.open} />
            <StatCard label="High / Critical" value={t.highCritical} />
            <StatCard label="Falls" value={t.falls} />
            <StatCard label="Medication" value={t.medication} />
            <StatCard label="Overdue actions" value={t.overdueActions} />
            <StatCard label="Avg. closure (hrs)" value={t.averageClosureHours ?? '—'} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BarList title="By category" rows={data.byCategory.map((c) => ({ label: c.label, count: c.count }))} />
            <BarList title="By subtype" rows={data.bySubtype.map((s) => ({ label: s.label, count: s.count }))} />
            <BarList
              title="By severity"
              rows={(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as IncidentSeverity[]).map((s) => ({ label: s.charAt(0) + s.slice(1).toLowerCase(), count: data.bySeverity[s] ?? 0 }))}
            />
            <BarList title="Injury types" rows={data.injuryTypes.map((i) => ({ label: i.type, count: i.count }))} />
            <BarList title="By location" rows={data.byLocation.map((l) => ({ label: l.name, count: l.count }))} />
            <BarList title="Repeat service users" rows={data.byServiceUser.map((s) => ({ label: s.name, count: s.count }))} />
            <BarList title="By time of day" rows={data.byTimeOfDay.map((b) => ({ label: b.label, count: b.count }))} />
            <BarList title="By day of week" rows={data.byDayOfWeek.map((b) => ({ label: b.day, count: b.count }))} />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <TrendingUp className="h-4 w-4 text-muted-foreground" /> Monthly trend (12 months)
            </h3>
            <div className="flex items-end gap-1.5" style={{ height: 120 }}>
              {data.monthlyTrend.map((m) => {
                const max = Math.max(1, ...data.monthlyTrend.map((x) => x.count))
                return (
                  <div key={m.month} className="flex flex-1 flex-col items-center gap-1" title={`${m.month}: ${m.count}`}>
                    <div className="flex w-full flex-1 items-end">
                      <div className="w-full rounded-t-sm bg-primary/70" style={{ height: `${Math.round((m.count / max) * 100)}%` }} aria-hidden />
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
