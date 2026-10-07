import * as React from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileBarChart2,
  Loader2,
  MapPin,
  Play,
  RefreshCw,
} from 'lucide-react'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useScheduleReport,
  useScheduleReportAllPages,
  useScheduleReportTypes,
} from '@/features/scheduling/hooks/useScheduling'
import { REPORT_VIEWS, toCsv } from '@/features/scheduling/components/ScheduleReportViews'
import { formatTimezoneUtcOffset } from '@/features/settings/organisation-timezone'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import {
  addDaysToOperationalIso,
  getSyncedOperationalTimeZone,
  operationalTodayIso,
} from '@/shared/lib/operational-day.util'

const PAGE_SIZE = 50
const fieldClass =
  'h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

/** Inclusive number of calendar days between two YYYY-MM-DD dates. */
function inclusiveDays(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)
  return Number.isFinite(ms) ? Math.round(ms / 86_400_000) + 1 : 0
}

function monthStart(iso: string): string {
  return `${iso.slice(0, 7)}-01`
}

type Submitted = { type: string; endpoint: string; name: string; from: string; to: string; locationId?: string }

export default function SchedulingReportPage() {
  const hasApi = !!getApiBaseUrl()
  const { formatDate } = useOrganisationDisplayFormat()
  const { locationId } = useGlobalLocationScope()
  const operationalTimezone = getSyncedOperationalTimeZone()
  const timezoneHint = `${operationalTimezone} (${formatTimezoneUtcOffset(operationalTimezone)})`
  const today = operationalTodayIso()

  const typesQuery = useScheduleReportTypes(hasApi)
  const types = typesQuery.data ?? []
  const supported = types.filter((t) => t.supported && t.endpoint && REPORT_VIEWS[t.type])
  const comingSoon = types.filter((t) => !supported.includes(t))

  const [selectedType, setSelectedType] = React.useState('')
  const [from, setFrom] = React.useState(() => addDaysToOperationalIso(today, -6))
  const [to, setTo] = React.useState(today)
  const [submitted, setSubmitted] = React.useState<Submitted | null>(null)
  const [page, setPage] = React.useState(1)

  React.useEffect(() => {
    if (!selectedType && supported.length) setSelectedType(supported[0]!.type)
  }, [supported, selectedType])

  const selected = supported.find((t) => t.type === selectedType)
  const view = selected ? REPORT_VIEWS[selected.type] : undefined
  const days = inclusiveDays(from, to)
  const rangeError =
    !from || !to
      ? 'Choose a start and end date.'
      : from > to
        ? 'The start date must be on or before the end date.'
        : view && days > view.maxDays
          ? `This report covers up to ${view.maxDays} days — you chose ${days}.`
          : null

  const setPreset = (preset: 'today' | 'week' | 'month' | 'lastMonth') => {
    if (preset === 'today') {
      setFrom(today)
      setTo(today)
    } else if (preset === 'week') {
      setFrom(addDaysToOperationalIso(today, -6))
      setTo(today)
    } else if (preset === 'month') {
      setFrom(monthStart(today))
      setTo(today)
    } else {
      const lastOfPrev = addDaysToOperationalIso(monthStart(today), -1)
      setFrom(monthStart(lastOfPrev))
      setTo(lastOfPrev)
    }
  }

  const generate = () => {
    if (!selected?.endpoint || rangeError) return
    setPage(1)
    setSubmitted({
      type: selected.type,
      endpoint: selected.endpoint,
      name: selected.name,
      from,
      to,
      locationId: locationId ?? undefined,
    })
  }

  const report = useScheduleReport(
    submitted?.endpoint ?? '',
    {
      dateFrom: submitted?.from ?? '',
      dateTo: submitted?.to ?? '',
      page,
      limit: PAGE_SIZE,
      locationId: submitted?.locationId,
    },
    hasApi && Boolean(submitted),
  )
  const exportAll = useScheduleReportAllPages()
  const submittedView = submitted ? REPORT_VIEWS[submitted.type] : undefined
  const data = (report.data?.data ?? {}) as Record<string, unknown>
  const rows = submittedView ? submittedView.rowsOf(report.data?.data) : []
  const meta = report.data?.meta
  const totalPages = meta?.totalPages ?? 1

  const downloadCsv = async () => {
    if (!submitted || !submittedView) return
    try {
      const { rows: all } = await exportAll.mutateAsync({
        endpoint: submitted.endpoint,
        params: { dateFrom: submitted.from, dateTo: submitted.to, locationId: submitted.locationId },
        rowsOf: submittedView.rowsOf,
      })
      const csv = toCsv(submittedView.csv(all, { formatDate }))
      const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${submitted.type.toLowerCase().replace(/_/g, '-')}-${submitted.from}-to-${submitted.to}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toastSuccess('Report downloaded', `${all.length} row${all.length === 1 ? '' : 's'} exported.`)
    } catch (err) {
      toastApiError(err, 'Could not export the report.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="space-y-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h1 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <FileBarChart2 className="h-4 w-4 text-primary" aria-hidden />
                Scheduling reports
              </h1>
              <p className="text-sm text-muted-foreground">
                Choose a report and date range, then generate. Dates and times use {timezoneHint}.
              </p>
            </div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground"
              title="Change the branch from the location picker in the top bar"
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {locationId ? 'Branch selected in the top bar' : 'All branches'}
            </span>
          </div>

          {!hasApi ? <p className="text-sm text-warning">Configure VITE_API_BASE_URL.</p> : null}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] lg:items-end">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Report</span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                disabled={typesQuery.isLoading}
                className={fieldClass}
                data-testid="scheduling-report-type"
              >
                {supported.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.name}
                  </option>
                ))}
                {comingSoon.length ? (
                  <optgroup label="Coming soon">
                    {comingSoon.map((t) => (
                      <option key={t.type} value={t.type} disabled>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </label>

            <div className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Date range</span>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(e) => setFrom(e.target.value)}
                  className={cn(fieldClass, 'min-w-0 flex-1')}
                  aria-label="From"
                />
                <span className="text-sm text-muted-foreground">to</span>
                <input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                  className={cn(fieldClass, 'min-w-0 flex-1')}
                  aria-label="To"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['today', 'Today'],
                    ['week', 'Last 7 days'],
                    ['month', 'This month'],
                    ['lastMonth', 'Last month'],
                  ] as const
                ).map(([key, label]) => (
                  <Button
                    key={key}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-full px-3 text-xs"
                    onClick={() => setPreset(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              type="button"
              className="h-10 gap-2 px-5"
              onClick={generate}
              disabled={!selected || Boolean(rangeError)}
              data-testid="scheduling-report-generate"
            >
              <Play className="h-4 w-4" aria-hidden />
              Generate report
            </Button>
          </div>

          {rangeError ? (
            <p className="text-sm text-destructive">{rangeError}</p>
          ) : view ? (
            <p className="text-xs text-muted-foreground">
              {days} day{days === 1 ? '' : 's'} selected · this report covers up to {view.maxDays} days.
            </p>
          ) : null}
        </div>
      </div>

      {submitted && submittedView ? (
        <div className="rounded-xl border border-border bg-card shadow-sm" data-testid="scheduling-report-result">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">{submitted.name}</h2>
              <p className="text-xs text-muted-foreground">
                {formatDate(submitted.from)} – {formatDate(submitted.to)}
                {meta ? ` · ${meta.total} result${meta.total === 1 ? '' : 's'}` : ''}
                {submitted.locationId ? ' · selected branch' : ' · all branches'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                leftIcon={<RefreshCw className={cn('h-3.5 w-3.5', report.isFetching && 'animate-spin')} />}
                onClick={() => void report.refetch()}
                disabled={report.isFetching}
              >
                Refresh
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                leftIcon={
                  exportAll.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )
                }
                onClick={() => void downloadCsv()}
                disabled={exportAll.isPending || !rows.length}
                data-testid="scheduling-report-export"
              >
                Export CSV
              </Button>
            </div>
          </div>

          <div className="space-y-4 p-5">
            {report.isLoading ? (
              <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Generating report…
              </div>
            ) : report.isError ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {report.error instanceof Error ? report.error.message : 'Could not load the report.'}
              </p>
            ) : rows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                No data for this date range.
              </div>
            ) : (
              <div className={cn(report.isFetching && 'opacity-60 transition-opacity')}>
                {submittedView.render(data, rows, { formatDate })}
              </div>
            )}

            {meta && totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-sm">
                <span className="text-muted-foreground">
                  Page {meta.page} of {totalPages} · {meta.total} results
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    leftIcon={<ChevronLeft className="h-4 w-4" />}
                    disabled={!meta.hasPrevPage || report.isFetching}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!meta.hasNextPage || report.isFetching}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
