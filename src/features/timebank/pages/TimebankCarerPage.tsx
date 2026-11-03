import * as React from 'react'
import { ArrowLeft, ChevronDown, ChevronRight, Hourglass, Loader2 } from 'lucide-react'
import { Link, useParams } from '@tanstack/react-router'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { ContentCard } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'
import { VISIT_CANCELLATION_REASONS } from '@/features/scheduling/utils/visit-cancellation.constants'
import { visitCareNotDeliveredReasonLabel } from '@/features/scheduling/utils/visit-care-not-delivered-reason.util'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { useCarerTimebankDetail } from '@/features/timebank/hooks/useTimebank'
import type { CarerTimebankVisit, CarerTimebankWeek, TimebankWeekStatus } from '@/features/timebank/types'
import {
  CARER_OUTCOME_LABEL,
  CARER_OUTCOME_TONE,
  formatMinutes,
  WEEK_STATUS_LABEL,
  WEEK_STATUS_TONE,
} from '@/features/timebank/timebank-format'

type WeekFilter = 'all' | 'short' | 'complete' | 'coming'

const WEEK_FILTERS: Array<{ id: WeekFilter; label: string; matches: (s: TimebankWeekStatus) => boolean }> = [
  { id: 'all', label: 'All weeks', matches: () => true },
  { id: 'short', label: 'Short', matches: s => s === 'short' },
  { id: 'complete', label: 'Covered', matches: s => s === 'complete' },
  { id: 'coming', label: 'This week and scheduled', matches: s => s === 'current' || s === 'upcoming' },
]

const CANCEL_REASON_LABEL = new Map<string, string>(VISIT_CANCELLATION_REASONS.map(r => [r.code, r.label]))

function StatCard({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'warning' }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-xl font-semibold tabular-nums text-foreground',
          tone === 'warning' && 'text-amber-700 dark:text-amber-400',
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function StatusBadge({ status }: { status: TimebankWeekStatus }) {
  const label = status === 'complete' ? 'Covered' : WEEK_STATUS_LABEL[status]
  return (
    <span className={cn('inline-flex rounded-md border px-2 py-0.5 text-xs font-medium', WEEK_STATUS_TONE[status])}>
      {label}
    </span>
  )
}

/** What happened, with the cancellation or "Unable to start" reason and its note. */
function Outcome({ v }: { v: CarerTimebankVisit }) {
  const reason =
    v.outcome === 'UNABLE_TO_START'
      ? visitCareNotDeliveredReasonLabel(v.reasonCode)
      : v.reasonCode && v.reasonCode !== 'OTHER'
        ? (CANCEL_REASON_LABEL.get(v.reasonCode) ?? v.reasonCode)
        : null
  return (
    <>
      <span className={cn('font-medium', CARER_OUTCOME_TONE[v.outcome])}>{CARER_OUTCOME_LABEL[v.outcome]}</span>
      {reason ? <span className="text-muted-foreground"> — {reason}</span> : null}
      {v.reasonNotes ? <div className="text-xs text-muted-foreground">“{v.reasonNotes}”</div> : null}
    </>
  )
}

function VisitsTable({ visits, showWeekVisitsOnly }: { visits: CarerTimebankVisit[]; showWeekVisitsOnly?: boolean }) {
  const { formatDate, formatTime } = useOrganisationDisplayFormat()
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-background">
      <table className="w-full min-w-[820px] text-sm [&_td]:whitespace-nowrap">
        <thead className="bg-muted/60">
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">Visit</th>
            <th className="px-3 py-2 font-medium">Service user</th>
            <th className="px-3 py-2 font-medium">Planned</th>
            <th className="px-3 py-2 font-medium">Worked</th>
            <th className="px-3 py-2 font-medium">Not approved for pay</th>
            <th className="px-3 py-2 font-medium">Short</th>
            <th className="px-3 py-2 font-medium">{showWeekVisitsOnly ? 'What happened' : 'Reason'}</th>
          </tr>
        </thead>
        <tbody>
          {visits.map(v => (
            <tr key={v.jobId} className="border-b border-border last:border-0">
              <td className="px-3 py-2">
                <p className="font-medium text-foreground">{v.jobName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(v.day)} · {formatTime(v.start)}
                  {v.end ? `–${formatTime(v.end)}` : ''}
                </p>
              </td>
              <td className="px-3 py-2">{v.serviceUserName}</td>
              <td className="px-3 py-2 tabular-nums">{formatMinutes(v.plannedMinutes)}</td>
              <td className="px-3 py-2 tabular-nums">{formatMinutes(v.workedMinutes)}</td>
              <td className="px-3 py-2 tabular-nums">{formatMinutes(v.pendingMinutes)}</td>
              <td
                className={cn(
                  'px-3 py-2 tabular-nums',
                  v.shortMinutes > 0 && 'font-medium text-amber-700 dark:text-amber-400',
                )}
              >
                {formatMinutes(v.shortMinutes)}
              </td>
              <td className="px-3 py-2">
                <Outcome v={v} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Every visit of one week and its days off, shown when its row is opened. */
function WeekVisits({ week }: { week: CarerTimebankWeek }) {
  const { formatDate } = useOrganisationDisplayFormat()
  return (
    <div className="flex flex-col gap-2" data-testid="carer-timebank-week-visits">
      {week.absentDays > 0 ? (
        <p className="text-xs text-muted-foreground">
          {week.absentDays} day{week.absentDays === 1 ? '' : 's'} off ({formatMinutes(week.absenceMinutes)} taken off
          the contracted hours):{' '}
          {week.absences
            .map(a => `${a.type}${a.sickness ? ' (sickness)' : ''} ${formatDate(a.from)} – ${formatDate(a.to)}`)
            .join('; ')}
        </p>
      ) : null}
      {week.notGivenMinutes > 0 ? (
        <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
          {formatMinutes(week.notGivenMinutes)} of this week's contracted hours had no visit given to the carer.
        </p>
      ) : null}
      {week.allVisits.length === 0 ? (
        <p className="text-sm text-muted-foreground">No visits given this week.</p>
      ) : (
        <VisitsTable visits={week.allVisits} showWeekVisitsOnly />
      )}
    </div>
  )
}

function shortLabel(week: CarerTimebankWeek): string {
  return week.freeMinutes > 0 ? `−${formatMinutes(week.freeMinutes)}` : '0'
}

export default function TimebankCarerPage() {
  const { employeeId = '' } = useParams({ strict: false }) as { employeeId?: string }
  const { formatDate } = useOrganisationDisplayFormat()
  const [filter, setFilter] = React.useState<WeekFilter>('all')
  const query = useCarerTimebankDetail(employeeId)
  const data = query.data

  const [visitsWeek, setVisitsWeek] = React.useState('')
  const shownVisits = React.useMemo(
    () => (data?.shortVisits ?? []).filter(v => !visitsWeek || v.weekStart === visitsWeek),
    [data?.shortVisits, visitsWeek],
  )
  const [openWeeks, setOpenWeeks] = React.useState<ReadonlySet<string>>(() => new Set())
  const toggleWeek = (weekStartIso: string) =>
    setOpenWeeks(prev => {
      const next = new Set(prev)
      if (next.has(weekStartIso)) next.delete(weekStartIso)
      else next.add(weekStartIso)
      return next
    })
  /** Opens one week in Week by week and scrolls to it. */
  const openWeek = (weekStartIso: string) => {
    setFilter('all')
    setOpenWeeks(prev => new Set(prev).add(weekStartIso))
    window.setTimeout(() => {
      document.querySelector(`[data-week="${weekStartIso}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  const weeks = React.useMemo(() => {
    const match = WEEK_FILTERS.find(f => f.id === filter)!.matches
    return (data?.weeks ?? []).filter(w => match(w.status))
  }, [data?.weeks, filter])

  const weekRange = (w: { weekStart: string; weekEnd: string }) =>
    `${formatDate(w.weekStart)} – ${formatDate(w.weekEnd)}`

  return (
    <div className="flex flex-col gap-4 p-5" data-testid="timebank-carer-page">
      <PageHeader
        title={data ? `Timebank — ${data.carer.name}` : 'Timebank'}
        description="Contracted weekly hours against the visits given and the time worked, week by week."
        icon={<Hourglass className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Reports' },
          { label: 'Timebank', href: '/reports/timebank?tab=carers' },
          { label: data?.carer.name ?? 'Carer' },
        ]}
      />
      <div>
        <Link
          to="/reports/timebank"
          search={{ tab: 'carers' }}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to Timebank
        </Link>
      </div>

      {query.isLoading ? (
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : query.isError || !data ? (
        <p className="p-6 text-sm text-destructive">Couldn't load this carer's timebank. Try again.</p>
      ) : (
        <>
          <ContentCard className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-foreground">{data.carer.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[
                    data.carer.employeeNumber,
                    data.carer.location?.name,
                    data.carer.weeklyHours != null ? `${data.carer.weeklyHours}h a week now` : 'No contracted hours',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Since {formatDate(data.startDate)}</p>
            </div>
            <div
              className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
              data-testid="carer-timebank-totals"
            >
              <StatCard
                label="Contracted hours"
                value={formatMinutes(data.totals.setMinutes)}
                hint={`Since ${formatDate(data.startDate)}${data.totals.includesCurrentWeek ? ', including this week' : ''}${
                  data.totals.absenceMinutes > 0
                    ? ` · ${formatMinutes(data.totals.absenceMinutes)} off for days off`
                    : ''
                }`}
              />
              <StatCard
                label="Assigned"
                value={formatMinutes(data.totals.assignedMinutes)}
                hint="Visits given to the carer that still stand"
              />
              <StatCard label="Worked" value={formatMinutes(data.totals.workedMinutes)} hint="Approved for carer pay" />
              <StatCard
                label="Worked, not approved for pay"
                value={formatMinutes(data.totals.pendingMinutes)}
                hint="Visits done, waiting for the office to approve the carer's pay"
              />
              <StatCard
                label="In timebank"
                value={formatMinutes(data.totals.bankMinutes)}
                tone="warning"
                hint={`Finished weeks: not given ${formatMinutes(data.totals.notGivenMinutes)} · not worked ${formatMinutes(
                  data.totals.notWorkedMinutes,
                )} · cancelled ${formatMinutes(data.totals.cancelledMinutes)}`}
              />
              {data.totals.thisWeek ? (
                <button
                  type="button"
                  className="rounded-lg border border-sky-200 bg-sky-50/60 px-4 py-3 text-left hover:bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40"
                  onClick={() => openWeek(data.totals.thisWeek!.weekStart)}
                  data-testid="carer-timebank-this-week-card"
                >
                  <p className="text-xs text-muted-foreground">Scheduled this week</p>
                  <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">
                    {formatMinutes(data.totals.thisWeek.scheduledMinutes)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {data.totals.thisWeek.scheduledVisits} visits still to come ·{' '}
                    {formatDate(data.totals.thisWeek.weekStart)} – {formatDate(data.totals.thisWeek.weekEnd)}
                  </p>
                </button>
              ) : null}
            </div>
          </ContentCard>

          <ContentCard className="p-4" data-testid="carer-timebank-short-visits-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Visits not fully worked</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Visits given to the carer that were cancelled, missed, shorter than planned or had their pay rejected.
                </p>
              </div>
              <select
                className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={visitsWeek}
                onChange={e => setVisitsWeek(e.target.value)}
                aria-label="Show visits of week"
                data-testid="carer-timebank-visits-week"
              >
                <option value="">All weeks ({data.shortVisits.length} visits)</option>
                {data.weeks.map(w => {
                  const count = data.shortVisits.filter(v => v.weekStart === w.weekStart).length
                  return (
                    <option key={w.weekStart} value={w.weekStart}>
                      {weekRange(w)} ({count})
                    </option>
                  )
                })}
              </select>
            </div>
            {shownVisits.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {visitsWeek
                  ? 'Every visit given that week was worked in full.'
                  : 'Every visit given was worked in full.'}
              </p>
            ) : (
              <div className="mt-3">
                <VisitsTable visits={shownVisits} />
              </div>
            )}
          </ContentCard>

          <ContentCard className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Week by week</p>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show weeks">
                {WEEK_FILTERS.map(f => (
                  <Button
                    key={f.id}
                    type="button"
                    size="sm"
                    variant={filter === f.id ? 'default' : 'outline'}
                    onClick={() => setFilter(f.id)}
                    data-testid={`carer-timebank-week-filter-${f.id}`}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>
            {weeks.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No weeks match this filter.</p>
            ) : (
              <div className="overflow-x-auto">
                <table
                  className="w-full min-w-[1200px] text-sm [&_td]:whitespace-nowrap"
                  data-testid="carer-timebank-weeks"
                >
                  <thead className="bg-muted/60">
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2.5 font-medium">Week</th>
                      <th className="px-3 py-2.5 font-medium">Status</th>
                      <th className="px-3 py-2.5 font-medium" title="Contracted hours less days off">
                        Contracted
                      </th>
                      <th className="px-3 py-2.5 font-medium">Days off</th>
                      <th className="px-3 py-2.5 font-medium">Assigned</th>
                      <th className="px-3 py-2.5 font-medium">Worked</th>
                      <th className="px-3 py-2.5 font-medium">Scheduled</th>
                      <th className="px-3 py-2.5 font-medium">Not approved for pay</th>
                      <th className="px-3 py-2.5 font-medium">Cancelled</th>
                      <th className="px-3 py-2.5 font-medium">Not given</th>
                      <th className="px-3 py-2.5 font-medium">Not worked</th>
                      <th className="px-3 py-2.5 font-medium">Short / left to give</th>
                      <th className="px-3 py-2.5 font-medium">Added to bank</th>
                      <th className="px-3 py-2.5 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeks.map(w => {
                      const open = openWeeks.has(w.weekStart)
                      const amber = (n: number) =>
                        cn('px-3 py-2.5 tabular-nums', n > 0 && 'text-amber-700 dark:text-amber-400')
                      return (
                        <React.Fragment key={w.weekStart}>
                          <tr
                            className={cn(
                              'cursor-pointer border-b border-border last:border-0 hover:bg-muted/40',
                              open && 'bg-muted/50',
                            )}
                            onClick={() => toggleWeek(w.weekStart)}
                            aria-expanded={open}
                            data-week={w.weekStart}
                            data-testid="carer-timebank-week-row"
                          >
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5">
                                {open ? (
                                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                                )}
                                {weekRange(w)}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <StatusBadge status={w.status} />
                            </td>
                            <td className="px-3 py-2.5 tabular-nums">{formatMinutes(w.setMinutes)}</td>
                            <td className="px-3 py-2.5 tabular-nums">{w.absentDays > 0 ? w.absentDays : '0'}</td>
                            <td className="px-3 py-2.5 tabular-nums">{formatMinutes(w.assignedMinutes)}</td>
                            <td className="px-3 py-2.5 tabular-nums">{formatMinutes(w.workedMinutes)}</td>
                            <td className="px-3 py-2.5 tabular-nums">{formatMinutes(w.scheduledMinutes)}</td>
                            <td className="px-3 py-2.5 tabular-nums">{formatMinutes(w.pendingMinutes)}</td>
                            <td className="px-3 py-2.5 tabular-nums">{formatMinutes(w.cancelledMinutes)}</td>
                            <td className={amber(w.notGivenMinutes)}>{formatMinutes(w.notGivenMinutes)}</td>
                            <td className={amber(w.notWorkedMinutes)}>{formatMinutes(w.notWorkedMinutes)}</td>
                            <td className={cn(amber(w.freeMinutes), w.freeMinutes > 0 && 'font-medium')}>
                              {shortLabel(w)}
                            </td>
                            <td className="px-3 py-2.5 tabular-nums">
                              {w.addedToBankMinutes > 0 ? `+${formatMinutes(w.addedToBankMinutes)}` : '0'}
                            </td>
                            <td className="px-3 py-2.5 font-semibold tabular-nums">
                              {w.status === 'complete' || w.status === 'short' ? formatMinutes(w.balanceMinutes) : '—'}
                            </td>
                          </tr>
                          {open ? (
                            <tr className="border-b border-border last:border-0">
                              <td colSpan={14} className="bg-muted/20 px-4 py-3">
                                <WeekVisits week={w} />
                              </td>
                            </tr>
                          ) : null}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </ContentCard>
        </>
      )}
    </div>
  )
}
