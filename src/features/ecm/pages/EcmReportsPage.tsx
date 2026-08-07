import * as React from 'react'
import { FileBarChart2, Loader2, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { useEcmDailyOpsReport } from '@/features/ecm/hooks/useEcm'
import { useEcmOperationalPeriod } from '@/features/ecm/hooks/useEcmOperationalPeriod'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { EcmStatusBadge } from '@/features/ecm/components/EcmStatusBadge'
import { EcmOperationalPeriodCard } from '@/features/ecm/components/EcmOperationalPeriodCard'
import { formatPeriodDayShort } from '@/features/ecm/utils/ecm-operational-period.util'

export default function EcmReportsPage() {
  const { locationId } = useGlobalLocationScope()
  const period = useEcmOperationalPeriod('today')
  const report = useEcmDailyOpsReport(
    { dateFrom: period.dateFrom, dateTo: period.dateTo },
    true,
    { locationId: locationId ?? undefined },
  )

  const kpis = report.data?.kpis
  const punctuality = kpis?.punctuality
  const rangeLabel =
    period.dateFrom === period.dateTo
      ? formatPeriodDayShort(period.dateFrom)
      : `${formatPeriodDayShort(period.dateFrom)} – ${formatPeriodDayShort(period.dateTo)}`

  return (
    <div className="space-y-4 p-4 md:p-6" data-testid="ecm-reports-page">
      <PageHeader
        title="ECM reports"
        description="Operations and compliance KPIs with numerator, denominator, exclusions, and threshold version — same operational period as Live and Graphs."
        icon={<FileBarChart2 className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'ECM', href: '/ecm/live' },
          { label: 'Reports' },
        ]}
      />

      <EcmOperationalPeriodCard
        preset={period.preset}
        dateFrom={period.dateFrom}
        dateTo={period.dateTo}
        periodLabel={period.periodLabel}
        operationalToday={period.operationalToday}
        onPresetChange={period.setPreset}
        onApplyPreset={period.applyPreset}
        onDateFromChange={period.setDateFrom}
        onDateToChange={period.setDateTo}
        testIdPrefix="ecm-reports"
        footnote={<>KPIs for {rangeLabel}</>}
      >
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9"
          disabled={report.isFetching}
          onClick={() => void report.refetch()}
        >
          {report.isFetching ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
      </EcmOperationalPeriodCard>

      {report.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading report…</p>
      ) : report.isError ? (
        <p className="text-sm text-destructive">
          Could not load ECM report. Apply migrations and ensure ecm.reports.export permission.
        </p>
      ) : report.data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Punctuality</p>
              <p className="text-2xl font-semibold tabular-nums">
                {punctuality?.rate != null ? `${punctuality.rate}%` : '—'}
              </p>
              <p className="text-xs text-muted-foreground">
                {punctuality?.numerator}/{punctuality?.denominator}
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Late arrivals</p>
              <p className="text-2xl font-semibold tabular-nums">{kpis?.lateArrivals ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Potential / confirmed missed</p>
              <p className="text-2xl font-semibold tabular-nums">
                {kpis?.potentialMissed ?? 0} / {kpis?.confirmedMissed ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Total visits</p>
              <p className="text-2xl font-semibold tabular-nums">{kpis?.totalVisits ?? 0}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Service user</th>
                  <th className="px-3 py-2 font-medium">Job</th>
                  <th className="px-3 py-2 font-medium">Lifecycle</th>
                  <th className="px-3 py-2 font-medium">Arrival</th>
                  <th className="px-3 py-2 font-medium">Missed</th>
                  <th className="px-3 py-2 font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {report.data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                      No evaluations in this period.
                    </td>
                  </tr>
                ) : (
                  report.data.rows.map((row) => (
                    <tr key={row.scheduledJobId} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">{row.serviceUserName}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.jobName}</td>
                      <td className="px-3 py-2">
                        <EcmStatusBadge code={row.lifecycleStatus} kind="lifecycle" />
                      </td>
                      <td className="px-3 py-2">
                        <EcmStatusBadge code={row.arrivalClassification} kind="arrival" />
                      </td>
                      <td className="px-3 py-2">
                        <EcmStatusBadge code={row.missedClassification} kind="missed" />
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{row.confidence}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  )
}
