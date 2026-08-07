import * as React from 'react'
import { Download, FileBarChart2, Loader2, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { ContentCard, ContentSectionHeader } from '@/shared/ui/content-section'
import { useAuthStore } from '@/features/auth/store'
import { useEcmComplianceReport, useEcmDailyOpsReport } from '@/features/ecm/hooks/useEcm'
import { useEcmOperationalPeriod } from '@/features/ecm/hooks/useEcmOperationalPeriod'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { flattenLocationOptionsFromTree } from '@/features/locations/utils/flatten-location-options.util'
import { useLocationManagementTree } from '@/features/settings/hooks/useLocationManagement'
import { useScheduleAreas } from '@/features/scheduling/hooks/useScheduling'
import { EcmStatusBadge } from '@/features/ecm/components/EcmStatusBadge'
import { EcmOperationalPeriodCard } from '@/features/ecm/components/EcmOperationalPeriodCard'
import { formatPeriodDayShort } from '@/features/ecm/utils/ecm-operational-period.util'
import { buildEcmMethodBreakdown, formatPct } from '@/features/ecm/utils/ecm-compliance-overview.util'
import {
  buildArrivalClassificationTable,
  buildDurationClassificationTable,
  buildExceptionRegisterCsv,
  buildReportSummaryCsv,
  carerLabel,
  downloadTextFile,
  exceptionReasonsLabel,
  formatGeneratedAt,
  formatPlannedStart,
  resolveExceptionRegister,
} from '@/features/ecm/utils/ecm-reports-pack.util'
import { cn } from '@/shared/lib/utils'

function MetricCell({
  label,
  value,
  detail,
  testId,
}: {
  label: string
  value: React.ReactNode
  detail?: React.ReactNode
  testId?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3" data-testid={testId}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {detail ? <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  )
}

function ClassificationTable({
  title,
  footnote,
  rows,
  testId,
}: {
  title: string
  footnote?: string
  rows: Array<{ key: string; label: string; count: number; denominator: number; percent: number }>
  testId: string
}) {
  return (
    <ContentCard className="space-y-3 p-4" data-testid={testId}>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {footnote ? <p className="mt-0.5 text-xs text-muted-foreground">{footnote}</p> : null}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="pb-2 font-medium">Classification</th>
            <th className="pb-2 font-medium">n</th>
            <th className="pb-2 font-medium">d</th>
            <th className="pb-2 font-medium">%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-border/60 last:border-0">
              <td className="py-2">{row.label}</td>
              <td className="py-2 tabular-nums">{row.count.toLocaleString()}</td>
              <td className="py-2 tabular-nums text-muted-foreground">
                {row.denominator.toLocaleString()}
              </td>
              <td className="py-2 tabular-nums">{formatPct(row.percent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ContentCard>
  )
}

export default function EcmReportsPage() {
  const canExport = useAuthStore((s) => s.can('ecm.reports.export'))
  const { locationId: globalLocationId, isScoped: globalLocationScoped } =
    useGlobalLocationScope()
  const period = useEcmOperationalPeriod('today')
  const [scheduleAreaId, setScheduleAreaId] = React.useState('')

  const areasQuery = useScheduleAreas()
  const locationTreeQuery = useLocationManagementTree()
  const locationOptions = React.useMemo(
    () => flattenLocationOptionsFromTree(locationTreeQuery.data),
    [locationTreeQuery.data],
  )
  const scopedAreas = React.useMemo(() => {
    const areas = areasQuery.data ?? []
    if (!globalLocationId) return areas
    return areas.filter((a) => a.location?.id === globalLocationId)
  }, [areasQuery.data, globalLocationId])

  React.useEffect(() => {
    if (!scheduleAreaId) return
    if (globalLocationScoped && !scopedAreas.some((a) => a.id === scheduleAreaId)) {
      setScheduleAreaId('')
    }
  }, [globalLocationScoped, scopedAreas, scheduleAreaId])

  const scopeParams = React.useMemo(
    () => ({
      scheduleAreaId: scheduleAreaId || undefined,
      locationId: globalLocationId ?? undefined,
    }),
    [scheduleAreaId, globalLocationId],
  )

  const report = useEcmDailyOpsReport(
    { dateFrom: period.dateFrom, dateTo: period.dateTo },
    true,
    scopeParams,
  )
  const compliance = useEcmComplianceReport(
    { dateFrom: period.dateFrom, dateTo: period.dateTo },
    Boolean(report.data),
    scopeParams,
  )

  const data = report.data
  const kpis = data?.kpis
  const punctuality = kpis?.punctuality
  const exclusions = punctuality?.exclusions ?? {}
  const electronic = kpis?.electronicMonitoring
  const method = kpis ? buildEcmMethodBreakdown(kpis) : null
  const integrity = data?.integrity ?? compliance.data?.integrity
  const openExceptions = compliance.data?.openExceptions
  const timezone = data?.operationalTimezone ?? 'Europe/London'
  const thresholdVersion = data?.thresholdVersion ?? '—'

  const exceptionRows = React.useMemo(
    () => (data ? resolveExceptionRegister(data) : []),
    [data],
  )
  const arrivalTable = React.useMemo(
    () => (data ? buildArrivalClassificationTable(data) : []),
    [data],
  )
  const durationTable = React.useMemo(
    () => (data ? buildDurationClassificationTable(data) : []),
    [data],
  )

  const rangeLabel =
    period.dateFrom === period.dateTo
      ? formatPeriodDayShort(period.dateFrom)
      : `${formatPeriodDayShort(period.dateFrom)} – ${formatPeriodDayShort(period.dateTo)}`

  const areaLabel = scheduleAreaId
    ? (scopedAreas.find((a) => a.id === scheduleAreaId)?.name ?? 'Selected area')
    : 'All schedule areas'
  const locationLabel = globalLocationId
    ? (locationOptions.find((o) => o.id === globalLocationId)?.label ?? 'Selected location')
    : 'All locations'

  const fileStem = `ecm-report-${period.dateFrom}_${period.dateTo}`

  const onExportSummary = () => {
    if (!data || !canExport) return
    downloadTextFile(`${fileStem}-summary.csv`, buildReportSummaryCsv(data))
  }

  const onExportExceptions = () => {
    if (!canExport) return
    downloadTextFile(`${fileStem}-exceptions.csv`, buildExceptionRegisterCsv(exceptionRows))
  }

  const refetchAll = () => {
    void report.refetch()
    void compliance.refetch()
  }

  return (
    <div className="space-y-4 p-4 md:p-6" data-testid="ecm-reports-page">
      <PageHeader
        title="ECM reports"
        description="Authoritative period pack for audit and commissioners — stable definitions, n/d rates, threshold version, exclusions, and exportable exception register. Same operational period as Live and Graphs."
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
        operationalTimezone={timezone}
        onPresetChange={period.setPreset}
        onApplyPreset={period.applyPreset}
        onDateFromChange={period.setDateFrom}
        onDateToChange={period.setDateTo}
        testIdPrefix="ecm-reports"
        footnote={
          <>
            Report pack for {rangeLabel}
            {' · '}
            {areaLabel}
            {' · '}
            Ops day {timezone}
          </>
        }
      >
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Schedule area</span>
          <select
            className="flex h-9 w-[12rem] rounded-md border border-input bg-background px-2 text-sm"
            value={scheduleAreaId}
            onChange={(e) => setScheduleAreaId(e.target.value)}
            data-testid="ecm-reports-area"
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
          disabled={report.isFetching}
          onClick={refetchAll}
        >
          {report.isFetching ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
        {canExport ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9"
              disabled={!data}
              onClick={onExportSummary}
              data-testid="ecm-reports-export-summary"
            >
              <Download className="mr-2 h-3.5 w-3.5" />
              Summary CSV
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9"
              disabled={!data}
              onClick={onExportExceptions}
              data-testid="ecm-reports-export-exceptions"
            >
              <Download className="mr-2 h-3.5 w-3.5" />
              Exceptions CSV
            </Button>
          </>
        ) : null}
      </EcmOperationalPeriodCard>

      {report.isLoading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading report pack…
        </div>
      ) : report.isError ? (
        <p className="text-sm text-destructive">
          Could not load ECM report. Apply migrations and ensure you have `ecm.read` access.
        </p>
      ) : data && kpis ? (
        <>
          <ContentCard className="space-y-3 p-4" data-testid="ecm-reports-header">
            <ContentSectionHeader
              titleAs="h2"
              title="Report header"
              description="Scope and rule version for this pack — suitable for inspection evidence."
            />
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Period</dt>
                <dd className="font-medium">
                  {rangeLabel}
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({period.dateFrom}
                    {period.dateFrom !== period.dateTo ? ` → ${period.dateTo}` : ''})
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Location scope</dt>
                <dd className="font-medium">{locationLabel}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Schedule area</dt>
                <dd className="font-medium">{areaLabel}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Operational timezone</dt>
                <dd className="font-medium">{timezone}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Threshold version</dt>
                <dd className="font-medium tabular-nums" data-testid="ecm-reports-threshold">
                  {thresholdVersion}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Generated at</dt>
                <dd className="font-medium">{formatGeneratedAt(data.refreshedAt)}</dd>
              </div>
            </dl>
            {data.definitions?.punctuality ? (
              <p className="text-xs text-muted-foreground border-t border-border pt-3">
                {data.definitions.punctuality}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground border-t border-border pt-3">
                Punctuality = ON_TIME arrivals ÷ (total − confirmed missed). Same
                arrivalClassification SSOT as Graphs. Early is not on-time.
              </p>
            )}
          </ContentCard>

          <section className="space-y-3" data-testid="ecm-reports-executive">
            <ContentSectionHeader
              titleAs="h2"
              title="Executive compliance summary"
              description="Period totals with numerators and denominators — not a live ops queue."
            />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCell
                label="Electronic monitoring"
                value={
                  electronic?.rate != null
                    ? `${electronic.rate}%`
                    : method
                      ? formatPct(method.electronicPercent)
                      : '—'
                }
                detail={`${electronic?.numerator ?? method?.electronic ?? 0}/${electronic?.denominator ?? method?.total ?? 0} electronic`}
                testId="ecm-reports-kpi-electronic"
              />
              <MetricCell
                label="Punctuality (on time)"
                value={punctuality?.rate != null ? `${punctuality.rate}%` : '—'}
                detail={`${punctuality?.numerator ?? 0}/${punctuality?.denominator ?? 0} · excl. confirmed missed ${exclusions.confirmedMissed ?? 0}`}
                testId="ecm-reports-kpi-punctuality"
              />
              <MetricCell
                label="Late / very late"
                value={kpis.lateArrivals}
                detail={`Early ${kpis.earlyArrivals ?? 0} · Short ${kpis.shortVisits ?? 0}`}
              />
              <MetricCell
                label="Missed visits"
                value={`${kpis.potentialMissed} / ${kpis.confirmedMissed}`}
                detail="Potential / confirmed"
              />
              <MetricCell
                label="Geofence breaches"
                value={kpis.geofenceBreaches ?? 0}
                detail={`Manual attendance ${kpis.manualAttendance}`}
              />
              <MetricCell
                label="Exclusions (punctuality)"
                value={
                  (Number(exclusions.confirmedMissed) || 0) +
                  (Number(exclusions.falseEcmAlerts) || 0) +
                  (Number(exclusions.disputed) || 0)
                }
                detail={`Missed ${exclusions.confirmedMissed ?? 0} · False alert ${exclusions.falseEcmAlerts ?? 0} · Disputed ${exclusions.disputed ?? 0}`}
              />
              <MetricCell
                label="Exception register"
                value={kpis.exceptionRegisterCount ?? exceptionRows.length}
                detail={`${kpis.totalVisits.toLocaleString()} total evaluations`}
              />
              <MetricCell
                label="Open exceptions (workflow)"
                value={openExceptions ?? '—'}
                detail={
                  compliance.isLoading
                    ? 'Loading…'
                    : compliance.isError
                      ? 'Unavailable'
                      : 'Unresolved exception cases in period'
                }
              />
            </div>
          </section>

          <section className="space-y-3" data-testid="ecm-reports-classifications">
            <ContentSectionHeader
              titleAs="h2"
              title="Punctuality & duration"
              description="Counts by classification enum — aligned with Graphs arrival/duration SSOT (not Live’s completed-only rate)."
            />
            <div className="grid gap-3 lg:grid-cols-2">
              <ClassificationTable
                title="Arrival classification"
                footnote="Source: arrivalClassification"
                rows={arrivalTable}
                testId="ecm-reports-arrival-table"
              />
              <ClassificationTable
                title="Duration classification"
                footnote="Source: durationClassification — planned duration ≠ arrival on-time"
                rows={durationTable}
                testId="ecm-reports-duration-table"
              />
            </div>
          </section>

          <section className="space-y-3" data-testid="ecm-reports-verification">
            <ContentSectionHeader
              titleAs="h2"
              title="Verification & ECM method"
              description="Evidence quality for the period — electronic vs manual and attendance confidence."
            />
            <div className="grid gap-3 lg:grid-cols-2">
              <ContentCard className="space-y-2 p-4">
                <h3 className="text-sm font-semibold">ECM method mix</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">Method</th>
                      <th className="pb-2 font-medium">n</th>
                      <th className="pb-2 font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/60">
                      <td className="py-2 font-medium text-emerald-700 dark:text-emerald-300">
                        Electronic
                      </td>
                      <td className="py-2 tabular-nums">{method?.electronic.toLocaleString() ?? 0}</td>
                      <td className="py-2 tabular-nums">
                        {method ? formatPct(method.electronicPercent) : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-red-600 dark:text-red-400">Manual</td>
                      <td className="py-2 tabular-nums">{method?.manual.toLocaleString() ?? 0}</td>
                      <td className="py-2 tabular-nums">
                        {method ? formatPct(method.manualPercent) : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </ContentCard>
              <ContentCard className="space-y-2 p-4">
                <h3 className="text-sm font-semibold">Attendance confidence</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">Bucket</th>
                      <th className="pb-2 font-medium">n</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      [
                        ['Verified', integrity?.verified],
                        ['Partially verified', integrity?.partiallyVerified],
                        ['Manually verified', integrity?.manuallyVerified],
                        ['Unverified', integrity?.unverified],
                        ['Disputed', integrity?.disputed],
                        ['Rejected', integrity?.rejected],
                      ] as const
                    ).map(([label, count]) =>
                      count == null && label === 'Partially verified' ? null : (
                        <tr key={label} className="border-b border-border/60 last:border-0">
                          <td className="py-2">{label}</td>
                          <td className="py-2 tabular-nums">
                            {(count ?? 0).toLocaleString()}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </ContentCard>
            </div>
          </section>

          <section className="space-y-3" data-testid="ecm-reports-exception-register">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <ContentSectionHeader
                titleAs="h2"
                title="Exception register"
                description="Visits with non-compliant classification or operational exception codes — audit appendix for the period."
                className="flex-1"
              />
              {canExport ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!data}
                  onClick={onExportExceptions}
                >
                  <Download className="mr-2 h-3.5 w-3.5" />
                  Export register
                </Button>
              ) : null}
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Planned</th>
                    <th className="px-3 py-2 font-medium">Service user</th>
                    <th className="px-3 py-2 font-medium">Carer(s)</th>
                    <th className="px-3 py-2 font-medium">Arrival</th>
                    <th className="px-3 py-2 font-medium">Duration</th>
                    <th className="px-3 py-2 font-medium">Missed</th>
                    <th className="px-3 py-2 font-medium">Confidence</th>
                    <th className="px-3 py-2 font-medium">Reason codes</th>
                  </tr>
                </thead>
                <tbody>
                  {exceptionRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                        No exceptions in this period.
                      </td>
                    </tr>
                  ) : (
                    exceptionRows.map((row) => (
                      <tr
                        key={row.scheduledJobId}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                          {formatPlannedStart(row.plannedStartDateTime)}
                        </td>
                        <td className="px-3 py-2">{row.serviceUserName}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {carerLabel(row) || '—'}
                        </td>
                        <td className="px-3 py-2">
                          <EcmStatusBadge code={row.arrivalClassification} kind="arrival" />
                        </td>
                        <td className="px-3 py-2">
                          <EcmStatusBadge code={row.durationClassification} kind="duration" />
                        </td>
                        <td className="px-3 py-2">
                          <EcmStatusBadge code={row.missedClassification} kind="missed" />
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{row.confidence}</td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              'text-xs text-muted-foreground',
                              'max-w-[14rem] inline-block truncate',
                            )}
                            title={exceptionReasonsLabel(row)}
                          >
                            {exceptionReasonsLabel(row) || '—'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {exceptionRows.length > 0 && data.rows.length >= (period.dateFrom === period.dateTo ? 500 : 5000) ? (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Register may be truncated by the report row cap. Narrow the period or schedule area
                for a complete pack.
              </p>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  )
}
