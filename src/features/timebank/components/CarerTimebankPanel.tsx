import * as React from 'react'
import { ChevronRight, Download, Loader2, Search, X } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { ContentCard } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { useCarerTimebankList } from '@/features/timebank/hooks/useTimebank'
import type { CarerTimebankList, CarerTimebankListRow } from '@/features/timebank/types'
import { formatMinutes } from '@/features/timebank/timebank-format'
import { TimebankWeekNav } from '@/features/timebank/components/TimebankWeekNav'

type RowFilter = 'all' | 'short' | 'full'

/** Visits worked, waiting for approval and still to come beyond the contracted hours. */
function overMinutes(r: CarerTimebankListRow): number {
  return Math.max(0, r.workedMinutes + r.pendingMinutes + r.scheduledMinutes - r.setMinutes)
}

const ROW_FILTERS: Array<{ id: RowFilter; label: string; matches: (r: CarerTimebankListRow) => boolean }> = [
  { id: 'all', label: 'All carers', matches: () => true },
  { id: 'short', label: 'Short', matches: r => r.freeMinutes > 0 },
  { id: 'full', label: 'Covered', matches: r => r.freeMinutes === 0 },
]

function exportCsv(data: CarerTimebankList, rows: CarerTimebankListRow[]) {
  const header = [
    'Carer',
    'Employee #',
    'Branch',
    'Week',
    'Contracted',
    'Days off',
    'Assigned',
    'Worked',
    'Not approved for pay',
    'Scheduled',
    'Cancelled',
    'Not given',
    'Not worked',
    data.isCurrentWeek ? 'Hours left to give' : 'Short',
  ]
  const hours = (m: number) => (m / 60).toFixed(2)
  const lines = rows.map(r => [
    r.name,
    r.employeeNumber ?? '',
    r.location?.name ?? '',
    `${data.weekStart} to ${data.weekEnd}`,
    hours(r.setMinutes),
    hours(r.absenceMinutes),
    hours(r.assignedMinutes),
    hours(r.workedMinutes),
    hours(r.pendingMinutes),
    hours(r.scheduledMinutes),
    hours(r.cancelledMinutes),
    hours(r.notGivenMinutes),
    hours(r.notWorkedMinutes),
    hours(r.freeMinutes),
  ])
  const csv = [header, ...lines]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `carer-timebank-${data.weekStart}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/** Carers tab of the Timebank report: contracted hours against visits given and time worked, for one week. */
export function CarerTimebankPanel({
  weekStart,
  goToWeek,
}: {
  weekStart: string | undefined
  goToWeek: (week: string | undefined) => void
}) {
  const [search, setSearch] = React.useState('')
  const [locationId, setLocationId] = React.useState('')
  const [rowFilter, setRowFilter] = React.useState<RowFilter>('all')
  const { locationId: globalLocationId, isScoped: globalLocationScoped } = useGlobalLocationScope()
  const effectiveLocationId = globalLocationScoped && globalLocationId ? globalLocationId : locationId

  const query = useCarerTimebankList({
    weekStart,
    locationId: effectiveLocationId || undefined,
    search: search.trim() || undefined,
  })
  const data = query.data
  const shownWeek = data?.weekStart ?? weekStart
  const isCurrent = data?.isCurrentWeek ?? !weekStart
  const rows = React.useMemo(() => {
    const match = ROW_FILTERS.find(f => f.id === rowFilter)!.matches
    return (data?.rows ?? []).filter(match)
  }, [data?.rows, rowFilter])
  const hasFilters = Boolean(search.trim() || (!globalLocationScoped && locationId))

  return (
    <>
      <ContentCard className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <TimebankWeekNav shownWeek={shownWeek} range={data} isCurrent={isCurrent} goToWeek={goToWeek} />
          <select
            className="flex h-9 max-w-[13rem] rounded-md border border-input bg-background px-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            value={effectiveLocationId}
            onChange={e => setLocationId(e.target.value)}
            aria-label="Branch"
            disabled={globalLocationScoped}
            data-testid="carer-timebank-filter-branch"
          >
            <option value="">Branch: all</option>
            {(data?.facets.locations ?? []).map(o => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search carer name"
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="carer-timebank-search"
            />
          </div>
          {hasFilters ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearch('')
                setLocationId('')
              }}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Clear
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="ml-auto"
            disabled={!data || rows.length === 0}
            onClick={() => data && exportCsv(data, rows)}
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Contracted hours are lowered for days off (holiday, sickness, absence). Worked = visits approved for carer
          pay.
          {isCurrent ? ' This week is not finished: visits still to come are not short yet.' : ''}
        </p>
      </ContentCard>

      <ContentCard className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Carers</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show carers">
            {ROW_FILTERS.map(f => (
              <Button
                key={f.id}
                type="button"
                size="sm"
                variant={rowFilter === f.id ? 'default' : 'outline'}
                onClick={() => setRowFilter(f.id)}
                data-testid={`carer-timebank-filter-${f.id}`}
              >
                {f.id === 'short' && isCurrent ? 'Hours left' : f.label}
                {data ? ` (${data.rows.filter(f.matches).length})` : ''}
              </Button>
            ))}
          </div>
        </div>
        {query.isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading timebank…
          </div>
        ) : query.isError ? (
          <p className="p-6 text-sm text-destructive">Couldn't load the carer timebank. Try again.</p>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-foreground">No carers match</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Only carers with contracted weekly hours are shown. Try another week or filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm [&_td]:whitespace-nowrap" data-testid="carer-timebank-table">
              <thead className="bg-muted/60">
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Carer</th>
                  <th className="px-3 py-2.5 font-medium" title="Contracted hours less days off">
                    Contracted
                  </th>
                  <th className="px-3 py-2.5 font-medium">Assigned</th>
                  <th className="px-3 py-2.5 font-medium">Worked</th>
                  <th
                    className="px-3 py-2.5 font-medium"
                    title={
                      isCurrent
                        ? 'Contracted hours not yet covered by visits worked, waiting for approval or still to come'
                        : 'Contracted hours the carer did not work that week'
                    }
                  >
                    {isCurrent ? 'Hours left to give' : 'Short'}
                  </th>
                  <th className="px-3 py-2.5" aria-label="Open" />
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-0 hover:bg-muted/40"
                    data-testid="carer-timebank-row"
                  >
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-foreground">{row.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[row.location?.name, row.weeklyHours != null ? `${row.weeklyHours}h a week` : null]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {formatMinutes(row.setMinutes)}
                      {row.absenceMinutes > 0 ? (
                        <span className="block text-xs text-muted-foreground">
                          {formatMinutes(row.absenceMinutes)} off
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{formatMinutes(row.assignedMinutes)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{formatMinutes(row.workedMinutes)}</td>
                    <td
                      className={cn(
                        'px-3 py-2.5 tabular-nums',
                        row.freeMinutes > 0
                          ? 'font-medium text-amber-700 dark:text-amber-400'
                          : 'text-emerald-700 dark:text-emerald-400',
                      )}
                    >
                      {row.freeMinutes > 0
                        ? isCurrent
                          ? formatMinutes(row.freeMinutes)
                          : `−${formatMinutes(row.freeMinutes)}`
                        : 'Covered'}
                      {row.freeMinutes === 0 && overMinutes(row) > 0 ? (
                        <span className="block text-xs font-normal text-muted-foreground">
                          +{formatMinutes(overMinutes(row))} over contract
                        </span>
                      ) : null}
                      {row.freeMinutes > 0 ? (
                        <span className="block text-xs font-normal text-muted-foreground">
                          {[
                            row.notGivenMinutes > 0 ? `Not given ${formatMinutes(row.notGivenMinutes)}` : null,
                            row.notWorkedMinutes > 0 ? `Not worked ${formatMinutes(row.notWorkedMinutes)}` : null,
                            row.cancelledMinutes > 0 ? `Cancelled ${formatMinutes(row.cancelledMinutes)}` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Link
                        to="/reports/timebank/carers/$employeeId"
                        params={{ employeeId: row.id }}
                        className="inline-flex items-center gap-0.5 text-sm font-medium text-primary hover:underline"
                      >
                        View <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ContentCard>
    </>
  )
}
