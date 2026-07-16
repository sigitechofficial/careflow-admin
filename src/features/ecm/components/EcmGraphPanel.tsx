import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2, RefreshCw } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { ContentCard } from '@/shared/ui/content-section'
import { useAuthStore } from '@/features/auth/store'
import { useEcmDailyOpsReport, useEcmLiveDashboard } from '@/features/ecm/hooks/useEcm'
import { EcmHealthBanner } from '@/features/ecm/components/EcmHealthBanner'
import type { EcmDashboardBucket, EcmLiveVisitRow } from '@/features/ecm/types/ecm.types'

const BUCKET_META: {
  id: EcmDashboardBucket
  label: string
  color: string
}[] = [
  { id: 'dueNow', label: 'Due now', color: '#f59e0b' },
  { id: 'startingSoon', label: 'Starting soon', color: '#64748b' },
  { id: 'inProgress', label: 'In progress', color: '#16a34a' },
  { id: 'lateArrival', label: 'Late', color: '#ea580c' },
  { id: 'veryLateArrival', label: 'Very late', color: '#dc2626' },
  { id: 'potentialMissed', label: 'Potential missed', color: '#d97706' },
  { id: 'confirmedMissed', label: 'Confirmed missed', color: '#b91c1c' },
  { id: 'missingCheckout', label: 'Missing checkout', color: '#ca8a04' },
  { id: 'outsideGeofence', label: 'Outside geofence', color: '#c2410c' },
  { id: 'manualAttendance', label: 'Manual', color: '#475569' },
]

const ARRIVAL_COLORS: Record<string, string> = {
  EARLY_ARRIVAL: '#0ea5e9',
  ON_TIME: '#16a34a',
  LATE_ARRIVAL: '#ea580c',
  VERY_LATE_ARRIVAL: '#dc2626',
  NOT_ASSESSED: '#94a3b8',
}

const MISSED_COLORS: Record<string, string> = {
  NONE: '#16a34a',
  POTENTIAL_MISSED: '#d97706',
  ATTENDANCE_VERIFICATION_PENDING: '#ca8a04',
  CONFIRMED_MISSED: '#b91c1c',
  FALSE_ECM_ALERT: '#64748b',
  DISPUTED: '#7c3aed',
}

function todayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function humanizeCode(code: string): string {
  return code
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ')
}

function countByField(
  visits: EcmLiveVisitRow[],
  field: 'arrivalClassification' | 'missedClassification',
  colorMap: Record<string, string>,
): { name: string; value: number; color: string; code: string }[] {
  const tally = new Map<string, number>()
  for (const v of visits) {
    const code = String(v[field] ?? 'NOT_ASSESSED').toUpperCase()
    tally.set(code, (tally.get(code) ?? 0) + 1)
  }
  return [...tally.entries()]
    .map(([code, value]) => ({
      code,
      name: humanizeCode(code),
      value,
      color: colorMap[code] ?? '#94a3b8',
    }))
    .sort((a, b) => b.value - a.value)
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}

export function EcmGraphPanel() {
  const [date, setDate] = React.useState(todayIso)
  const canReports = useAuthStore(
    (s) => s.can('ecm.reports.export') || s.can('ecm.read'),
  )

  const dashboard = useEcmLiveDashboard({ date })
  const dailyOps = useEcmDailyOpsReport(date, canReports)

  const counts = dashboard.data?.counts
  const visits = dashboard.data?.visits ?? []

  const bucketBarData = React.useMemo(
    () =>
      BUCKET_META.map((b) => ({
        id: b.id,
        name: b.label,
        value: counts?.[b.id] ?? 0,
        color: b.color,
      })),
    [counts],
  )

  const bucketPieData = React.useMemo(
    () => bucketBarData.filter((d) => d.value > 0),
    [bucketBarData],
  )

  const arrivalData = React.useMemo(
    () => countByField(visits, 'arrivalClassification', ARRIVAL_COLORS),
    [visits],
  )

  const missedData = React.useMemo(
    () => countByField(visits, 'missedClassification', MISSED_COLORS),
    [visits],
  )

  const kpis = dailyOps.data?.kpis
  const punctuality = kpis?.punctuality

  const kpiBarData = React.useMemo(() => {
    if (!kpis) return []
    return [
      { name: 'Late arrivals', value: kpis.lateArrivals ?? 0, color: '#ea580c' },
      {
        name: 'Potential missed',
        value: kpis.potentialMissed ?? 0,
        color: '#d97706',
      },
      {
        name: 'Confirmed missed',
        value: kpis.confirmedMissed ?? 0,
        color: '#b91c1c',
      },
      {
        name: 'Manual attendance',
        value: kpis.manualAttendance ?? 0,
        color: '#475569',
      },
    ]
  }, [kpis])

  return (
    <div className="space-y-4" data-testid="ecm-graph-panel">
      <EcmHealthBanner />

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Operational date</span>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 w-[11rem]"
            data-testid="ecm-graph-date"
          />
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          disabled={dashboard.isFetching}
          onClick={() => {
            void dashboard.refetch()
            if (canReports) void dailyOps.refetch()
          }}
        >
          {dashboard.isFetching ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-9" asChild>
          <Link to="/ecm/live" search={{ date }}>
            Open live table
          </Link>
        </Button>
      </div>

      {dashboard.isLoading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading ECM graphs…
        </div>
      ) : dashboard.isError ? (
        <p className="py-8 text-sm text-destructive">
          Could not load ECM live data for graphs. Check API permissions and that the ECM migration
          is applied.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {counts?.total ?? visits.length} visits · refreshed{' '}
            {dashboard.data?.refreshedAt
              ? new Date(dashboard.data.refreshedAt).toLocaleTimeString()
              : '—'}
            {' · '}
            Auto-refresh every 60s
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            <ContentCard className="space-y-3 p-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Operational buckets</h3>
                <p className="text-xs text-muted-foreground">
                  Absolute visit counts per live monitoring bucket for {date}.
                </p>
              </div>
              {(counts?.total ?? 0) === 0 ? (
                <ChartEmpty message="No visits for this date." />
              ) : (
                <div className="h-[320px] w-full min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={bucketBarData}
                      layout="vertical"
                      margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={118}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value) => {
                          const n = typeof value === 'number' ? value : Number(value)
                          return [Number.isFinite(n) ? n : 0, 'Visits']
                        }}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
                        {bucketBarData.map((entry) => (
                          <Cell key={entry.id} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ContentCard>

            <ContentCard className="space-y-3 p-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Bucket share</h3>
                <p className="text-xs text-muted-foreground">
                  Distribution of non-zero buckets (a visit can appear in more than one bucket).
                </p>
              </div>
              {bucketPieData.length === 0 ? (
                <ChartEmpty message="No bucket activity for this date." />
              ) : (
                <div className="h-[320px] w-full min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={bucketPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="46%"
                        outerRadius={100}
                        paddingAngle={1}
                        startAngle={90}
                        endAngle={-270}
                      >
                        {bucketPieData.map((entry) => (
                          <Cell key={entry.id} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => {
                          const n = typeof value === 'number' ? value : Number(value)
                          const label = typeof name === 'string' ? name : String(name ?? '')
                          return [`${Number.isFinite(n) ? n : 0}`, label]
                        }}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={56}
                        wrapperStyle={{ fontSize: 11 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ContentCard>

            <ContentCard className="space-y-3 p-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Arrival classification</h3>
                <p className="text-xs text-muted-foreground">
                  How visits on this day were classified for arrival punctuality.
                </p>
              </div>
              {arrivalData.length === 0 ? (
                <ChartEmpty message="No arrival classifications." />
              ) : (
                <div className="h-[260px] w-full min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={arrivalData}
                      margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={56} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                        {arrivalData.map((entry) => (
                          <Cell key={entry.code} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ContentCard>

            <ContentCard className="space-y-3 p-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Missed visit status</h3>
                <p className="text-xs text-muted-foreground">
                  Missed / verification outcomes across the day&apos;s live evaluations.
                </p>
              </div>
              {missedData.length === 0 ? (
                <ChartEmpty message="No missed classifications." />
              ) : (
                <div className="h-[260px] w-full min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={missedData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="46%"
                        innerRadius={48}
                        outerRadius={90}
                        paddingAngle={1}
                        startAngle={90}
                        endAngle={-270}
                      >
                        {missedData.map((entry) => (
                          <Cell key={entry.code} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Legend
                        verticalAlign="bottom"
                        height={48}
                        wrapperStyle={{ fontSize: 11 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ContentCard>
          </div>

          {canReports ? (
            <ContentCard className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Daily operations KPIs</h3>
                  <p className="text-xs text-muted-foreground">
                    Report metrics for the same operational date
                    {punctuality?.rate != null ? ` · punctuality ${punctuality.rate}%` : ''}.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" asChild>
                  <Link to="/ecm/reports">Open reports</Link>
                </Button>
              </div>
              {dailyOps.isLoading ? (
                <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading KPI chart…
                </div>
              ) : dailyOps.isError ? (
                <p className="text-sm text-muted-foreground">
                  Daily ops KPIs unavailable for this date (reports permission or data missing).
                </p>
              ) : kpiBarData.length === 0 ? (
                <ChartEmpty message="No KPI figures for this date." />
              ) : (
                <div className="h-[240px] w-full min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={kpiBarData}
                      margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
                        {kpiBarData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ContentCard>
          ) : null}
        </>
      )}
    </div>
  )
}
