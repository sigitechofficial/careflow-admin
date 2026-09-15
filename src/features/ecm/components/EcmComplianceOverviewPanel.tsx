import * as React from 'react'
import { useQueries } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { FileBarChart2, Info, Loader2, RefreshCw } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/shared/ui/button'
import { ContentCard } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'
import { fetchEcmDailyOpsReport } from '@/features/ecm/api/ecm.api'
import { ecmKeys } from '@/features/ecm/keys'
import { useEcmDailyOpsReport } from '@/features/ecm/hooks/useEcm'
import { useEcmOperationalPeriod } from '@/features/ecm/hooks/useEcmOperationalPeriod'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import {
  buildEcmMethodBreakdown,
  formatPct,
  formatTrendDayLabel,
  lastNDatesInclusive,
} from '@/features/ecm/utils/ecm-compliance-overview.util'
import { formatPeriodDayShort } from '@/features/ecm/utils/ecm-operational-period.util'
import { buildEcmPeriodSearch } from '@/features/ecm/utils/ecm-period-url-state.util'

function electronicRateColor(rate: number): string {
  if (rate >= 95) return '#16a34a'
  if (rate >= 90) return '#f59e0b'
  return '#dc2626'
}

type EcmUsedFilter = 'all' | 'yes' | 'no'

export type EcmComplianceOverviewPanelProps = {
  className?: string
  /** When true, Electronic/Manual/Geofence cards are omitted (shown at page top). */
  hideMethodCards?: boolean
}

/**
 * Slim compliance strip on the Graph page: electronic vs manual + geofence.
 * Arrival/duration band charts live on Graphs (classification SSOT) — not duplicated here.
 * Period/location SSOT matches Live / Graphs / Reports (page-level filter).
 */
export function EcmComplianceOverviewPanel({
  className,
  hideMethodCards = false,
}: EcmComplianceOverviewPanelProps = {}) {
  const { locationId: globalLocationId } = useGlobalLocationScope()
  const { dateFrom, dateTo, periodLabel, period, multiDay } = useEcmOperationalPeriod('today')
  const [ecmUsed, setEcmUsed] = React.useState<EcmUsedFilter>('all')

  const reportQuery = useEcmDailyOpsReport(
    { dateFrom, dateTo },
    true,
    {
      locationId: globalLocationId ?? undefined,
    },
  )

  const trendDates = React.useMemo(() => lastNDatesInclusive(dateTo, 7), [dateTo])
  const trendQueries = useQueries({
    queries: trendDates.map((d) => ({
      queryKey: ecmKeys.dailyOps(d, undefined, globalLocationId ?? undefined),
      queryFn: () =>
        fetchEcmDailyOpsReport(d, {
          locationId: globalLocationId ?? undefined,
        }),
      staleTime: 60_000,
    })),
  })

  const rangeLabel =
    dateFrom === dateTo
      ? formatPeriodDayShort(dateFrom)
      : `${formatPeriodDayShort(dateFrom)} – ${formatPeriodDayShort(dateTo)}`

  const rows = React.useMemo(() => {
    const all = reportQuery.data?.rows ?? []
    return all.filter((row) => {
      if (ecmUsed === 'yes') {
        return !(row.operationalExceptionCodes ?? []).includes('MANUAL_ATTENDANCE')
      }
      if (ecmUsed === 'no') {
        return (row.operationalExceptionCodes ?? []).includes('MANUAL_ATTENDANCE')
      }
      return true
    })
  }, [ecmUsed, reportQuery.data?.rows])

  const filteredKpis = React.useMemo(() => {
    const base = reportQuery.data?.kpis
    if (!base) return null
    if (ecmUsed === 'all') return base

    const manual = rows.filter((r) =>
      (r.operationalExceptionCodes ?? []).includes('MANUAL_ATTENDANCE'),
    ).length
    const total = rows.length
    const electronic = Math.max(0, total - manual)
    const geofence = rows.filter((r) =>
      (r.operationalExceptionCodes ?? []).includes('OUTSIDE_GEOFENCE'),
    ).length
    return {
      ...base,
      totalVisits: total,
      manualAttendance: manual,
      electronicAttendance: electronic,
      geofenceBreaches: geofence,
    }
  }, [ecmUsed, reportQuery.data?.kpis, rows])

  const method = filteredKpis ? buildEcmMethodBreakdown(filteredKpis) : null
  const geofenceBreaches = React.useMemo(() => {
    if (!filteredKpis) return 0
    if (typeof filteredKpis.geofenceBreaches === 'number') return filteredKpis.geofenceBreaches
    return rows.filter((r) =>
      (r.operationalExceptionCodes ?? []).includes('OUTSIDE_GEOFENCE'),
    ).length
  }, [filteredKpis, rows])

  const trendData = React.useMemo(() => {
    return trendDates.map((d, i) => {
      const data = trendQueries[i]?.data
      const total = data?.kpis.totalVisits ?? 0
      const manual = data?.kpis.manualAttendance ?? 0
      const electronic =
        data?.kpis.electronicAttendance != null
          ? data.kpis.electronicAttendance
          : Math.max(0, total - manual)
      const rate = total > 0 ? Math.round((electronic / total) * 1000) / 10 : 0
      return {
        date: d,
        label: formatTrendDayLabel(d),
        rate,
        color: electronicRateColor(rate),
      }
    })
  }, [trendDates, trendQueries])

  const electronicTone =
    method && method.electronicPercent >= 95
      ? 'text-emerald-700 dark:text-emerald-300'
      : method && method.electronicPercent >= 90
        ? 'text-amber-600 dark:text-amber-300'
        : 'text-red-600 dark:text-red-400'

  const refetchAll = () => {
    void reportQuery.refetch()
    for (const q of trendQueries) void q.refetch()
  }

  return (
    <div className={cn('space-y-4', className)} data-testid="ecm-compliance-overview-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">ECM Compliance Overview</h2>
          <p className="text-xs text-muted-foreground">
            Electronic vs manual attendance and geofence breaches. For the audit period pack
            (n/d, exclusions, threshold version, CSV), open Reports.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" className="h-9" asChild>
          <Link to="/ecm/reports" search={buildEcmPeriodSearch(period)}>
            <FileBarChart2 className="h-4 w-4" />
            Open report pack
          </Link>
        </Button>
      </div>

      <div
        className="rounded-lg border border-sky-500/25 bg-sky-500/5 px-4 py-3"
        data-testid="ecm-compliance-period-banner"
      >
        <p className="text-xs text-muted-foreground">
          Using page period above
          {multiDay ? ` · ${periodLabel}` : ` · ${rangeLabel}`}
          {' · '}
          Electronic % trend: last 7 days ending {formatPeriodDayShort(dateTo)}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/20 p-3">
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">ECM used?</span>
          <select
            className="flex h-9 w-[8rem] rounded-md border border-input bg-background px-2 text-sm"
            value={ecmUsed}
            onChange={(e) => setEcmUsed(e.target.value as EcmUsedFilter)}
          >
            <option value="all">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9"
          disabled={reportQuery.isFetching}
          onClick={refetchAll}
        >
          {reportQuery.isFetching ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
      </div>

      {reportQuery.isLoading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading compliance overview…
        </div>
      ) : reportQuery.isError ? (
        <p className="text-sm text-destructive">
          Could not load compliance data. Ensure ECM migrations are applied and you have report
          access (`ecm.read` / `ecm.reports.export`).
        </p>
      ) : method ? (
        <>
          {hideMethodCards ? null : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <ContentCard className="flex flex-col justify-center p-4">
                <p className="text-xs font-medium text-muted-foreground">Electronic %</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  Phone/app check-in = Electronic. Admin completed visit = Manual.
                </p>
                <p className={cn('mt-2 text-4xl font-bold tabular-nums tracking-tight', electronicTone)}>
                  {formatPct(method.electronicPercent)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {method.electronic.toLocaleString()} of {method.total.toLocaleString()} visits
                </p>
              </ContentCard>

              <ContentCard className="space-y-2 p-4">
                <h3 className="text-sm font-semibold text-foreground">ECM Method</h3>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Electronic = carer mobile app. Manual = visit completed from admin
                  (typed start/end times).
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">Method</th>
                      <th className="pb-2 font-medium">Visits</th>
                      <th className="pb-2 font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/60">
                      <td className="py-2 font-medium text-emerald-700 dark:text-emerald-300">
                        Electronic
                      </td>
                      <td className="py-2 tabular-nums">{method.electronic.toLocaleString()}</td>
                      <td className="py-2 tabular-nums">{formatPct(method.electronicPercent)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-red-600 dark:text-red-400">Manual</td>
                      <td className="py-2 tabular-nums">{method.manual.toLocaleString()}</td>
                      <td className="py-2 tabular-nums">{formatPct(method.manualPercent)}</td>
                    </tr>
                  </tbody>
                </table>
              </ContentCard>

              <ContentCard className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Geo-Fence Breaches</h3>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      Count of visits where check-in happened outside the expected location.
                    </p>
                  </div>
                  <span title="Counts visits with OUTSIDE_GEOFENCE in the selected period.">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </span>
                </div>
                <p className="text-5xl font-bold tabular-nums text-sky-600 dark:text-sky-400">
                  {geofenceBreaches.toLocaleString()}
                </p>
              </ContentCard>
            </div>
          )}

          <ContentCard className="space-y-3 p-4 max-w-2xl">
            <h3 className="text-sm font-semibold text-foreground">Electronic % Trend</h3>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Use this to see if electronic attendance is improving or dropping over the last
              week.
            </p>
            <p className="text-xs text-muted-foreground">
              Last 7 days ending {formatPeriodDayShort(dateTo)} ({trendDates[0]} → {dateTo})
            </p>
            <div className="h-[220px] w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trendData} margin={{ top: 24, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" width={36} />
                  <Tooltip
                    formatter={(value) => {
                      const n = typeof value === 'number' ? value : Number(value)
                      return [`${Number.isFinite(n) ? n.toFixed(1) : 0}%`, 'Electronic']
                    }}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    {trendData.map((entry) => (
                      <Cell key={entry.date} fill={entry.color} />
                    ))}
                    <LabelList
                      dataKey="rate"
                      position="top"
                      formatter={(v: unknown) => {
                        const n = typeof v === 'number' ? v : Number(v)
                        return Number.isFinite(n) ? `${n.toFixed(1)}%` : ''
                      }}
                      style={{ fill: 'var(--foreground)', fontSize: 10 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ContentCard>
        </>
      ) : null}
    </div>
  )
}
