import * as React from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Loader2, RefreshCw, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { ContentCard } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'
import { useEcmGraphDashboard } from '@/features/ecm/hooks/useEcm'
import { useEcmOperationalPeriod } from '@/features/ecm/hooks/useEcmOperationalPeriod'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { EcmVisitDetailDialog } from '@/features/ecm/components/EcmVisitDetailDialog'
import { EcmOperationalPeriodCard } from '@/features/ecm/components/EcmOperationalPeriodCard'
import type { EcmGraphDrillVisit } from '@/features/ecm/api/ecm.api'

export type EcmGraphScheduleAreaOption = {
  id: string
  name: string
}

export type EcmGraphFirstDashboardProps = {
  scheduleAreaId: string
  onScheduleAreaIdChange: (id: string) => void
  scopedAreas: EcmGraphScheduleAreaOption[]
}

type DrillFilter =
  | { kind: 'hourStatus'; hourKey: string; statusKey: string; label: string }
  | { kind: 'arrivalBand'; band: string; label: string }
  | { kind: 'durationBand'; band: string; label: string }
  | { kind: 'reason'; code: string; label: string }
  | { kind: 'branch'; name: string; label: string }

type BranchMetric = 'onTimePct' | 'latePct' | 'missedPct' | 'shortPct' | 'verifiedPct'

const STATUS_LABELS: Record<string, string> = {
  // Key kept for API compatibility; includes completed early + on-time arrivals.
  completedOnTime: 'Completed',
  inProgress: 'In progress',
  late: 'Late',
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
  not_assessed: '#64748b',
}

/** Classification SSOT — matches graph-dashboard durationVariance keys. */
const DURATION_LABELS: Record<string, string> = {
  short: 'Short visit',
  on_time: 'On time',
  long: 'Long visit',
  excessive: 'Excessive overrun',
  not_assessed: 'Not assessed',
}

const DURATION_COLORS: Record<string, string> = {
  short: '#dc2626',
  on_time: '#16a34a',
  long: '#f59e0b',
  excessive: '#c2410c',
  not_assessed: '#64748b',
}

const VERIFY_COLORS = ['#16a34a', '#0ea5e9', '#64748b', '#ea580c', '#dc2626', '#7c3aed', '#94a3b8']

function inclusiveDayCount(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00.000Z`)
  const b = Date.parse(`${to}T00:00:00.000Z`)
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0
  return Math.round((b - a) / 86_400_000) + 1
}

function heatmapCellClass(rate: number | null): string {
  if (rate == null) return 'bg-muted/40 text-muted-foreground'
  if (rate === 0) return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
  if (rate < 10) return 'bg-emerald-500/25 text-emerald-900 dark:text-emerald-100'
  if (rate < 20) return 'bg-amber-500/25 text-amber-900 dark:text-amber-100'
  if (rate < 35) return 'bg-orange-500/30 text-orange-950 dark:text-orange-100'
  return 'bg-red-500/35 text-red-950 dark:text-red-100'
}

function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <ContentCard className={cn('space-y-3 p-4', className)}>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </ContentCard>
  )
}

export function EcmGraphFirstDashboard({
  scheduleAreaId,
  onScheduleAreaIdChange,
  scopedAreas,
}: EcmGraphFirstDashboardProps) {
  const { locationId: globalLocationId } = useGlobalLocationScope()
  const period = useEcmOperationalPeriod('today')
  const {
    preset,
    dateFrom,
    dateTo,
    periodLabel,
    operationalToday,
    setPreset,
    setDateFrom,
    setDateTo,
    applyPreset,
  } = period
  const [branchMetric, setBranchMetric] = React.useState<BranchMetric>('onTimePct')
  const [drill, setDrill] = React.useState<DrillFilter | null>(null)
  const [selectedJobId, setSelectedJobId] = React.useState<string | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const drillPanelRef = React.useRef<HTMLDivElement>(null)

  const dashboard = useEcmGraphDashboard({
    dateFrom,
    dateTo,
    scheduleAreaId: scheduleAreaId || undefined,
    locationId: globalLocationId ?? undefined,
  })

  const data = dashboard.data
  const effectiveFrom = data?.dateFrom ?? dateFrom
  const effectiveTo = data?.dateTo ?? dateTo
  const daySpan = inclusiveDayCount(effectiveFrom, effectiveTo)

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
    if (!data) return []
    return data.exceptionTrend.dates.map((date, i) => ({
      date: date.slice(5),
      Late: data.exceptionTrend.series.late[i] ?? 0,
      'Very late': data.exceptionTrend.series.veryLate[i] ?? 0,
      Short: data.exceptionTrend.series.short[i] ?? 0,
      Missed: data.exceptionTrend.series.missed[i] ?? 0,
      'Missing checkout': data.exceptionTrend.series.missingCheckout[i] ?? 0,
      'No access': data.exceptionTrend.series.noAccess[i] ?? 0,
    }))
  }, [data])

  const arrivalChartData = React.useMemo(() => {
    if (!data) return []
    return data.arrivalPunctuality.map((b) => ({
      key: b.key,
      name: ARRIVAL_LABELS[b.key] ?? b.key,
      count: b.count,
      color: ARRIVAL_COLORS[b.key] ?? '#94a3b8',
    }))
  }, [data])

  const durationChartData = React.useMemo(() => {
    if (!data) return []
    return data.durationVariance.map((b) => {
      const short = b.key === 'short'
      const signed = short ? -b.count : b.count
      return {
        key: b.key,
        name: DURATION_LABELS[b.key] ?? b.key,
        value: signed,
        abs: b.count,
        color: DURATION_COLORS[b.key] ?? '#94a3b8',
      }
    })
  }, [data])

  const branchChartData = React.useMemo(() => {
    if (!data) return []
    return [...data.branchComparison]
      .sort((a, b) => b[branchMetric] - a[branchMetric])
      .slice(0, 12)
      .map((b) => ({
        name: b.name,
        value: b[branchMetric],
        total: b.total,
      }))
  }, [branchMetric, data])

  const reasonChartData = React.useMemo(() => {
    if (!data) return []
    return data.exceptionReasons.slice(0, 12).map((r) => ({
      name: r.label,
      code: r.code,
      count: r.count,
    }))
  }, [data])

  const verificationPie = React.useMemo(() => {
    if (!data) return []
    return data.verificationMethod.map((v, i) => ({
      name: v.label,
      value: v.value,
      color: VERIFY_COLORS[i % VERIFY_COLORS.length],
    }))
  }, [data])

  const manualLineData = React.useMemo(() => {
    if (!data) return []
    return data.manualTrend.dates.map((date, i) => ({
      date: date.slice(5),
      Manual: data.manualTrend.manual[i] ?? 0,
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
      if (drill.kind === 'branch') return (v.branchName ?? 'Unassigned area') === drill.name
      if (drill.kind === 'reason') {
        return (v.reasonCodes ?? []).includes(drill.code)
      }
      return false
    })
  }, [data, drill])

  const openVisit = (jobId: string) => {
    setSelectedJobId(jobId)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-4" data-testid="ecm-graph-first-dashboard">
      <div>
        <h2 className="text-base font-semibold text-foreground">Graphs</h2>
        <p className="text-xs text-muted-foreground">
          Click a chart series to list matching visits below.
        </p>
      </div>

      <EcmOperationalPeriodCard
        preset={preset}
        dateFrom={dateFrom}
        dateTo={dateTo}
        periodLabel={periodLabel}
        operationalToday={operationalToday}
        onPresetChange={setPreset}
        onApplyPreset={applyPreset}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        testIdPrefix="ecm-graph"
        footnote={
          <>
            {daySpan > 0 ? `${daySpan} day${daySpan === 1 ? '' : 's'} inclusive` : null}
            {scheduleAreaId
              ? ` · ${scopedAreas.find((a) => a.id === scheduleAreaId)?.name ?? 'Selected area'}`
              : ' · All areas'}
            {' · '}
            ISO {effectiveFrom}
            {effectiveFrom !== effectiveTo ? ` → ${effectiveTo}` : ''}
          </>
        }
      >
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Schedule area</span>
          <select
            className="flex h-9 w-[12rem] rounded-md border border-input bg-background px-2 text-sm"
            value={scheduleAreaId}
            onChange={(e) => onScheduleAreaIdChange(e.target.value)}
            data-testid="ecm-graph-area"
          >
            <option value="">All areas</option>
            {scopedAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9"
          disabled={dashboard.isFetching}
          onClick={() => void dashboard.refetch()}
        >
          {dashboard.isFetching ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
      </EcmOperationalPeriodCard>

      {dashboard.isLoading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading graph dashboard…
        </div>
      ) : dashboard.isError || !data ? (
        <p className="text-sm text-destructive">
          Could not load graph analytics. Restart the API after pulling BE1.43
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
              ? ` · showing first ${(data.rowCap ?? data.visitCount).toLocaleString()} of ${data.totalMatching.toLocaleString()} (narrow period or area for full coverage)`
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
              matching this filter. Totals and drills may under-count until you narrow the period,
              location, or schedule area.
            </p>
          ) : null}

          {/* Sticky drill — always visible while scrolling charts */}
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
              subtitle={
                drill
                  ? 'Visits for the selected series — open a row for detail'
                  : 'Click a chart segment (arrival, duration, branch, reason, or hour status) to list visits here'
              }
              className="border-0 bg-transparent shadow-none"
            >
              {!drill ? (
                <p className="py-2 text-sm text-muted-foreground">
                  No series selected yet.
                </p>
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

          {/* 1–2: exception trend + branch */}
          <div className="grid gap-3 xl:grid-cols-2">
            <ChartCard
              title="1. Late, short and missed trend"
              subtitle="Primary management trend — is performance improving?"
            >
              <div className="h-[280px] w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trendChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="Late" stroke="#ea580c" strokeWidth={2} dot={false} />
                    <Line
                      type="monotone"
                      dataKey="Very late"
                      stroke="#dc2626"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line type="monotone" dataKey="Short" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Missed" stroke="#b91c1c" strokeWidth={2} dot={false} />
                    <Line
                      type="monotone"
                      dataKey="Missing checkout"
                      stroke="#ca8a04"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="No access"
                      stroke="#64748b"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="2. Branch comparison"
              subtitle="On-time % uses arrivalClassification.ON_TIME (same SSOT as chart 3)"
            >
              <label className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                Metric
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                  value={branchMetric}
                  onChange={(e) => setBranchMetric(e.target.value as BranchMetric)}
                >
                  <option value="onTimePct">On-time %</option>
                  <option value="latePct">Late %</option>
                  <option value="missedPct">Missed %</option>
                  <option value="shortPct">Short-visit %</option>
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
                      margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Bar
                        dataKey="value"
                        fill="#16a34a"
                        radius={[0, 4, 4, 0]}
                        maxBarSize={22}
                        cursor="pointer"
                        onClick={(item) => {
                          const row = item as { name?: string }
                          if (!row.name) return
                          setDrill({
                            kind: 'branch',
                            name: row.name,
                            label: `Branch · ${row.name}`,
                          })
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>
          </div>

          {/* 3–4: arrival + duration (classification SSOT) */}
          <div className="grid gap-3 xl:grid-cols-2">
            <ChartCard
              title="3. Arrival punctuality"
              subtitle="Evaluation arrivalClassification bands — click a bar to drill"
            >
              <div className="h-[280px] w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={arrivalChartData} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 9 }}
                      interval={0}
                      angle={-28}
                      textAnchor="end"
                      height={56}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Bar
                      dataKey="count"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={36}
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
              title="4. Duration compliance"
              subtitle="Evaluation durationClassification — short left (negative), others right"
            >
              <div className="h-[280px] w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={durationChartData}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip
                      formatter={(_v, _n, item) => {
                        const row = item?.payload as { abs?: number; name?: string }
                        return [row?.abs ?? 0, row?.name ?? 'Visits']
                      }}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar
                      dataKey="value"
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
            title="5. Exception reasons"
            subtitle="Distinct codes per visit — click a bar to list matching visits"
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
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
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

          {/* 6–7: heatmap + status by hour (demoted) */}
          <div className="grid gap-3 xl:grid-cols-2">
            <ChartCard
              title="6. Day and time exception heatmap"
              subtitle="Exception rate by weekday × time band (empty cells are neutral)"
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
                            <div
                              className={cn(
                                'rounded px-1 py-2 text-center tabular-nums font-medium',
                                heatmapCellClass(cell.rate),
                              )}
                              title={`${cell.exceptions}/${cell.total} exceptions`}
                            >
                              {cell.rate == null ? '—' : `${cell.rate}%`}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>

            <ChartCard
              title="7. Visit status by hour"
              subtitle="Stacked by planned start hour — strongest for a single day"
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
          </div>

          {/* 8–9: quality */}
          <div className="grid gap-3 xl:grid-cols-2">
            <ChartCard
              title="8. Attendance confidence"
              subtitle="Confidence enum mix — not check-in channel"
            >
              <div className="h-[280px] w-full min-w-0 overflow-hidden">
                {verificationPie.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No confidence data.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                      <Pie
                        data={verificationPie}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="42%"
                        innerRadius={52}
                        outerRadius={88}
                        paddingAngle={1}
                      >
                        {verificationPie.map((entry, i) => (
                          <Cell key={entry.name} fill={entry.color ?? VERIFY_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        wrapperStyle={{ fontSize: 11 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

            <ChartCard
              title="9. Manual attendance trend"
              subtitle="Rising manual entries can signal app or training issues"
            >
              <div className="h-[280px] w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={manualLineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="Manual"
                      stroke="#475569"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
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
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">
          {title} · {visits.length} visit{visits.length === 1 ? '' : 's'}
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
