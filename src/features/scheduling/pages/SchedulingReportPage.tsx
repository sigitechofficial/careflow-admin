import * as React from 'react'
import { Check, Filter, Loader2 } from 'lucide-react'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { Button } from '@/shared/ui/button'
import { useScheduleReport, useScheduleReportTypes } from '@/features/scheduling/hooks/useScheduling'
import { todayIso } from '@/features/scheduling/utils/scheduling-format'

export default function SchedulingReportPage() {
  const hasApi = !!getApiBaseUrl()
  const [selectedType, setSelectedType] = React.useState('')
  const [from, setFrom] = React.useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().slice(0, 10)
  })
  const [to, setTo] = React.useState(todayIso())
  const [generate, setGenerate] = React.useState(false)

  const typesQuery = useScheduleReportTypes(hasApi)
  const supported = (typesQuery.data ?? []).filter(t => t.supported && t.endpoint)

  React.useEffect(() => {
    if (!selectedType && supported.length) setSelectedType(supported[0]?.type ?? '')
  }, [supported, selectedType])

  const selected = supported.find(t => t.type === selectedType)
  const endpoint = selected?.endpoint ?? ''

  const reportQuery = useScheduleReport(endpoint, from, to, generate, hasApi)

  const handleGenerate = () => {
    if (!selected?.supported) return
    setGenerate(true)
  }

  const reportData = reportQuery.data?.data as Record<string, unknown> | undefined
  const rows =
    (reportData?.rows as unknown[] | undefined) ??
    (reportData?.jobs as unknown[] | undefined) ??
    (reportData?.serviceUsers as unknown[] | undefined) ??
    (reportData?.employees as unknown[] | undefined) ??
    []

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Filter className="h-4 w-4 text-muted-foreground" />
              Scheduling Reports
            </div>
            <p className="text-sm text-muted-foreground">
              Generate JSON reports from the schedule API. Supported reports only.
            </p>
          </div>

          {!hasApi && (
            <p className="text-sm text-amber-600">Configure VITE_API_BASE_URL.</p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Report <span className="text-destructive">*</span>
              </label>
              <select
                value={selectedType}
                onChange={e => {
                  setSelectedType(e.target.value)
                  setGenerate(false)
                }}
                disabled={typesQuery.isLoading}
                className="h-10 w-full border border-border rounded-md px-3 text-sm bg-background"
              >
                {(typesQuery.data ?? []).map(t => (
                  <option key={t.type} value={t.type} disabled={!t.supported}>
                    {t.name}{!t.supported ? ' (coming soon)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Date range <span className="text-destructive">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={from}
                  onChange={e => setFrom(e.target.value)}
                  className="h-10 flex-1 border border-border rounded-md px-3 text-sm bg-background"
                />
                <span className="text-muted-foreground text-sm">to</span>
                <input
                  type="date"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  className="h-10 flex-1 border border-border rounded-md px-3 text-sm bg-background"
                />
              </div>
            </div>

            <div className="flex items-end">
              <Button className="gap-2 h-10 px-5 w-full sm:w-auto" onClick={handleGenerate} disabled={!selected?.supported}>
                <Check className="h-4 w-4" />
                Generate Report
              </Button>
            </div>
          </div>

          {selected && !selected.supported && (
            <p className="text-sm text-muted-foreground rounded-md border border-dashed p-3">
              {selected.message ?? 'This report requires future module integration.'}
            </p>
          )}
        </div>
      </div>

      {generate && (
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold">{selected?.name ?? 'Report'}</h2>
            {reportQuery.isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="p-5 space-y-4">
            {reportQuery.isError && (
              <p className="text-sm text-destructive">Failed to load report. Check permissions (schedule_reports.read).</p>
            )}
            {reportQuery.isSuccess && (
              <>
                {reportData?.countsByStatus && (
                  <pre className="text-xs bg-muted/40 rounded-md p-3 overflow-auto">
                    {JSON.stringify(reportData.countsByStatus, null, 2)}
                  </pre>
                )}
                <pre className="text-xs bg-muted/40 rounded-md p-3 overflow-auto max-h-[480px]">
                  {JSON.stringify(rows.length ? rows : reportData, null, 2)}
                </pre>
                {reportQuery.data?.export && (
                  <p className="text-xs text-muted-foreground">
                    Export: {JSON.stringify(reportQuery.data.export)}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
