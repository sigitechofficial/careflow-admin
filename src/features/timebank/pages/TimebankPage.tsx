import * as React from 'react'
import { ChevronRight, Download, Hourglass, Loader2, Search, X } from 'lucide-react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { ContentCard } from '@/shared/ui/content-section'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store'
import { useTimebankList } from '@/features/timebank/hooks/useTimebank'
import type { TimebankList, TimebankListRow, TimebankOption } from '@/features/timebank/types'
import { formatMinutes, mondayOf } from '@/features/timebank/timebank-format'
import { TimebankWeekNav } from '@/features/timebank/components/TimebankWeekNav'
import { CarerTimebankPanel } from '@/features/timebank/components/CarerTimebankPanel'
import { AwaitingVisitsSheet } from '@/features/timebank/components/AwaitingClockOut'
import { TimebankFillBar, TimebankFillLegend, shortReasonsLine } from '@/features/timebank/components/TimebankFill'

function OptionSelect({
  label,
  value,
  options,
  onChange,
  disabled,
  testId,
}: {
  label: string
  value: string
  options: TimebankOption[]
  onChange: (value: string) => void
  disabled?: boolean
  testId: string
}) {
  return (
    <select
      className="flex h-9 max-w-[13rem] rounded-md border border-input bg-background px-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-label={label}
      disabled={disabled}
      data-testid={testId}
    >
      <option value="">{label}: all</option>
      {options.map(o => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  )
}

/** Hours, with the number of visits under them (e.g. "30m" over "1 visit"). */
function MinutesWithVisits({ minutes, visits }: { minutes: number; visits: number }) {
  if (visits <= 0) return <>0</>
  return (
    <>
      {formatMinutes(minutes)}
      <span className="block text-xs font-normal text-muted-foreground">
        {visits} {visits === 1 ? 'visit' : 'visits'}
      </span>
    </>
  )
}

type RowFilter = 'short' | 'over'

const ROW_FILTERS: Array<{ id: RowFilter; label: string; matches: (r: TimebankListRow) => boolean }> = [
  // Short, or with a visit awaiting clock-out the office still has to close.
  { id: 'short', label: 'Short', matches: r => r.freeMinutes > 0 || r.awaitingMinutes > 0 },
  { id: 'over', label: 'Over contract', matches: r => r.overMinutes > 0 },
]

function exportCsv(data: TimebankList, rows: TimebankListRow[]) {
  const header = [
    'Service user',
    'Service user #',
    'Branch',
    'Funding',
    'Week',
    'Contracted',
    'Delivered',
    'Delivered, not approved for invoice',
    'Awaiting clock-out',
    'Scheduled',
    data.isCurrentWeek ? 'Hours left to give' : 'Short',
    'Over contract',
    'Missed',
    'Cancelled',
    'Shorter or rejected',
    'No visit on rota',
    'Visits created',
  ]
  const hours = (m: number) => (m / 60).toFixed(2)
  const lines = rows.map(r => [
    r.name,
    r.serviceUserNumber ?? '',
    r.location?.name ?? '',
    r.fundingType?.name ?? '',
    `${data.weekStart} to ${data.weekEnd}`,
    hours(r.setMinutes),
    hours(r.deliveredMinutes),
    hours(r.pendingMinutes),
    hours(r.awaitingMinutes),
    hours(r.scheduledMinutes),
    hours(r.freeMinutes),
    hours(r.overMinutes),
    hours(r.reasons.missedMinutes),
    hours(
      r.reasons.cancelledByServiceUserMinutes + r.reasons.cancelledByAgencyMinutes + r.reasons.cancelledOtherMinutes,
    ),
    hours(r.reasons.shorterMinutes),
    hours(r.reasons.notBookedMinutes),
    hours(r.createdMinutes),
  ])
  const csv = [header, ...lines]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `timebank-${data.weekStart}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function TimebankPage() {
  const navigate = useNavigate()
  const searchParams = useSearch({ strict: false }) as { week?: string; tab?: 'carers' }
  const canSeeCarers = useAuthStore(s => s.can('employees.read' as never) || s.can('employees.reports.read' as never))
  const tab = searchParams.tab === 'carers' && canSeeCarers ? 'carers' : 'service-users'
  const [search, setSearch] = React.useState('')
  const [locationId, setLocationId] = React.useState('')
  const [fundingTypeId, setFundingTypeId] = React.useState('')
  const weekStart =
    searchParams.week && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.week) ? mondayOf(searchParams.week) : undefined

  const { locationId: globalLocationId, isScoped: globalLocationScoped } = useGlobalLocationScope()
  const effectiveLocationId = globalLocationScoped && globalLocationId ? globalLocationId : locationId

  // Service user whose visits awaiting clock-out are open in the side panel (read live from the list).
  const [awaitingFor, setAwaitingFor] = React.useState<{ id: string; name: string } | null>(null)
  const query = useTimebankList(
    {
      weekStart,
      locationId: effectiveLocationId || undefined,
      fundingTypeId: fundingTypeId || undefined,
      search: search.trim() || undefined,
    },
    tab === 'service-users',
  )
  const data = query.data
  const shownWeek = data?.weekStart ?? weekStart
  const isCurrent = data?.isCurrentWeek ?? !weekStart
  const [rowFilter, setRowFilter] = React.useState<RowFilter>('short')
  const rows = React.useMemo(() => {
    const match = ROW_FILTERS.find(f => f.id === rowFilter)!.matches
    return (data?.rows ?? []).filter(match)
  }, [data?.rows, rowFilter])

  const goToWeek = (week: string | undefined) =>
    void navigate({
      to: '/reports/timebank',
      search: { ...(week ? { week } : {}), ...(tab === 'carers' ? { tab: 'carers' as const } : {}) },
      replace: true,
    })

  const hasFilters = Boolean(search.trim() || (!globalLocationScoped && locationId) || fundingTypeId)

  return (
    <div className="flex flex-col gap-4 p-5" data-testid="timebank-page">
      <PageHeader
        title="Timebank"
        description={
          tab === 'carers'
            ? "Carers' contracted weekly hours against the visits they were given and the time they worked."
            : 'Service users who got fewer or more hours than their weekly hours. Finished short weeks put the hours not delivered in the bank.'
        }
        icon={<Hourglass className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Reports' }, { label: 'Timebank' }]}
      />

      <div className="flex gap-5 border-b border-border text-sm" role="tablist" aria-label="Timebank for">
        {(
          [
            { id: 'service-users', label: 'Service users', show: true },
            { id: 'carers', label: 'Carers', show: canSeeCarers },
          ] as const
        )
          .filter(t => t.show)
          .map(t => (
            <Link
              key={t.id}
              to="/reports/timebank"
              search={{
                ...(weekStart ? { week: weekStart } : {}),
                ...(t.id === 'carers' ? { tab: 'carers' as const } : {}),
              }}
              replace
              role="tab"
              aria-selected={tab === t.id}
              className={cn(
                '-mb-px border-b-2 pb-2',
                tab === t.id
                  ? 'border-foreground font-medium text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
              data-testid={`timebank-tab-${t.id}`}
            >
              {t.label}
            </Link>
          ))}
      </div>

      {tab === 'carers' ? (
        <CarerTimebankPanel weekStart={weekStart} goToWeek={goToWeek} />
      ) : (
        <>
          <ContentCard className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <TimebankWeekNav shownWeek={shownWeek} range={data} isCurrent={isCurrent} goToWeek={goToWeek} />
              <OptionSelect
                label="Branch"
                value={effectiveLocationId}
                options={data?.facets.locations ?? []}
                onChange={setLocationId}
                disabled={globalLocationScoped}
                testId="timebank-filter-branch"
              />
              <OptionSelect
                label="Funding"
                value={fundingTypeId}
                options={data?.facets.fundingTypes ?? []}
                onChange={setFundingTypeId}
                testId="timebank-filter-funding"
              />
              <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search name or service user #"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  data-testid="timebank-search"
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
                    setFundingTypeId('')
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
            {isCurrent ? (
              <p className="mt-3 text-xs text-muted-foreground">
                This week isn't finished: hours left to give are the weekly hours not delivered, not waiting for
                approval for invoice, and not booked for later this week. They go in the timebank when the week ends.
              </p>
            ) : null}
            <div className="mt-3">
              <TimebankFillLegend shortLabel={isCurrent ? 'Hours left to give' : 'Short'} showScheduled={isCurrent} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Awaiting clock-out: the carer clocked in but never clocked out. Those hours are not delivered and not
              short until the office closes the visit, so they never go in the timebank on their own.
            </p>
          </ContentCard>

          <ContentCard className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Service users</p>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show service users">
                {ROW_FILTERS.map(f => (
                  <Button
                    key={f.id}
                    type="button"
                    size="sm"
                    variant={rowFilter === f.id ? 'default' : 'outline'}
                    onClick={() => setRowFilter(f.id)}
                    data-testid={`timebank-filter-${f.id}`}
                  >
                    {f.id === 'short' && isCurrent ? 'Hours left' : f.label}
                    {data ? ` (${data.rows.filter(f.matches).length})` : ''}
                  </Button>
                ))}
              </div>
              {rowFilter === 'over' ? (
                <p className="w-full text-xs text-muted-foreground">
                  Visits that came to more than the weekly hours.
                  {isCurrent ? ' This week includes visits still to come.' : ''} Hours over the weekly hours do not
                  change the timebank.
                </p>
              ) : null}
            </div>
            {query.isLoading ? (
              <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading timebank…
              </div>
            ) : query.isError ? (
              <p className="p-6 text-sm text-destructive">Couldn't load the timebank. Try again.</p>
            ) : !data || rows.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm font-medium text-foreground">
                  {rowFilter === 'over'
                    ? isCurrent
                      ? 'No service user is over their weekly hours this week'
                      : 'No service user got more than their weekly hours that week'
                    : isCurrent
                      ? 'Every service user has their hours covered this week'
                      : 'Every service user got their hours that week'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {rowFilter === 'over'
                    ? 'Pick another week to see other weeks over contract.'
                    : 'Pick another week to see other short weeks.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm [&_td]:whitespace-nowrap" data-testid="timebank-table">
                  <thead className="bg-muted/60">
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2.5 font-medium">Service user</th>
                      <th className="px-3 py-2.5 font-medium">Contracted</th>
                      <th className="px-3 py-2.5 font-medium">Delivered</th>
                      <th className="px-3 py-2.5 font-medium">Not approved for invoice</th>
                      <th
                        className="px-3 py-2.5 font-medium"
                        title="Carer clocked in but never clocked out. Not delivered and not short until the office closes the visit."
                      >
                        Awaiting clock-out
                      </th>
                      {isCurrent ? <th className="px-3 py-2.5 font-medium">Scheduled</th> : null}
                      <th className="px-3 py-2.5 font-medium">{isCurrent ? 'Hours left to give' : 'Short'}</th>
                      <th className="px-3 py-2.5" aria-label="Open" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr
                        key={row.id}
                        className="border-b border-border last:border-0 hover:bg-muted/40"
                        data-testid="timebank-row"
                      >
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-foreground">{row.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {[row.location?.name, row.fundingType?.name].filter(Boolean).join(' · ') || '—'}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">
                          {formatMinutes(row.setMinutes)}
                          <TimebankFillBar
                            minutes={{
                              delivered: row.deliveredMinutes,
                              pending: row.pendingMinutes,
                              awaiting: row.awaitingMinutes,
                              scheduled: row.scheduledMinutes,
                              short: row.freeMinutes,
                            }}
                          />
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">{formatMinutes(row.deliveredMinutes)}</td>
                        <td className="px-3 py-2.5 tabular-nums">
                          <MinutesWithVisits minutes={row.pendingMinutes} visits={row.pendingVisits} />
                        </td>
                        <td
                          className={
                            row.awaitingVisits > 0
                              ? 'px-3 py-2.5 font-medium tabular-nums text-violet-700 dark:text-violet-400'
                              : 'px-3 py-2.5 tabular-nums'
                          }
                        >
                          {row.awaitingVisits > 0 ? (
                            <button
                              type="button"
                              className="text-left underline decoration-dotted underline-offset-4 hover:decoration-solid"
                              onClick={() => setAwaitingFor({ id: row.id, name: row.name })}
                              title="See and close these visits"
                              data-testid="timebank-awaiting-open"
                            >
                              <MinutesWithVisits minutes={row.awaitingMinutes} visits={row.awaitingVisits} />
                            </button>
                          ) : (
                            '0'
                          )}
                        </td>
                        {isCurrent ? (
                          <td className="px-3 py-2.5 tabular-nums">{formatMinutes(row.scheduledMinutes)}</td>
                        ) : null}
                        <td
                          className={
                            row.freeMinutes > 0
                              ? 'px-3 py-2.5 font-medium tabular-nums text-amber-700 dark:text-amber-400'
                              : 'px-3 py-2.5 tabular-nums text-emerald-700 dark:text-emerald-400'
                          }
                        >
                          {row.freeMinutes <= 0
                            ? 'Covered'
                            : isCurrent
                              ? formatMinutes(row.freeMinutes)
                              : `−${formatMinutes(row.freeMinutes)}`}
                          {row.freeMinutes <= 0 && row.overMinutes > 0 ? (
                            <span className="block text-xs font-normal text-muted-foreground">
                              +{formatMinutes(row.overMinutes)} over contract
                            </span>
                          ) : null}
                          {row.freeMinutes > 0 && shortReasonsLine(row.reasons) ? (
                            <span className="block text-xs font-normal text-muted-foreground">
                              {shortReasonsLine(row.reasons)}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Link
                            to="/reports/timebank/$serviceUserId"
                            params={{ serviceUserId: row.id }}
                            search={{ week: data.weekStart }}
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
          <AwaitingVisitsSheet
            open={awaitingFor != null}
            onOpenChange={open => {
              if (!open) setAwaitingFor(null)
            }}
            serviceUserName={awaitingFor?.name ?? ''}
            visits={data?.rows.find(r => r.id === awaitingFor?.id)?.awaitingVisitList ?? []}
          />
        </>
      )}
    </div>
  )
}
