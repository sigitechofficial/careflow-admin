import * as React from 'react'
import { FileBarChart2, Loader2 } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { useEcmDailyOpsReport } from '@/features/ecm/hooks/useEcm'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { EcmStatusBadge } from '@/features/ecm/components/EcmStatusBadge'

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function EcmReportsPage() {
  const { locationId } = useGlobalLocationScope()
  const [date, setDate] = React.useState(todayIso)
  const report = useEcmDailyOpsReport(date, true, {
    locationId: locationId ?? undefined,
  })

  const kpis = report.data?.kpis
  const punctuality = kpis?.punctuality

  return (
    <div className="space-y-4 p-4 md:p-6" data-testid="ecm-reports-page">
      <PageHeader
        title="ECM reports"
        description="Daily operations and compliance KPIs with numerator, denominator, exclusions, and threshold version."
        icon={<FileBarChart2 className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'ECM', href: '/ecm/live' },
          { label: 'Reports' },
        ]}
      />

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Operational date</span>
          <Input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="h-9 w-[11rem]"
          />
        </label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9"
          disabled={report.isFetching}
          onClick={() => void report.refetch()}
        >
          {report.isFetching ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
          Refresh
        </Button>
      </div>

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
              <p className="text-xs text-muted-foreground">Manual / verified</p>
              <p className="text-2xl font-semibold tabular-nums">
                {kpis?.manualAttendance ?? 0} / {kpis?.verifiedConfidence ?? 0}
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Threshold version: {report.data.thresholdVersion} · refreshed{' '}
            {new Date(report.data.refreshedAt).toLocaleTimeString()} · exclusions:{' '}
            {punctuality
              ? Object.entries(punctuality.exclusions)
                  .map(([k, v]) => `${k}=${v}`)
                  .join(', ')
              : '—'}
          </p>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Service user</th>
                  <th className="px-3 py-2 font-medium">Arrival</th>
                  <th className="px-3 py-2 font-medium">Missed</th>
                  <th className="px-3 py-2 font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {report.data.rows.map(row => (
                  <tr key={row.scheduledJobId} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      <p className="font-medium">{row.serviceUserName}</p>
                      <p className="text-xs text-muted-foreground">{row.jobName}</p>
                    </td>
                    <td className="px-3 py-2">
                      <EcmStatusBadge code={row.arrivalClassification} kind="arrival" />
                    </td>
                    <td className="px-3 py-2">
                      <EcmStatusBadge code={row.missedClassification} kind="missed" />
                    </td>
                    <td className="px-3 py-2">
                      <EcmStatusBadge code={row.confidence} kind="confidence" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  )
}
