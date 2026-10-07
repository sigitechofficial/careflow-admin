import * as React from 'react'
import { ChevronLeft, ChevronRight, Download, Loader2, MapPin, Play, RefreshCw, Search, Users } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { addDaysToOperationalIso, operationalTodayIso } from '@/shared/lib/operational-day.util'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { useCarerReport, useCarerReportAllPages } from '@/features/employees/hooks/useCarerReports'
import { CARER_REPORTS, carerReportCsv, type CarerReportDef } from '@/features/employees/components/CarerReportViews'

const PAGE_SIZE = 50
const fieldClass =
  'h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const WITHIN_OPTIONS = [30, 60, 90, 180, 365]

type Status = 'active' | 'inactive' | 'all'
type Submitted = {
  report: CarerReportDef
  status: Status
  search?: string
  dateFrom?: string
  dateTo?: string
  withinDays?: number
  locationId?: string
}

function monthStart(iso: string) {
  return `${iso.slice(0, 7)}-01`
}

/** Carer (employee) reports — usable on its own page or inside the Employee section. */
export function CarerReportsPanel() {
  const { formatDate } = useOrganisationDisplayFormat()
  const { locationId } = useGlobalLocationScope()
  const today = operationalTodayIso()

  const [slug, setSlug] = React.useState(CARER_REPORTS[0]!.slug)
  const report = CARER_REPORTS.find((r) => r.slug === slug)!
  const [status, setStatus] = React.useState<Status>(report.defaultStatus)
  const [search, setSearch] = React.useState('')
  const [from, setFrom] = React.useState(() => addDaysToOperationalIso(today, -((report.defaultDays ?? 30) - 1)))
  const [to, setTo] = React.useState(today)
  const [withinDays, setWithinDays] = React.useState(30)
  const [submitted, setSubmitted] = React.useState<Submitted | null>(null)
  const [page, setPage] = React.useState(1)

  const chooseReport = (next: string) => {
    const def = CARER_REPORTS.find((r) => r.slug === next)!
    setSlug(next)
    setStatus(def.defaultStatus)
    if (def.filter === 'range') {
      setFrom(addDaysToOperationalIso(today, -((def.defaultDays ?? 30) - 1)))
      setTo(today)
    }
  }

  const rangeError =
    report.filter === 'range' && (!from || !to || from > to) ? 'Choose a valid date range (start on or before end).' : null

  const generate = () => {
    if (rangeError) return
    setPage(1)
    setSubmitted({
      report,
      status,
      search: search.trim() || undefined,
      locationId: locationId ?? undefined,
      ...(report.filter === 'range' ? { dateFrom: from, dateTo: to } : {}),
      ...(report.filter === 'within' ? { withinDays } : {}),
    })
  }

  const params = submitted
    ? {
        page,
        limit: PAGE_SIZE,
        status: submitted.status,
        search: submitted.search,
        locationId: submitted.locationId,
        dateFrom: submitted.dateFrom,
        dateTo: submitted.dateTo,
        withinDays: submitted.withinDays,
      }
    : { page, limit: PAGE_SIZE }
  const query = useCarerReport(submitted?.report.slug ?? '', params, Boolean(submitted))
  const exportAll = useCarerReportAllPages()
  const data = query.data?.data ?? {}
  const rows = (data.rows as unknown[] | undefined) ?? []
  const meta = query.data?.meta

  const downloadCsv = async () => {
    if (!submitted) return
    try {
      const all = await exportAll.mutateAsync({
        slug: submitted.report.slug,
        params: {
          status: submitted.status,
          search: submitted.search,
          locationId: submitted.locationId,
          dateFrom: submitted.dateFrom,
          dateTo: submitted.dateTo,
          withinDays: submitted.withinDays,
        },
      })
      const blob = new Blob(['﻿', carerReportCsv(submitted.report.csv(all))], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `carers-${submitted.report.slug}-${today}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toastSuccess('Report downloaded', `${all.length} row${all.length === 1 ? '' : 's'} exported.`)
    } catch (err) {
      toastApiError(err, 'Could not export the report.')
    }
  }

  const presets: Array<[string, () => void]> = [
    ['Last 30 days', () => (setFrom(addDaysToOperationalIso(today, -29)), setTo(today))],
    ['This month', () => (setFrom(monthStart(today)), setTo(today))],
    [
      'Last month',
      () => {
        const last = addDaysToOperationalIso(monthStart(today), -1)
        setFrom(monthStart(last))
        setTo(last)
      },
    ],
    ['This year', () => (setFrom(`${today.slice(0, 4)}-01-01`), setTo(today))],
  ]

  return (
    <div className="space-y-4" data-testid="carer-reports">
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="space-y-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h1 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Users className="h-4 w-4 text-primary" aria-hidden />
                Carer reports
              </h1>
              <p className="text-sm text-muted-foreground">{report.description}</p>
            </div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground"
              title="Change the branch from the location picker in the top bar"
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {locationId ? 'Branch selected in the top bar' : 'All branches'}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Report</span>
              <select
                className={fieldClass}
                value={slug}
                onChange={(e) => chooseReport(e.target.value)}
                data-testid="carer-report-type"
              >
                {CARER_REPORTS.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Carers</span>
              <select className={fieldClass} value={status} onChange={(e) => setStatus(e.target.value as Status)}>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
                <option value="all">All carers</option>
              </select>
            </label>
            <label className="space-y-1.5 md:col-span-2 xl:col-span-2">
              <span className="text-sm font-medium text-foreground">Search</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => (e.key === 'Enter' ? generate() : undefined)}
                  placeholder="Name, email or employee number"
                  className="h-10 pl-9"
                />
              </div>
            </label>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            {report.filter === 'range' ? (
              <div className="space-y-1.5">
                <span className="text-sm font-medium text-foreground">Date range</span>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={from}
                    max={to || undefined}
                    onChange={(e) => setFrom(e.target.value)}
                    className={cn(fieldClass, 'w-auto')}
                    aria-label="From"
                  />
                  <span className="text-sm text-muted-foreground">to</span>
                  <input
                    type="date"
                    value={to}
                    min={from || undefined}
                    onChange={(e) => setTo(e.target.value)}
                    className={cn(fieldClass, 'w-auto')}
                    aria-label="To"
                  />
                  {presets.map(([label, run]) => (
                    <Button
                      key={label}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-full px-3 text-xs"
                      onClick={run}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : report.filter === 'within' ? (
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-foreground">Show items expiring or due within</span>
                <select
                  className={cn(fieldClass, 'w-auto')}
                  value={withinDays}
                  onChange={(e) => setWithinDays(Number(e.target.value))}
                >
                  {WITHIN_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} days (and anything already overdue)
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span />
            )}
            <Button
              type="button"
              className="h-10 gap-2 px-5"
              onClick={generate}
              disabled={Boolean(rangeError)}
              data-testid="carer-report-generate"
            >
              <Play className="h-4 w-4" aria-hidden />
              Generate report
            </Button>
          </div>
          {rangeError ? <p className="text-sm text-destructive">{rangeError}</p> : null}
        </div>
      </div>

      {submitted ? (
        <div className="rounded-xl border border-border bg-card shadow-sm" data-testid="carer-report-result">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">{submitted.report.label}</h2>
              <p className="text-xs text-muted-foreground">
                {submitted.dateFrom && submitted.dateTo
                  ? `${formatDate(submitted.dateFrom)} – ${formatDate(submitted.dateTo)} · `
                  : ''}
                {submitted.withinDays ? `Within ${submitted.withinDays} days · ` : ''}
                {submitted.status === 'all' ? 'All carers' : submitted.status === 'inactive' ? 'Inactive carers' : 'Active carers'}
                {meta ? ` · ${meta.total} result${meta.total === 1 ? '' : 's'}` : ''}
                {submitted.search ? ` · “${submitted.search}”` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                leftIcon={<RefreshCw className={cn('h-3.5 w-3.5', query.isFetching && 'animate-spin')} />}
                onClick={() => void query.refetch()}
                disabled={query.isFetching}
              >
                Refresh
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                leftIcon={
                  exportAll.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />
                }
                onClick={() => void downloadCsv()}
                disabled={exportAll.isPending || !rows.length}
                data-testid="carer-report-export"
              >
                Export CSV
              </Button>
            </div>
          </div>
          <div className="space-y-4 p-5">
            {query.isLoading ? (
              <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Generating report…
              </div>
            ) : query.isError ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {query.error instanceof Error ? query.error.message : 'Could not load the report.'}
              </p>
            ) : rows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                Nothing to report for these filters.
              </div>
            ) : (
              <div className={cn(query.isFetching && 'opacity-60 transition-opacity')}>
                {submitted.report.render(data, rows, { formatDate })}
              </div>
            )}
            {meta && meta.totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-sm">
                <span className="text-muted-foreground">
                  Page {meta.page} of {meta.totalPages} · {meta.total} results
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    leftIcon={<ChevronLeft className="h-4 w-4" />}
                    disabled={!meta.hasPrevPage || query.isFetching}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!meta.hasNextPage || query.isFetching}
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

export default function CarerReportsPage() {
  return <CarerReportsPanel />
}
