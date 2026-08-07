import * as React from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { ContentCard } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'
import { useEcmGraphDashboard } from '@/features/ecm/hooks/useEcm'
import { useEcmOperationalPeriod } from '@/features/ecm/hooks/useEcmOperationalPeriod'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { EcmVisitDetailDialog } from '@/features/ecm/components/EcmVisitDetailDialog'
import type { EcmGraphDrillVisit } from '@/features/ecm/api/ecm.api'

export type EcmGraphFirstDashboardProps = {
  className?: string
}

type BranchMetric = 'onTimePct' | 'latePct' | 'missedPct' | 'shortPct' | 'verifiedPct'
type TrendSeries = 'late' | 'short' | 'missed'

type DrillFilter =
  | { kind: 'hourStatus'; hourKey: string; statusKey: string; label: string }
  | { kind: 'arrivalBand'; band: string; label: string }
  | { kind: 'durationBand'; band: string; label: string }
  | { kind: 'reason'; code: string; label: string }
  | { kind: 'branch'; name: string; metric: BranchMetric; label: string }
  | { kind: 'trendDay'; date: string; series: TrendSeries; label: string }
  | { kind: 'heatmapCell'; weekday: string; bandKey: string; label: string }

const STATUS_LABELS: Record<string, string> = {
  // Key kept for API compatibility; includes completed early + on-time arrivals.
  completedOnTime: 'Completed',
  inProgress: 'In progress',
  late: 'Late arrival',
  potentialMissed: 'Potentially missed',
  missed: 'Missed',
  unassigned: 'Unassigned',
  other: 'Other',
}

const STATUS_COLORS: Record<string, string> = {
  completedOnTime: '#16a34a',
  inProgress: '#0ea5e9',
  late: '#dc2626',
  potentialMissed: '#ea580c',
  missed: '#b91c1c',
  unassigned: '#64748b',
  other: '#94a3b8',
}

/** Classification SSOT — matches graph-dashboard arrivalPunctuality keys. */
const ARRIVAL_LABELS: Record<string, string> = {
  early: 'Early',
  on_time: 'On time',
  late: 'Late',
  very_late: 'Very late',
  not_assessed: 'Not assessed',
}

const ARRIVAL_COLORS: Record<string, string> = {
  early: '#0ea5e9',
  on_time: '#16a34a',
  late: '#f97316',
  very_late: '#dc2626',
  not_assessed: '#94a3b8',
}

const ARRIVAL_ORDER = ['early', 'on_time', 'late', 'very_late', 'not_assessed'] as const

/** Classification SSOT — matches graph-dashboard durationVariance keys. */
const DURATION_LABELS: Record<string, string> = {
  short: 'Short visit',
  on_time: 'Planned duration',
  long: 'Long visit',
  excessive: 'Excessive overrun',
  not_assessed: 'Not assessed',
}

const DURATION_COLORS: Record<string, string> = {
  short: '#dc2626',
  on_time: '#16a34a',
  long: '#f59e0b',
  excessive: '#c2410c',
  not_assessed: '#94a3b8',
}

const DURATION_ORDER = ['short', 'on_time', 'long', 'excessive', 'not_assessed'] as const

const BRANCH_METRIC_META: Record<
  BranchMetric,
  { label: string; adverse: boolean; sortLabel: string }
> = {
  latePct: { label: 'Late %', adverse: true, sortLabel: 'Worst 12 by Late %' },
  missedPct: { label: 'Missed %', adverse: true, sortLabel: 'Worst 12 by Missed %' },
  shortPct: { label: 'Short-visit %', adverse: true, sortLabel: 'Worst 12 by Short %' },
  onTimePct: { label: 'On-time %', adverse: false, sortLabel: 'Top 12 by On-time %' },
  verifiedPct: { label: 'Verified %', adverse: false, sortLabel: 'Top 12 by Verified %' },
}

function inclusiveDayCount(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00.000Z`)
  const b = Date.parse(`${to}T00:00:00.000Z`)
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0
  return Math.round((b - a) / 86_400_000) + 1
}

function heatmapCellClass(rate: number | null): string {
  if (rate == null) return 'bg-muted/40 text-muted-foreground'
  if (rate === 0) return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
  if (rate < 10) return 'bg-amber-500/20 text-amber-900 dark:text-amber-100'
  if (rate < 20) return 'bg-amber-500/35 text-amber-950 dark:text-amber-50'
  if (rate < 35) return 'bg-orange-500/40 text-orange-950 dark:text-orange-100'
  return 'bg-red-500/40 text-red-950 dark:text-red-100'
}

function branchBarColor(metric: BranchMetric): string {
  return BRANCH_METRIC_META[metric].adverse ? '#dc2626' : '#16a34a'
}

function branchDenominator(
  row: { total: number; assessedArrival?: number; assessedDuration?: number },
  metric: BranchMetric,
): number {
  if (metric === 'onTimePct' || metric === 'latePct') {
    return row.assessedArrival ?? row.total
  }
  if (metric === 'shortPct') {
    return row.assessedDuration ?? row.total
  }
  return row.total
}

function matchesBranchMetric(v: EcmGraphDrillVisit, metric: BranchMetric): boolean {
  switch (metric) {
    case 'onTimePct':
      return v.arrivalBand === 'on_time'
    case 'latePct':
      return v.arrivalBand === 'late' || v.arrivalBand === 'very_late'
    case 'missedPct':
      return v.statusKey === 'missed' || v.statusKey === 'potentialMissed'
    case 'shortPct':
      return v.durationBand === 'short'
    case 'verifiedPct':
      return v.verified === true
    default:
      return true
  }
}

function matchesTrendDay(v: EcmGraphDrillVisit, date: string, series: TrendSeries): boolean {
  if (v.localVisitDate !== date) return false
  if (series === 'late') return v.arrivalBand === 'late' || v.arrivalBand === 'very_late'
  if (series === 'short') return v.durationBand === 'short'
  return v.statusKey === 'missed' || v.statusKey === 'potentialMissed'
}

function ChartCard({
  title,
  purpose,
  hint,
  children,
  className,
}: {
  title: string
  /** Plain-language “what is this for?” */
  purpose?: string
  /** Optional interaction / reading tip */
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <ContentCard className={cn('space-y-3 p-4', className)}>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {purpose ? (
          <p className="text-xs leading-relaxed text-foreground/80">{purpose}</p>
        ) : null}
        {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </ContentCard>
  )
}

export function EcmGraphFirstDashboard({ className }: EcmGraphFirstDashboardProps = {}) {
  const { locationId: globalLocationId } = useGlobalLocationScope()
  const { dateFrom, dateTo } = useEcmOperationalPeriod('today')
  const [branchMetric, setBranchMetric] = React.useState<BranchMetric>('latePct')
  const [drill, setDrill] = React.useState<DrillFilter | null>(null)
  const [selectedJobId, setSelectedJobId] = React.useState<string | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const drillPanelRef = React.useRef<HTMLDivElement>(null)

  const dashboard = useEcmGraphDashboard({
    dateFrom,
    dateTo,
    locationId: globalLocationId ?? undefined,
  })

  const data = dashboard.data
  const effectiveFrom = data?.dateFrom ?? dateFrom
  const effectiveTo = data?.dateTo ?? dateTo
  const daySpan = inclusiveDayCount(effectiveFrom, effectiveTo)
  const showStatusByHour = daySpan === 1

  React.useEffect(() => {
    if (!drill) return
    drillPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [drill])

  const hourChartData = React.useMemo(() => {
    if (!data) return []
    return data.visitStatusByHour.hours.map((hour, i) => {
      const row: Record<string, string | number> = { hour }
      for (const s of data.visitStatusByHour.series) {
        row[s.key] = s.data[i] ?? 0
      }
      return row
    })
  }, [data])

  const trendChartData = React.useMemo(() => {
    if (!data?.exceptionTrend?.series) return []
    const { dates, series, counts, denominators } = data.exceptionTrend
    return dates.map((date, i) => ({
      date,
      dateLabel: date.slice(5),
      'Late %': series.latePct?.[i] ?? 0,
      'Short %': series.shortPct?.[i] ?? 0,
      'Missed %': series.missedPct?.[i] ?? 0,
      lateCount: counts?.late?.[i] ?? 0,
      shortCount: counts?.short?.[i] ?? 0,
      missedCount: counts?.missed?.[i] ?? 0,
      assessedArrival: denominators?.assessedArrival?.[i] ?? 0,
      assessedDuration: denominators?.assessedDuration?.[i] ?? 0,
      visits: denominators?.visits?.[i] ?? 0,
    }))
  }, [data])

  const arrivalChartData = React.useMemo(() => {
    if (!data) return []
    const assessed = data.arrivalPunctuality
      .filter((b) => b.key !== 'not_assessed')
      .reduce((sum, b) => sum + b.count, 0)
    const byKey = new Map(data.arrivalPunctuality.map((b) => [b.key, b.count]))
    return ARRIVAL_ORDER.map((key) => {
      const count = byKey.get(key) ?? 0
      const assessedPct =
        key !== 'not_assessed' && assessed > 0
          ? Math.round((count / assessed) * 1000) / 10
          : null
      return {
        key,
        name: ARRIVAL_LABELS[key] ?? key,
        count,
        assessedPct,
        color: ARRIVAL_COLORS[key] ?? '#94a3b8',
      }
    })
  }, [data])

  const durationChartData = React.useMemo(() => {
    if (!data) return []
    const assessed = data.durationVariance
      .filter((b) => b.key !== 'not_assessed')
      .reduce((sum, b) => sum + b.count, 0)
    const byKey = new Map(data.durationVariance.map((b) => [b.key, b.count]))
    return DURATION_ORDER.map((key) => {
      const count = byKey.get(key) ?? 0
      const assessedPct =
        key !== 'not_assessed' && assessed > 0
          ? Math.round((count / assessed) * 1000) / 10
          : null
      return {
        key,
        name: DURATION_LABELS[key] ?? key,
        count,
        assessedPct,
        color: DURATION_COLORS[key] ?? '#94a3b8',
      }
    })
  }, [data])

  const branchMeta = BRANCH_METRIC_META[branchMetric]
  const branchChartData = React.useMemo(() => {
    if (!data) return []
    return [...data.branchComparison]
      .sort((a, b) => {
        const byMetric = b[branchMetric] - a[branchMetric]
        if (byMetric !== 0) return byMetric
        return b.total - a.total
      })
      .slice(0, 12)
      .map((b) => ({
        name: b.name,
        label: `${b.name} (${b.total})`,
        value: b[branchMetric],
        total: b.total,
        n: branchDenominator(b, branchMetric),
      }))
  }, [branchMetric, data])

  const reasonChartData = React.useMemo(() => {
    if (!data) return []
    const visitN = data.visitCount || 0
    return data.exceptionReasons.slice(0, 12).map((r) => ({
      name: r.label,
      code: r.code,
      count: r.count,
      visitPct: visitN > 0 ? Math.round((r.count / visitN) * 1000) / 10 : 0,
    }))
  }, [data])

  const drilledVisits = React.useMemo(() => {
    if (!data || !drill) return []
    return data.drillVisits.filter((v) => {
      if (drill.kind === 'hourStatus') {
        return v.hourKey === drill.hourKey && v.statusKey === drill.statusKey
      }
      if (drill.kind === 'arrivalBand') return v.arrivalBand === drill.band
      if (drill.kind === 'durationBand') return v.durationBand === drill.band
      if (drill.kind === 'branch') {
        if ((v.branchName ?? 'Unassigned area') !== drill.name) return false
        return matchesBranchMetric(v, drill.metric)
      }
      if (drill.kind === 'reason') {
        return (v.reasonCodes ?? []).includes(drill.code)
      }
      if (drill.kind === 'trendDay') {
        return matchesTrendDay(v, drill.date, drill.series)
      }
      if (drill.kind === 'heatmapCell') {
        return v.weekday === drill.weekday && v.timeBandKey === drill.bandKey
      }
      return false
    })
  }, [data, drill])

  const openVisit = (jobId: string) => {
    setSelectedJobId(jobId)
    setDetailOpen(true)
  }

  const selectTrendDay = (date: string, series: TrendSeries) => {
    const labels: Record<TrendSeries, string> = {
      late: 'Late / very late',
      short: 'Short visit',
      missed: 'Missed',
    }
    setDrill({
      kind: 'trendDay',
      date,
      series,
      label: `${labels[series]} · ${date}`,
    })
  }

  return (
    <div className={cn('space-y-4', className)} data-testid="ecm-graph-first-dashboard">
      <div>
        <h2 className="text-base font-semibold text-foreground">Graphs</h2>
        <p className="text-xs text-muted-foreground">
          Exception rates, classification bands, and branch risk — click a series to list
          matching visits.
          {' · '}
          ISO {effectiveFrom}
          {effectiveFrom !== effectiveTo ? ` → ${effectiveTo}` : ''}
        </p>
      </div>

      {dashboard.isLoading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading graph dashboard…
        </div>
      ) : dashboard.isError || !data ? (
        <p className="text-sm text-destructive">
          Could not load graph analytics. Restart the API after pulling the latest
          (`GET /ecm/reports/graph-dashboard`).
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {(data.visitCount ?? 0).toLocaleString()} visits
            </span>
            {' '}in this period
            {data.truncated && data.totalMatching != null
              ? ` · showing first ${(data.rowCap ?? data.visitCount).toLocaleString()} of ${data.totalMatching.toLocaleString()} (narrow period or location for full coverage)`
              : ''}
            {data.visitCount === 0
              ? ' — try adjusting the operational period (demo seed often ends on recent completed days)'
              : ''}
            {' · refreshed '}
            {new Date(data.refreshedAt).toLocaleTimeString()}
          </p>
          {data.truncated ? (
            <p
              className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100"
              data-testid="ecm-graph-truncated-warning"
            >
              Chart aggregates are truncated at {(data.rowCap ?? 5000).toLocaleString()} visits
              matching this filter. Totals and drills may under-count until you narrow the period
              or location.
            </p>
          ) : null}

          {/* 1–2: exception rates + branch risk */}
          <div className="grid gap-3 xl:grid-cols-2">
            <ChartCard
              title="1. Exception rates by day"
              purpose="Use this to spot whether late, short, or missed visits are getting better or worse over the selected days."
              hint="Click a day on a line to list those visits below."
            >
              <div className="h-[280px] w-full min-w-0 overflow-hidden">
                {trendChartData.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No trend data in range.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart
                      data={trendChartData}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} />
                      <YAxis
                        domain={[0, 'auto']}
                        tick={{ fontSize: 11 }}
                        unit="%"
                        allowDecimals
                      />
                      <Tooltip
                        contentStyle={{ fontSize: 12 }}
                        formatter={(value, name, item) => {
                          const row = item?.payload as {
                            lateCount?: number
                            shortCount?: number
                            missedCount?: number
                            assessedArrival?: number
                            assessedDuration?: number
                            visits?: number
                          }
                          const n = typeof value === 'number' ? value : Number(value)
                          if (name === 'Late %') {
                            return [
                              `${n}% (${row?.lateCount ?? 0}/${row?.assessedArrival ?? 0} assessed)`,
                              name,
                            ]
                          }
                          if (name === 'Short %') {
                            return [
                              `${n}% (${row?.shortCount ?? 0}/${row?.assessedDuration ?? 0} assessed)`,
                              name,
                            ]
                          }
                          return [
                            `${n}% (${row?.missedCount ?? 0}/${row?.visits ?? 0} visits)`,
                            name,
                          ]
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line
                        type="monotone"
                        dataKey="Late %"
                        stroke="#ea580c"
                        strokeWidth={2}
                        dot={{
                          r: 3,
                          cursor: 'pointer',
                          onClick: (pt: { payload?: { date?: string } }) => {
                            if (pt?.payload?.date) selectTrendDay(pt.payload.date, 'late')
                          },
                        }}
                        activeDot={{
                          r: 5,
                          cursor: 'pointer',
                          onClick: (_e: unknown, payload: { payload?: { date?: string } }) => {
                            if (payload?.payload?.date) {
                              selectTrendDay(payload.payload.date, 'late')
                            }
                          },
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Short %"
                        stroke="#0ea5e9"
                        strokeWidth={2}
                        dot={{
                          r: 3,
                          cursor: 'pointer',
                          onClick: (pt: { payload?: { date?: string } }) => {
                            if (pt?.payload?.date) selectTrendDay(pt.payload.date, 'short')
                          },
                        }}
                        activeDot={{
                          r: 5,
                          cursor: 'pointer',
                          onClick: (_e: unknown, payload: { payload?: { date?: string } }) => {
                            if (payload?.payload?.date) {
                              selectTrendDay(payload.payload.date, 'short')
                            }
                          },
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Missed %"
                        stroke="#b91c1c"
                        strokeWidth={2}
                        dot={{
                          r: 3,
                          cursor: 'pointer',
                          onClick: (pt: { payload?: { date?: string } }) => {
                            if (pt?.payload?.date) selectTrendDay(pt.payload.date, 'missed')
                          },
                        }}
                        activeDot={{
                          r: 5,
                          cursor: 'pointer',
                          onClick: (_e: unknown, payload: { payload?: { date?: string } }) => {
                            if (payload?.payload?.date) {
                              selectTrendDay(payload.payload.date, 'missed')
                            }
                          },
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

            <ChartCard
              title="2. Branch risk board"
              purpose="Use this to compare branches side by side and see which areas need the most follow-up."
              hint={`${branchMeta.sortLabel}. Click a bar to list visits for that branch.`}
            >
              <label className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                Metric
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                  value={branchMetric}
                  onChange={(e) => setBranchMetric(e.target.value as BranchMetric)}
                  data-testid="ecm-graph-branch-metric"
                >
                  <option value="latePct">Late %</option>
                  <option value="missedPct">Missed %</option>
                  <option value="shortPct">Short-visit %</option>
                  <option value="onTimePct">On-time %</option>
                  <option value="verifiedPct">Verified %</option>
                </select>
              </label>
              <div className="h-[280px] w-full min-w-0 overflow-hidden">
                {branchChartData.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No branch data in range.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={branchChartData}
                      layout="vertical"
                      margin={{ top: 4, right: 36, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={128}
                        tick={{ fontSize: 10 }}
                        interval={0}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: 12 }}
                        formatter={(value, _name, item) => {
                          const row = item?.payload as { n?: number; total?: number; name?: string }
                          const n = typeof value === 'number' ? value : Number(value)
                          return [
                            `${n}% (n=${row?.n ?? 0}${
                              row?.total != null && row.total !== row.n
                                ? ` of ${row.total} visits`
                                : ''
                            })`,
                            branchMeta.label,
                          ]
                        }}
                        labelFormatter={(_label, payload) => {
                          const row = payload?.[0]?.payload as { name?: string } | undefined
                          return row?.name ?? ''
                        }}
                      />
                      <Bar
                        dataKey="value"
                        fill={branchBarColor(branchMetric)}
                        radius={[0, 4, 4, 0]}
                        maxBarSize={22}
                        cursor="pointer"
                        onClick={(item) => {
                          const row = item as { name?: string }
                          if (!row.name) return
                          setDrill({
                            kind: 'branch',
                            name: row.name,
                            metric: branchMetric,
                            label: `${row.name} · ${branchMeta.label}`,
                          })
                        }}
                      >
                        <LabelList
                          dataKey="value"
                          position="right"
                          formatter={(v: number) => `${v}%`}
                          style={{ fontSize: 10, fill: 'currentColor' }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>
          </div>

          {/* Drill below first row — collapses empty chrome above fold */}
          <div
            ref={drillPanelRef}
            className={cn(
              'sticky top-2 z-20 rounded-lg border shadow-sm backdrop-blur-sm transition-colors',
              drill
                ? 'border-primary/40 bg-background/95 ring-1 ring-primary/20'
                : 'border-border bg-background/90',
            )}
            data-testid="ecm-graph-drill-panel"
          >
            <ChartCard
              title="Drill-down"
              purpose="Use this list to open the exact visits behind a chart click — triage, amend, or follow up from here."
              hint={
                drill
                  ? 'Visits for the selected series — open a row for detail.'
                  : 'Click any chart segment above to fill this list.'
              }
              className="border-0 bg-transparent shadow-none"
            >
              {!drill ? (
                <p className="py-2 text-sm text-muted-foreground">No series selected yet.</p>
              ) : (
                <DrillTable
                  title={drill.label}
                  visits={drilledVisits}
                  onClear={() => setDrill(null)}
                  onOpen={openVisit}
                />
              )}
            </ChartCard>
          </div>

          {/* 3–4: arrival + duration band mix */}
          <div className="grid gap-3 xl:grid-cols-2">
            <ChartCard
              title="3. Arrival band mix"
              purpose="Use this to see how carers arrived against plan — early, on time, or late."
              hint="Click a bar to list visits in that arrival band."
            >
              <div className="h-[280px] w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={arrivalChartData}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12 }}
                      formatter={(_v, _n, item) => {
                        const row = item?.payload as {
                          count?: number
                          assessedPct?: number | null
                          name?: string
                        }
                        if (row?.assessedPct != null) {
                          return [
                            `${row.count ?? 0} (${row.assessedPct}% of assessed)`,
                            row.name ?? 'Visits',
                          ]
                        }
                        return [row?.count ?? 0, row?.name ?? 'Visits']
                      }}
                    />
                    <Bar
                      dataKey="count"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={22}
                      cursor="pointer"
                      onClick={(item) => {
                        const row = item as { key?: string; name?: string }
                        if (!row.key) return
                        setDrill({
                          kind: 'arrivalBand',
                          band: row.key,
                          label: `Arrival · ${row.name ?? row.key}`,
                        })
                      }}
                    >
                      {arrivalChartData.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="4. Duration band mix"
              purpose="Use this to check whether visits ran the planned length, or finished too short or too long."
              hint="This is about visit length, not whether the carer arrived on time. Click a bar to drill."
            >
              <div className="h-[280px] w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={durationChartData}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12 }}
                      formatter={(_v, _n, item) => {
                        const row = item?.payload as {
                          count?: number
                          assessedPct?: number | null
                          name?: string
                        }
                        if (row?.assessedPct != null) {
                          return [
                            `${row.count ?? 0} (${row.assessedPct}% of assessed)`,
                            row.name ?? 'Visits',
                          ]
                        }
                        return [row?.count ?? 0, row?.name ?? 'Visits']
                      }}
                    />
                    <Bar
                      dataKey="count"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={22}
                      cursor="pointer"
                      onClick={(item) => {
                        const row = item as { key?: string; name?: string }
                        if (!row.key) return
                        setDrill({
                          kind: 'durationBand',
                          band: row.key,
                          label: `Duration · ${row.name ?? row.key}`,
                        })
                      }}
                    >
                      {durationChartData.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* 5: reasons */}
          <ChartCard
            title="5. Top exception reasons"
            purpose="Use this to see the most common reasons recorded when a visit goes wrong — so you know what to fix first."
            hint="Click a bar to list visits with that reason."
          >
            <div className="h-[300px] w-full min-w-0 overflow-hidden">
              {reasonChartData.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No exception reasons coded in this range yet.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={reasonChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12 }}
                      formatter={(_v, _n, item) => {
                        const row = item?.payload as {
                          count?: number
                          visitPct?: number
                          name?: string
                        }
                        return [
                          `${row?.count ?? 0} (${row?.visitPct ?? 0}% of visits)`,
                          row?.name ?? 'Visits',
                        ]
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#ea580c"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={20}
                      cursor="pointer"
                      onClick={(item) => {
                        const row = item as {
                          code?: string
                          name?: string
                          payload?: { code?: string; name?: string }
                        }
                        const code = row.code ?? row.payload?.code
                        const name = row.name ?? row.payload?.name
                        if (!code) return
                        setDrill({
                          kind: 'reason',
                          code,
                          label: `Reason · ${name ?? code}`,
                        })
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>

          {/* 6: heatmap (+ optional single-day status by hour) */}
          <div className={cn('grid gap-3', showStatusByHour && 'xl:grid-cols-2')}>
            <ChartCard
              title="6. Weekday × time hotspots"
              purpose="Use this to find which days of the week and times of day problems cluster — useful for rota and staffing changes."
              hint="Darker cells mean a higher exception rate. Click a cell to drill."
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-xs">
                  <thead>
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                        Time
                      </th>
                      {data.heatmap.weekdays.map((d) => (
                        <th
                          key={d}
                          className="px-1 py-1.5 text-center font-medium text-muted-foreground"
                        >
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.heatmap.bands.map((band) => (
                      <tr key={band.bandKey}>
                        <td className="whitespace-nowrap px-2 py-1 text-muted-foreground">
                          {band.bandLabel}
                        </td>
                        {band.rates.map((cell) => (
                          <td key={`${band.bandKey}-${cell.day}`} className="p-1">
                            <button
                              type="button"
                              disabled={cell.total === 0}
                              className={cn(
                                'w-full rounded px-1 py-2 text-center tabular-nums font-medium',
                                heatmapCellClass(cell.rate),
                                cell.total > 0
                                  ? 'cursor-pointer hover:ring-1 hover:ring-foreground/30'
                                  : 'cursor-default',
                              )}
                              title={
                                cell.total
                                  ? `${cell.exceptions}/${cell.total} exceptions — click to list`
                                  : 'No visits'
                              }
                              onClick={() => {
                                if (!cell.total) return
                                setDrill({
                                  kind: 'heatmapCell',
                                  weekday: cell.day,
                                  bandKey: band.bandKey,
                                  label: `${cell.day} · ${band.bandLabel}`,
                                })
                              }}
                            >
                              {cell.rate == null ? '—' : `${cell.rate}%`}
                            </button>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>

            {showStatusByHour ? (
              <ChartCard
                title="7. Today status by hour"
                purpose="Use this on a single day to see how planned visits stack by start hour — completed, in progress, or still open."
                hint="Only shown when the operational period is one day."
              >
                <div className="h-[300px] w-full min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={hourChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={1} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {data.visitStatusByHour.series.map((s) => (
                        <Bar
                          key={s.key}
                          dataKey={s.key}
                          name={STATUS_LABELS[s.key] ?? s.key}
                          stackId="status"
                          fill={STATUS_COLORS[s.key] ?? '#94a3b8'}
                          maxBarSize={28}
                          cursor="pointer"
                          onClick={(item) => {
                            const payload = item as { hour?: string }
                            const hourLabel = String(payload.hour ?? '')
                            const hourKey = hourLabel.slice(0, 2)
                            if (!hourKey) return
                            setDrill({
                              kind: 'hourStatus',
                              hourKey,
                              statusKey: s.key,
                              label: `${STATUS_LABELS[s.key] ?? s.key} · ${hourLabel}`,
                            })
                          }}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            ) : null}
          </div>
        </>
      )}

      <EcmVisitDetailDialog
        jobId={selectedJobId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  )
}

function DrillTable({
  title,
  visits,
  onClear,
  onOpen,
}: {
  title: string
  visits: EcmGraphDrillVisit[]
  onClear: () => void
  onOpen: (jobId: string) => void
}) {
  const shown = Math.min(visits.length, 50)
  const truncated = visits.length > 50
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">
          {title} ·{' '}
          {truncated
            ? `showing ${shown} of ${visits.length} visits`
            : `${visits.length} visit${visits.length === 1 ? '' : 's'}`}
        </p>
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={onClear}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {visits.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matching visits in this selection.</p>
      ) : (
        <div className="max-h-[320px] overflow-auto rounded-md border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5 font-medium">Service user</th>
                <th className="px-2 py-1.5 font-medium">Planned</th>
                <th className="px-2 py-1.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {visits.slice(0, 50).map((v) => (
                <tr key={v.scheduledJobId} className="border-t border-border">
                  <td className="px-2 py-1.5">
                    <p className="font-medium">{v.serviceUserName}</p>
                    <p className="text-xs text-muted-foreground">{v.jobName}</p>
                  </td>
                  <td className="px-2 py-1.5 tabular-nums text-xs text-muted-foreground">
                    {new Date(v.plannedStartDateTime).toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7"
                      onClick={() => onOpen(v.scheduledJobId)}
                    >
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
