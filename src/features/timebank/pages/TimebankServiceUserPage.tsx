import * as React from 'react'
import { ArrowLeft, ChevronDown, ChevronRight, Hourglass, Loader2 } from 'lucide-react'
import { Link, useParams, useSearch } from '@tanstack/react-router'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { ContentCard } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store'
import { VISIT_CANCELLATION_REASONS } from '@/features/scheduling/utils/visit-cancellation.constants'
import { visitCareNotDeliveredReasonLabel } from '@/features/scheduling/utils/visit-care-not-delivered-reason.util'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { useTimebankDetail } from '@/features/timebank/hooks/useTimebank'
import { OverCareTag } from '@/features/timebank/components/OverCareNotes'
import {
  BankPaymentSummary,
  BankWeekPaymentLine,
  useBankWeekPayment,
} from '@/features/timebank/components/TimebankInvoiceStatus'
import { AwaitingVisitActions } from '@/features/timebank/components/AwaitingClockOut'
import { ChargeableNote } from '@/features/timebank/components/ChargeableCancellations'
import { timebankEntryReasonLabel } from '@/features/timebank/components/TimebankNotes'
import { formatOrganisationDateTime } from '@/shared/lib/organisation-display-format.store'
import { TimebankFillBar, TimebankFillLegend, shortReasonsLine } from '@/features/timebank/components/TimebankFill'
import type { TimebankWeek, TimebankWeekStatus } from '@/features/timebank/types'
import {
  formatMinutes,
  mondayOf,
  SHORT_REASON_LABEL,
  VISIT_OUTCOME_LABEL,
  VISIT_OUTCOME_TONE,
  WEEK_STATUS_LABEL,
  WEEK_STATUS_TONE,
} from '@/features/timebank/timebank-format'

type WeekFilter = 'all' | 'short' | 'complete' | 'coming'

const WEEK_FILTERS: Array<{
  id: WeekFilter
  label: string
  matches: (s: TimebankWeekStatus) => boolean
}> = [
  { id: 'all', label: 'All weeks', matches: () => true },
  { id: 'short', label: 'Short', matches: s => s === 'short' },
  { id: 'complete', label: 'Delivered', matches: s => s === 'complete' },
  {
    id: 'coming',
    label: 'This week and scheduled',
    matches: s => s === 'current' || s === 'upcoming',
  },
]

function StatCard({
  label,
  value,
  hint,
  tone,
  children,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'warning' | 'strong'
  children?: React.ReactNode
}) {
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
      {children}
    </div>
  )
}

/** Opens Visit reconciliation for this service user, where the office approves visits for invoice. */
function SeeVisitsLink({ serviceUserId }: { serviceUserId: string }) {
  const canOpen = useAuthStore(s => s.can('billing.visit_reconciliations.read' as never))
  if (!canOpen) return null
  return (
    <Link
      to="/billing/visit-reconciliation"
      search={{ serviceUserId }}
      className="mt-1.5 inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
      data-testid="timebank-see-visits"
    >
      See these visits <ChevronRight className="h-3 w-3" aria-hidden />
    </Link>
  )
}

function StatusBadge({ status }: { status: TimebankWeekStatus }) {
  return (
    <span className={cn('inline-flex rounded-md border px-2 py-0.5 text-xs font-medium', WEEK_STATUS_TONE[status])}>
      {WEEK_STATUS_LABEL[status]}
    </span>
  )
}

const CANCEL_REASON_LABEL = new Map<string, string>(VISIT_CANCELLATION_REASONS.map(r => [r.code, r.label]))

/** The cancellation reason and any note typed with it. */
function CancelReason({ code, notes }: { code: string | null; notes: string | null }) {
  return (
    <>
      {code && code !== 'OTHER' ? (
        <span className="text-muted-foreground">
          {' — '}
          {CANCEL_REASON_LABEL.get(code) ?? code}
        </span>
      ) : null}
      {notes ? <div className="text-xs text-muted-foreground">“{notes}”</div> : null}
    </>
  )
}

/** Every rota visit of one week, shown when its row is opened. */
function WeekVisits({ week }: { week: TimebankWeek }) {
  const { formatDate, formatTime } = useOrganisationDisplayFormat()
  return (
    <div className="flex flex-col gap-2" data-testid="timebank-week-visits">
      {week.reasons.notBookedMinutes > 0 ? (
        <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
          {formatMinutes(week.reasons.notBookedMinutes)} of this week's contracted hours had no visit on the rota.
        </p>
      ) : null}
      {week.visits.awaiting > 0 ? (
        <p className="text-xs font-medium text-violet-700 dark:text-violet-400">
          {week.visits.awaiting} {week.visits.awaiting === 1 ? 'visit is' : 'visits are'} awaiting clock-out (
          {formatMinutes(week.awaitingMinutes)}) — not counted in the timebank until the office closes{' '}
          {week.visits.awaiting === 1 ? 'it' : 'them'}.
        </p>
      ) : null}
      {week.allVisits.length === 0 ? (
        <p className="text-sm text-muted-foreground">No visits on the rota this week.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-background">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/60">
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Visit</th>
                <th className="px-3 py-2 font-medium">Planned</th>
                <th className="px-3 py-2 font-medium">Delivered</th>
                <th className="px-3 py-2 font-medium">Not approved for invoice</th>
                <th className="px-3 py-2 font-medium">Short</th>
                <th className="px-3 py-2 font-medium">What happened</th>
              </tr>
            </thead>
            <tbody>
              {week.allVisits.map(v => (
                <tr key={v.jobId} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <p className="font-medium text-foreground">{v.jobName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(v.day)} · {formatTime(v.start)}
                      {v.end ? `–${formatTime(v.end)}` : ''}
                    </p>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{formatMinutes(v.plannedMinutes)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatMinutes(v.deliveredMinutes)}</td>
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
                    <span className={cn('font-medium', VISIT_OUTCOME_TONE[v.outcome])}>
                      {VISIT_OUTCOME_LABEL[v.outcome]}
                    </span>
                    <CancelReason code={v.cancelReasonCode} notes={v.cancelReasonNotes} />
                    {v.outcome === 'CHARGEABLE_CANCELLATION' ? <ChargeableNote noticeHours={v.cancelNoticeHours} /> : null}
                    {v.careNotDelivered ? (
                      <>
                        {v.careNotDelivered.reasonCode ? (
                          <span className="text-muted-foreground">
                            {' — '}
                            {visitCareNotDeliveredReasonLabel(v.careNotDelivered.reasonCode) ??
                              v.careNotDelivered.reasonCode}
                          </span>
                        ) : null}
                        {v.careNotDelivered.notes ? (
                          <div className="text-xs text-muted-foreground">“{v.careNotDelivered.notes}”</div>
                        ) : null}
                        <div className="text-xs text-muted-foreground">
                          Full planned time counted; nothing added to the timebank.
                        </div>
                      </>
                    ) : null}
                    {v.outcome === 'AWAITING_CLOCK_OUT' ? (
                      <div className="text-xs text-muted-foreground">
                        Clocked in, no clock-out. Not counted until the visit is closed.
                        <div className="mt-1 flex items-center gap-1">
                          <AwaitingVisitActions jobId={v.jobId} day={v.day} />
                        </div>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function shortLabel(week: TimebankWeek): string {
  return week.freeMinutes > 0 ? `−${formatMinutes(week.freeMinutes)}` : '0'
}

export default function TimebankServiceUserPage() {
  const { serviceUserId = '' } = useParams({ strict: false }) as {
    serviceUserId?: string
  }
  const searchParams = useSearch({ strict: false }) as { week?: string }
  const { formatDate, formatTime } = useOrganisationDisplayFormat()
  const [filter, setFilter] = React.useState<WeekFilter>('all')
  const weekStart =
    searchParams.week && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.week) ? mondayOf(searchParams.week) : undefined

  const query = useTimebankDetail(serviceUserId, weekStart)
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

  // Timebank hours on the invoice: paid / not paid / not invoiced yet per week.
  const bankPayment = useBankWeekPayment(data)

  /** Hours each week still holds from the timebank (taken less given back). */
  const fromBankByWeek = React.useMemo(() => {
    const byWeek = new Map<string, number>()
    for (const e of data?.timebank.entries ?? []) {
      byWeek.set(e.weekStart, (byWeek.get(e.weekStart) ?? 0) + (e.kind === 'RESERVED' ? e.minutes : -e.minutes))
    }
    return byWeek
  }, [data?.timebank.entries])

  const weekRange = (w: { weekStart: string; weekEnd: string }) =>
    `${formatDate(w.weekStart)} – ${formatDate(w.weekEnd)}`

  return (
    <div className="flex flex-col gap-4 p-5" data-testid="timebank-service-user-page">
      <PageHeader
        title={data ? `Timebank — ${data.serviceUser.name}` : 'Timebank'}
        description="Weekly hours set against the care delivered, week by week."
        icon={<Hourglass className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Reports' },
          { label: 'Timebank', href: '/reports/timebank' },
          { label: data?.serviceUser.name ?? 'Service user' },
        ]}
      />
      <div>
        <Link
          to="/reports/timebank"
          search={weekStart ? { week: weekStart } : {}}
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
        <p className="p-6 text-sm text-destructive">Couldn't load this service user's timebank. Try again.</p>
      ) : (
        <>
          <ContentCard className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-foreground">{data.serviceUser.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[
                    data.serviceUser.serviceUserNumber,
                    data.serviceUser.location?.name,
                    data.serviceUser.fundingType?.name,
                    data.serviceUser.weeklyHours != null
                      ? `${data.serviceUser.weeklyHours}h a week now`
                      : 'No weekly hours set',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Since {formatDate(data.startDate)}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5" data-testid="timebank-totals">
              <StatCard
                label="Contracted hours"
                value={formatMinutes(data.totals.setMinutes)}
                hint={`Since care started${data.totals.includesCurrentWeek ? ', including this week' : ''}`}
              />
              <StatCard
                label="Delivered"
                value={formatMinutes(data.totals.deliveredMinutes)}
                hint={`Approved for invoice · Invoiced ${formatMinutes(data.totals.invoicedMinutes)} · Not invoiced yet ${formatMinutes(
                  data.totals.deliveredMinutes - data.totals.invoicedMinutes,
                )}`}
              />
              <StatCard
                label="Delivered, not approved for invoice"
                value={formatMinutes(data.totals.pendingMinutes)}
                hint="Visits done, waiting for the office to approve them for invoice. Not in the timebank until decided."
              >
                {data.totals.pendingMinutes > 0 ? <SeeVisitsLink serviceUserId={data.serviceUser.id} /> : null}
              </StatCard>
              <StatCard
                label="In timebank"
                value={formatMinutes(data.timebank.availableMinutes)}
                tone="warning"
                hint={`Contracted hours not delivered: ${formatMinutes(data.timebank.earnedMinutes)} in ${data.totals.weeks} finished weeks (this week adds when it ends)${
                  data.timebank.reservedMinutes > 0
                    ? ` · ${formatMinutes(data.timebank.reservedMinutes)} held by visits over the weekly hours`
                    : ''
                }`}
              >
                <BankPaymentSummary data={data} statusOf={bankPayment.statusOf} />
              </StatCard>
              {data.totals.thisWeek ? (
                <button
                  type="button"
                  className="rounded-lg border border-sky-200 bg-sky-50/60 px-4 py-3 text-left hover:bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40"
                  onClick={() => openWeek(data.totals.thisWeek!.weekStart)}
                  data-testid="timebank-this-week-card"
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

          {data.timebank.entries.length > 0 || data.timebank.useTimebank ? (
            <ContentCard className="p-4" data-testid="timebank-ledger-card">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Timebank used</h2>
                <p className="text-xs text-muted-foreground">
                  {data.timebank.useTimebank
                    ? 'Visits over the weekly hours take the hours over from the timebank when it has all of them (Settings → Dom Rules). Cancelled visits (unless charged), and visits not delivered in full, give them back.'
                    : 'Using the timebank for visits over the weekly hours is off (Settings → Dom Rules).'}
                </p>
              </div>
              {data.timebank.entries.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No hours taken from the timebank yet.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm" data-testid="timebank-ledger">
                    <thead className="bg-muted/60">
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="px-3 py-2 font-medium">When</th>
                        <th className="px-3 py-2 font-medium">Visit</th>
                        <th className="px-3 py-2 font-medium">Taken / given back</th>
                        <th className="px-3 py-2 font-medium">Why</th>
                        <th className="px-3 py-2 font-medium">By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.timebank.entries.map(e => (
                        <tr key={e.id} className="border-b border-border/60 last:border-0">
                          <td className="px-3 py-2 tabular-nums">
                            {formatOrganisationDateTime(e.createdAt)}
                          </td>
                          <td className="px-3 py-2">
                            {e.scheduledJob ? (
                              <>
                                {e.scheduledJob.jobName}
                                <span className="text-muted-foreground">
                                  {' '}
                                  · {formatOrganisationDateTime(e.scheduledJob.scheduledStartDateTime)}
                                </span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">Visit removed</span>
                            )}
                          </td>
                          <td
                            className={cn(
                              'px-3 py-2 font-medium tabular-nums',
                              e.kind === 'RESERVED' ? 'text-amber-700 dark:text-amber-400' : 'text-foreground',
                            )}
                          >
                            {e.kind === 'RESERVED' ? '−' : '+'}
                            {formatMinutes(e.minutes)}
                          </td>
                          <td className="px-3 py-2">
                            {timebankEntryReasonLabel(e.reason)}
                            {e.note ? <span className="block text-xs text-muted-foreground">{e.note}</span> : null}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {e.createdBy ? `${e.createdBy.firstName ?? ''} ${e.createdBy.lastName ?? ''}`.trim() : 'System'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ContentCard>
          ) : null}

          <ContentCard className="p-4" data-testid="timebank-short-visits-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Visits not fully delivered</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Visits that were cancelled, missed, shorter than planned or not approved for invoice. A chargeable
                  cancellation is paid for, so it is not short and adds nothing to the timebank.
                </p>
              </div>
              <select
                className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={visitsWeek}
                onChange={e => setVisitsWeek(e.target.value)}
                aria-label="Show visits of week"
                data-testid="timebank-visits-week"
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
                {visitsWeek ? 'Every visit of this week was delivered in full.' : 'Every visit was delivered in full.'}
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-md border border-border">
                <table
                  className="w-full min-w-[720px] text-sm [&_td]:whitespace-nowrap"
                  data-testid="timebank-short-visits"
                >
                  <thead className="bg-muted/60">
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Visit</th>
                      <th className="px-3 py-2 font-medium">Planned</th>
                      <th className="px-3 py-2 font-medium">Delivered</th>
                      <th className="px-3 py-2 font-medium">Short</th>
                      <th className="px-3 py-2 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownVisits.map(v => (
                      <tr key={v.jobId} className="border-b border-border last:border-0">
                        <td className="px-3 py-2">
                          <p className="font-medium text-foreground">{v.jobName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(v.day)} · {formatTime(v.start)}
                            {v.end ? `–${formatTime(v.end)}` : ''}
                          </p>
                        </td>
                        <td className="px-3 py-2 tabular-nums">{formatMinutes(v.plannedMinutes)}</td>
                        <td className="px-3 py-2 tabular-nums">
                          {formatMinutes(v.deliveredMinutes)}
                          {v.pendingMinutes > 0 ? (
                            <span className="text-xs text-muted-foreground">
                              {' '}
                              + {formatMinutes(v.pendingMinutes)} not approved for invoice
                            </span>
                          ) : null}
                        </td>
                        <td
                          className={cn(
                            'px-3 py-2 tabular-nums',
                            v.shortMinutes > 0 && 'font-medium text-amber-700 dark:text-amber-400',
                          )}
                        >
                          {formatMinutes(v.shortMinutes)}
                        </td>
                        <td className="px-3 py-2">
                          {SHORT_REASON_LABEL[v.reason]}
                          <CancelReason code={v.cancelReasonCode} notes={v.cancelReasonNotes} />
                          {v.reason === 'CHARGEABLE_CANCELLATION' ? (
                            <ChargeableNote noticeHours={v.cancelNoticeHours} />
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ContentCard>

          <ContentCard className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-foreground">Week by week</p>
                <TimebankFillLegend shortLabel="Short / left to give" showScheduled />
              </div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show weeks">
                {WEEK_FILTERS.map(f => (
                  <Button
                    key={f.id}
                    type="button"
                    size="sm"
                    variant={filter === f.id ? 'default' : 'outline'}
                    onClick={() => setFilter(f.id)}
                    data-testid={`timebank-week-filter-${f.id}`}
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
                <table className="w-full min-w-[1080px] text-sm [&_td]:whitespace-nowrap" data-testid="timebank-weeks">
                  <thead className="bg-muted/60">
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2.5 font-medium">Week</th>
                      <th className="px-3 py-2.5 font-medium">Status</th>
                      <th className="px-3 py-2.5 font-medium">Contracted</th>
                      <th className="px-3 py-2.5 font-medium">Delivered</th>
                      <th className="px-3 py-2.5 font-medium">Not approved for invoice</th>
                      <th className="px-3 py-2.5 font-medium">Awaiting clock-out</th>
                      <th className="px-3 py-2.5 font-medium">Scheduled</th>
                      <th className="px-3 py-2.5 font-medium">Chargeable cancellation</th>
                      <th className="px-3 py-2.5 font-medium">Short / left to give</th>
                      <th className="px-3 py-2.5 font-medium">Added to bank</th>
                      <th className="px-3 py-2.5 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeks.map(w => {
                      const open = openWeeks.has(w.weekStart)
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
                            data-testid="timebank-week-row"
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
                            <td className="px-3 py-2.5 tabular-nums">
                              {formatMinutes(w.setMinutes)}
                              <TimebankFillBar
                                minutes={{
                                  delivered: w.deliveredMinutes,
                                  pending: w.pendingMinutes,
                                  awaiting: w.awaitingMinutes,
                                  scheduled: w.scheduledMinutes,
                                  chargeable: w.chargeableCancelMinutes,
                                  short: w.freeMinutes,
                                }}
                              />
                            </td>
                            <td
                              className={cn(
                                'px-3 py-2.5 tabular-nums',
                                w.deliveredMinutes > 0 && 'font-medium text-emerald-700 dark:text-emerald-400',
                              )}
                            >
                              {formatMinutes(w.deliveredMinutes)}
                            </td>
                            <td className="px-3 py-2.5 tabular-nums">{formatMinutes(w.pendingMinutes)}</td>
                            <td
                              className={cn(
                                'px-3 py-2.5 tabular-nums',
                                w.awaitingMinutes > 0 && 'font-medium text-violet-700 dark:text-violet-400',
                              )}
                            >
                              {formatMinutes(w.awaitingMinutes)}
                            </td>
                            <td className="px-3 py-2.5 tabular-nums">{formatMinutes(w.scheduledMinutes)}</td>
                            <td
                              className={cn(
                                'px-3 py-2.5 tabular-nums',
                                w.chargeableCancelMinutes > 0 && 'font-medium text-rose-700 dark:text-rose-400',
                              )}
                            >
                              {formatMinutes(w.chargeableCancelMinutes)}
                            </td>
                            <td
                              className={cn(
                                'px-3 py-2.5 tabular-nums',
                                w.freeMinutes > 0 && 'font-medium text-amber-700 dark:text-amber-400',
                              )}
                            >
                              {shortLabel(w)}
                              {w.freeMinutes <= 0 && w.overMinutes > 0 ? (
                                <span className="block text-xs font-normal text-muted-foreground">
                                  {[
                                    `+${formatMinutes(w.overMinutes)} over contract` +
                                      (w.chargeableCancelMinutes > 0
                                        ? ` (${formatMinutes(w.chargeableCancelMinutes)} is a chargeable cancellation)`
                                        : ''),
                                    (fromBankByWeek.get(w.weekStart) ?? 0) > 0
                                      ? `${formatMinutes(fromBankByWeek.get(w.weekStart) ?? 0)} from timebank`
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </span>
                              ) : null}
                              {w.freeMinutes > 0 && shortReasonsLine(w.reasons) ? (
                                <span className="block text-xs font-normal text-muted-foreground">
                                  {shortReasonsLine(w.reasons)}
                                </span>
                              ) : null}
                              <OverCareTag
                                serviceUserId={serviceUserId}
                                weekStart={w.weekStart}
                                overMinutes={w.overCareMinutes}
                                adjustment={w.overCareAdjustment}
                                takenBack={w.overCareTakenBack}
                                setting={data.overCare}
                                currentWeekStart={data.currentWeekStart}
                              />
                            </td>
                            <td className="px-3 py-2.5 tabular-nums">
                              {w.addedToBankMinutes > 0 ? `+${formatMinutes(w.addedToBankMinutes)}` : '0'}
                              <BankWeekPaymentLine {...bankPayment.statusOf(w)} />
                            </td>
                            <td className="px-3 py-2.5 font-semibold tabular-nums">
                              {w.status === 'complete' || w.status === 'short' ? formatMinutes(w.balanceMinutes) : '—'}
                            </td>
                          </tr>
                          {open ? (
                            <tr className="border-b border-border last:border-0">
                              <td colSpan={11} className="bg-muted/20 px-4 py-3">
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
