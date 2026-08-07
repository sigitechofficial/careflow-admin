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
import { Home, Info, Loader2, RefreshCw } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { ContentCard } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'
import { fetchEcmDailyOpsReport } from '@/features/ecm/api/ecm.api'
import { ecmKeys } from '@/features/ecm/keys'
import { useEcmDailyOpsReport } from '@/features/ecm/hooks/useEcm'
import { useEcmOperationalPeriod } from '@/features/ecm/hooks/useEcmOperationalPeriod'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import {
  buildDurationComplianceBands,
  buildEcmMethodBreakdown,
  buildPunctualityComplianceBands,
  formatPct,
  formatTrendDayLabel,
  lastNDatesInclusive,
  type ComplianceBandRow,
} from '@/features/ecm/utils/ecm-compliance-overview.util'
import { formatPeriodDayShort } from '@/features/ecm/utils/ecm-operational-period.util'
import { buildEcmPeriodSearch } from '@/features/ecm/utils/ecm-period-url-state.util'

function formatPeriodDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)))
}

function electronicRateColor(rate: number): string {
  if (rate >= 95) return '#16a34a'
  if (rate >= 90) return '#f59e0b'
  return '#dc2626'
}

function BandTable({
  title,
  bandHeader,
  bands,
}: {
  title: string
  bandHeader: string
  bands: ComplianceBandRow[]
}) {
  return (
    <ContentCard className="space-y-3 p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-2 font-medium">{bandHeader}</th>
              <th className="pb-2 pr-2 font-medium">Visits</th>
              <th className="pb-2 font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            {bands.map((band) => (
              <tr key={band.key} className="border-b border-border/60 last:border-0">
                <td className={cn('py-2 pr-2 font-medium', band.textClass)}>{band.label}</td>
                <td className="py-2 pr-2 tabular-nums">{band.count.toLocaleString()}</td>
                <td className="py-2 tabular-nums text-muted-foreground">
                  {formatPct(band.percent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ContentCard>
  )
}

function BandHorizontalChart({
  title,
  bands,
}: {
  title: string
  bands: ComplianceBandRow[]
}) {
  const chartData = bands.map((b) => ({
    ...b,
    label: `${b.count.toLocaleString()} | ${formatPct(b.percent)}`,
  }))
  const max = Math.max(...bands.map((b) => b.count), 1)

  return (
    <ContentCard className="space-y-3 p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {bands.every((b) => b.count === 0) ? (
        <p className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
          No assessed visits for this period.
        </p>
      ) : (
        <>
          <div className="h-[200px] w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 88, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, max]} hide />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={0}
                  tick={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value, _name, item) => {
                    const n = typeof value === 'number' ? value : Number(value)
                    const row = item?.payload as ComplianceBandRow | undefined
                    return [
                      `${Number.isFinite(n) ? n.toLocaleString() : 0} (${formatPct(row?.percent ?? 0)})`,
                      row?.label ?? 'Visits',
                    ]
                  }}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                  <LabelList
                    dataKey="label"
                    position="right"
                    style={{ fill: 'var(--foreground)', fontSize: 11 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {bands.map((b) => (
              <span key={b.key} className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ background: b.color }}
                />
                {b.label}
              </span>
            ))}
          </div>
        </>
      )}
    </ContentCard>
  )
}

type EcmUsedFilter = 'all' | 'yes' | 'no'

export type EcmComplianceOverviewPanelProps = {
  /** Shared with Graphs via EcmGraphPage — secondary to Location scope. */
  scheduleAreaId: string
}

/**
 * Compliance Overview consumes the shared ECM operational period + global location SSOT
 * (same URL/store as Live / Graphs / Reports). No parallel date picker.
 * Schedule area is owned by the Graph page period card (not duplicated here).
 * Daily-ops API already supports dateFrom–dateTo ranges; trend chart still ends on dateTo.
 */
export function EcmComplianceOverviewPanel({ scheduleAreaId }: EcmComplianceOverviewPanelProps) {
  const { locationId: globalLocationId } = useGlobalLocationScope()
  // Default matches Live/Reports; shared store/URL wins when already set.
  const { dateFrom, dateTo, periodLabel, period, multiDay } = useEcmOperationalPeriod('today')
  const [ecmUsed, setEcmUsed] = React.useState<EcmUsedFilter>('all')
  const [serviceUserQuery, setServiceUserQuery] = React.useState('')

  const reportQuery = useEcmDailyOpsReport(
    { dateFrom, dateTo },
    true,
    {
      scheduleAreaId: scheduleAreaId || undefined,
      locationId: globalLocationId ?? undefined,
    },
  )

  const trendDates = React.useMemo(() => lastNDatesInclusive(dateTo, 7), [dateTo])
  const trendQueries = useQueries({
    queries: trendDates.map((d) => ({
      queryKey: ecmKeys.dailyOps(d, scheduleAreaId || undefined, globalLocationId ?? undefined),
      queryFn: () =>
        fetchEcmDailyOpsReport(d, {
          scheduleAreaId: scheduleAreaId || undefined,
          locationId: globalLocationId ?? undefined,
        }),
      staleTime: 60_000,
    })),
  })

  const rangeLabel =
    dateFrom === dateTo
      ? formatPeriodDay(dateFrom)
      : `${formatPeriodDayShort(dateFrom)} – ${formatPeriodDayShort(dateTo)}`

  const rows = React.useMemo(() => {
    const all = reportQuery.data?.rows ?? []
    const q = serviceUserQuery.trim().toLowerCase()
    return all.filter((row) => {
      if (q) {
        const hay = `${row.serviceUserName} ${row.jobName}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (ecmUsed === 'yes') {
        return !(row.operationalExceptionCodes ?? []).includes('MANUAL_ATTENDANCE')
      }
      if (ecmUsed === 'no') {
        return (row.operationalExceptionCodes ?? []).includes('MANUAL_ATTENDANCE')
      }
      return true
    })
  }, [ecmUsed, reportQuery.data?.rows, serviceUserQuery])

  const filteredKpis = React.useMemo(() => {
    const base = reportQuery.data?.kpis
    if (!base) return null
    if (ecmUsed === 'all' && !serviceUserQuery.trim()) return base

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
  }, [ecmUsed, reportQuery.data?.kpis, rows, serviceUserQuery])

  const method = filteredKpis ? buildEcmMethodBreakdown(filteredKpis) : null
  const durationBands = buildDurationComplianceBands(rows)
  const punctualityBands = buildPunctualityComplianceBands(rows)
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
    <div className="space-y-4" data-testid="ecm-compliance-overview-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">ECM Compliance Overview</h2>
          <p className="text-xs text-muted-foreground">
            Electronic vs manual attendance, duration and punctuality compliance, geofence
            breaches, and daily electronic %.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" className="h-9" asChild>
          <Link to="/ecm/live" search={buildEcmPeriodSearch(period)}>
            <Home className="h-4 w-4" />
            <span className="sr-only">Live monitoring</span>
          </Link>
        </Button>
      </div>

      <div
        className="rounded-lg border border-sky-500/25 bg-sky-500/5 px-4 py-3"
        data-testid="ecm-compliance-period-banner"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Shared operational period
        </p>
        <p className="text-base font-semibold text-foreground">{rangeLabel}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Same period and location as Graphs / Live / Reports
          {multiDay ? ` · ${periodLabel}` : ''}
          {' · '}
          Cards and duration/punctuality tables use the full period
          {' · '}
          Electronic % trend: last 7 days ending {formatPeriodDayShort(dateTo)}
          {' · '}
          ISO {dateFrom === dateTo ? dateFrom : `${dateFrom} → ${dateTo}`}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/20 p-3">
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Service user</span>
          <Input
            value={serviceUserQuery}
            onChange={(e) => setServiceUserQuery(e.target.value)}
            placeholder="Search…"
            className="h-9 w-[11rem]"
          />
        </label>
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
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <ContentCard className="flex flex-col justify-center p-4">
              <p className="text-xs font-medium text-muted-foreground">Electronic %</p>
              <p className={cn('text-4xl font-bold tabular-nums tracking-tight', electronicTone)}>
                {formatPct(method.electronicPercent)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {method.electronic.toLocaleString()} of {method.total.toLocaleString()} visits
              </p>
            </ContentCard>

            <ContentCard className="space-y-2 p-4">
              <h3 className="text-sm font-semibold text-foreground">ECM Method</h3>
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
                <h3 className="text-sm font-semibold text-foreground">Geo-Fence Breaches</h3>
                <span title="Counts visits with OUTSIDE_GEOFENCE in the selected period.">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </span>
              </div>
              <p className="text-5xl font-bold tabular-nums text-sky-600 dark:text-sky-400">
                {geofenceBreaches.toLocaleString()}
              </p>
            </ContentCard>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <BandTable
              title="ECM Compliance by Duration"
              bandHeader="Duration Band"
              bands={durationBands}
            />
            <BandTable
              title="ECM Compliance by Punctuality"
              bandHeader="Punctuality Band"
              bands={punctualityBands}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <ContentCard className="space-y-3 p-4 lg:col-span-1">
              <h3 className="text-sm font-semibold text-foreground">Electronic % Trend</h3>
              <p className="text-xs text-muted-foreground">
                Last 7 days ending {formatPeriodDay(dateTo)} ({trendDates[0]} → {dateTo})
              </p>
              <div className="h-[220px] w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={trendData}
                    margin={{ top: 24, right: 8, left: 0, bottom: 8 }}
                  >
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

            <BandHorizontalChart
              title="ECM Compliance by Duration Graph"
              bands={durationBands}
            />
            <BandHorizontalChart
              title="ECM Compliance by Punctuality Graph"
              bands={punctualityBands}
            />
          </div>
        </>
      ) : null}
    </div>
  )
}
