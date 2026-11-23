import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, CheckCircle2, Gauge, Minus } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { PageHeader } from '@/shared/ui/page-elements'
import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/utils'
import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'
import { feedbackSelectClass } from '@/features/complaints/components/FeedbackFormDialog'
import { InfoTip } from '@/features/cqc-mock-inspection/components/InfoTip'
import { useBranchOptions } from '@/features/cqc-mock-inspection/components/StartInspectionDialog'
import { RATING_LABEL, ratingVariant } from '@/features/cqc-mock-inspection/labels'
import { STATUS_LABEL as NOTIFICATION_STATUS } from '@/features/cqc-notifications/labels'
import type { AttentionKind, CqcDashboard, CqcRating } from '../types'
import { useCqcDashboard } from '../hooks'
import { KEY_QUESTION_LABEL, NOTIFICATION_TYPE_LABEL, pct, ratingChange } from '../labels'

const ATTENTION_LINK: Record<AttentionKind, string> = {
  EVIDENCE_GAPS: '/governance/cqc-evidence',
  EVIDENCE_REVIEW_OVERDUE: '/governance/cqc-evidence',
  ACTIONS_OVERDUE: '/governance/mock-inspections',
  NOTIFICATIONS_OVERDUE: '/governance/cqc-notifications',
  NO_RECENT_MOCK: '/governance/mock-inspections',
}

const s = (n: number, one: string, many: string) => (n === 1 ? one : many)

/** One short, plain sentence for each thing to fix. */
function attentionText(kind: AttentionKind, n: number, hasCompletedMock: boolean): string {
  switch (kind) {
    case 'EVIDENCE_GAPS':
      return `${n} quality ${s(n, 'statement still needs', 'statements still need')} evidence`
    case 'EVIDENCE_REVIEW_OVERDUE':
      return `${n} ${s(n, 'piece', 'pieces')} of evidence ${s(n, 'needs', 'need')} reviewing`
    case 'ACTIONS_OVERDUE':
      return `${n} improvement ${s(n, 'action is', 'actions are')} late`
    case 'NOTIFICATIONS_OVERDUE':
      return `${n} CQC ${s(n, 'notification is', 'notifications are')} late and not sent`
    case 'NO_RECENT_MOCK':
      return hasCompletedMock ? 'No mock inspection in the last 6 months' : 'No mock inspection completed yet'
  }
}

const date = (d: string | null | undefined) => (d ? formatOrganisationDate(d) : '—')

function Rating({ rating, size = 'sm' }: { rating: CqcRating | null | undefined; size?: 'sm' | 'md' | 'lg' }) {
  return rating ? (
    <Badge size={size} variant={ratingVariant(rating)}>
      {RATING_LABEL[rating]}
    </Badge>
  ) : (
    <span className="text-sm text-muted-foreground">Not rated yet</span>
  )
}

/** Governance → CQC dashboard: how ready the service is for CQC, at a glance. */
export default function CqcDashboardPage() {
  const navigate = useNavigate()
  const { wholeOrg, options } = useBranchOptions(true)
  const [locationId, setLocationId] = React.useState('')
  const query = useCqcDashboard({ locationId: locationId || undefined })
  const d = query.data
  const error = query.error instanceof ApiError ? query.error.message : query.error ? 'Could not load the CQC dashboard.' : null

  return (
    <div className="flex flex-col gap-5" data-testid="cqc-dashboard-page">
      <PageHeader
        title="CQC dashboard"
        description="Are we ready for CQC? Fix the things in the first box, then check each key question."
        icon={<Gauge className="h-4 w-4 text-muted-foreground" aria-hidden />}
        info={
          <>
            Brings together CQC evidence, mock inspections and CQC notifications for the branch you choose. You only see
            the parts you have access to.
          </>
        }
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Governance' }, { label: 'CQC dashboard' }]}
        actions={[
          {
            label: 'CQC reports',
            onClick: () => void navigate({ to: '/governance/cqc-reports' }),
            icon: <BarChart3 className="h-4 w-4" />,
            variant: 'outline' as const,
          },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <select
          className={`${feedbackSelectClass} max-w-[16rem]`}
          value={locationId}
          onChange={e => setLocationId(e.target.value)}
          aria-label="Branch"
          data-testid="cqc-dashboard-branch"
        >
          <option value="">{wholeOrg ? 'All branches' : 'All my branches'}</option>
          {options.map(o => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        {d ? <span className="text-xs text-muted-foreground">Updated {formatOrganisationDate(d.generatedAt)}</span> : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {query.isLoading && !d ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

      {d ? (
        <>
          <Attention items={d.attention} hasCompletedMock={Boolean(d.mock?.lastCompletedAt)} />
          <Tiles d={d} />
          <KeyQuestions d={d} />
          <div className="grid gap-4 lg:grid-cols-2">
            {d.mock ? <NextActions mock={d.mock} /> : null}
            {d.notifications ? <OpenNotifications n={d.notifications} /> : null}
          </div>
        </>
      ) : null}
    </div>
  )
}

function Attention({ items, hasCompletedMock }: { items: CqcDashboard['attention']; hasCompletedMock: boolean }) {
  if (!items.length)
    return (
      <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm font-medium text-success" data-testid="cqc-attention-none">
        <CheckCircle2 className="h-4 w-4" aria-hidden />
        All good. Nothing to fix right now.
      </div>
    )
  return (
    <section className="rounded-xl border border-warning/40 bg-warning/5 p-4" data-testid="cqc-attention">
      <h2 className="flex items-center gap-1.5 text-base font-semibold text-foreground">
        <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />
        Things to fix ({items.length})
      </h2>
      <ul className="mt-3 space-y-2">
        {items.map(a => (
          <li key={a.kind} className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2 text-sm shadow-sm" data-testid="cqc-attention-item">
            <span className="text-foreground">{attentionText(a.kind, a.count, hasCompletedMock)}</span>
            <Link to={ATTENTION_LINK[a.kind]} className="shrink-0 text-sm font-medium text-primary hover:underline">
              Fix →
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Tile({ label, children, info, testId }: { label: string; children: React.ReactNode; info?: React.ReactNode; testId: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm" data-testid={testId}>
      <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        {label}
        {info ? <InfoTip label={label.toLowerCase()}>{info}</InfoTip> : null}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  )
}

/** The one-line note under a tile's number: red when something is late, grey otherwise. */
function Note({ bad, children }: { bad?: boolean; children: React.ReactNode }) {
  return <p className={cn('mt-1 text-sm', bad ? 'font-medium text-destructive' : 'text-muted-foreground')}>{children}</p>
}

function Tiles({ d }: { d: CqcDashboard }) {
  const latest = d.mock?.latest
  const change = ratingChange(latest?.overall, d.mock?.previous?.overall)
  const ev = d.evidence?.totals
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold text-foreground">At a glance</h2>
      <div className={cn('grid gap-3 sm:grid-cols-2', d.mock ? 'lg:grid-cols-3 xl:grid-cols-5' : 'xl:grid-cols-4')}>
        {d.mock ? (
          <Tile label="Mock inspections" testId="cqc-tile-mock-counts" info={<>How many mock inspections have been completed, are still in progress or were cancelled.</>}>
            <p className="text-2xl font-semibold tabular-nums">{d.mock.counts.total} in total</p>
            <ul className="mt-1 space-y-0.5 text-sm">
              <li className="flex justify-between gap-2" data-testid="cqc-mock-count-completed">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium tabular-nums text-success">{d.mock.counts.completed}</span>
              </li>
              <li className="flex justify-between gap-2" data-testid="cqc-mock-count-in-progress">
                <span className="text-muted-foreground">In progress</span>
                <span className="font-medium tabular-nums text-warning">{d.mock.counts.inProgress}</span>
              </li>
              <li className="flex justify-between gap-2" data-testid="cqc-mock-count-cancelled">
                <span className="text-muted-foreground">Cancelled</span>
                <span className="font-medium tabular-nums">{d.mock.counts.cancelled}</span>
              </li>
            </ul>
          </Tile>
        ) : null}
        {d.mock ? (
          <Tile
            label="Latest overall rating"
            testId="cqc-tile-mock"
            info={
              <>
                The overall rating of the last completed mock inspection that gives one (a full inspection), compared with the one
                before. Focused inspections rate only some key questions, so they show under Key questions instead.
              </>
            }
          >
            {latest ? (
              <>
                <Rating rating={latest.overall} size="lg" />
                {change === 1 ? (
                  <p className="mt-1 inline-flex items-center gap-0.5 text-sm text-success"><ArrowUpRight className="h-4 w-4" aria-hidden />Better than last time</p>
                ) : change === -1 ? (
                  <p className="mt-1 inline-flex items-center gap-0.5 text-sm text-destructive"><ArrowDownRight className="h-4 w-4" aria-hidden />Worse than last time</p>
                ) : change === 0 ? (
                  <p className="mt-1 inline-flex items-center gap-0.5 text-sm text-muted-foreground"><Minus className="h-4 w-4" aria-hidden />Same as last time</p>
                ) : null}
                <Link to="/governance/mock-inspections/$inspectionId" params={{ inspectionId: latest.id }} className="mt-1 block text-sm text-primary hover:underline">
                  {date(latest.completedAt)} · View
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No mock inspection completed yet.</p>
            )}
          </Tile>
        ) : null}
        {ev ? (
          <Tile label="Evidence" testId="cqc-tile-evidence" info={<>Quality statements that have at least one current piece of CQC evidence.</>}>
            <p className="text-2xl font-semibold tabular-nums">
              {ev.covered}
              <span className="text-base font-normal text-muted-foreground"> / {ev.statements}</span>
            </p>
            <Bar value={pct(ev.covered, ev.statements)} />
            <Note bad={ev.gaps > 0}>{ev.gaps ? `${ev.gaps} still need evidence` : 'Every statement has evidence'}</Note>
          </Tile>
        ) : null}
        {d.mock ? (
          <Tile label="Improvement actions" testId="cqc-tile-actions" info={<>Actions raised by mock inspections that are not done yet.</>}>
            <p className="text-2xl font-semibold tabular-nums">{d.mock.actions.open} open</p>
            <Note bad={d.mock.actions.overdue > 0}>{d.mock.actions.overdue ? `${d.mock.actions.overdue} overdue` : 'None late'}</Note>
          </Tile>
        ) : null}
        {d.notifications ? (
          <Tile label="CQC notifications" testId="cqc-tile-notifications" info={<>Statutory notifications that are still a draft or ready, and not yet sent to CQC.</>}>
            <p className="text-2xl font-semibold tabular-nums">{d.notifications.open} to send</p>
            <Note bad={d.notifications.overdue > 0}>{d.notifications.overdue ? `${d.notifications.overdue} late` : 'None late'}</Note>
          </Tile>
        ) : null}
      </div>
    </section>
  )
}

function Bar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('mt-2 h-2 overflow-hidden rounded-full bg-muted', className)} aria-hidden>
      <div className={cn('h-full', value >= 80 ? 'bg-success' : value >= 50 ? 'bg-warning' : 'bg-destructive')} style={{ width: `${value}%` }} />
    </div>
  )
}

function KeyQuestions({ d }: { d: CqcDashboard }) {
  const codes = d.evidence?.keyQuestions.map(k => k.code) ?? d.mock?.keyQuestions.map(k => k.code) ?? []
  if (!codes.length) return null
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm" data-testid="cqc-key-questions">
      <h2 className="text-base font-semibold text-foreground">Key questions</h2>
      <div className="mt-2 hidden grid-cols-[1fr_10rem_1fr] gap-4 border-b border-border pb-2 text-xs font-medium text-muted-foreground sm:grid">
        <span>Key question</span>
        {d.mock ? <span>Mock rating</span> : <span />}
        {d.evidence ? <span>Statements with evidence</span> : <span />}
      </div>
      <ul className="divide-y divide-border">
        {codes.map(code => {
          const ev = d.evidence?.keyQuestions.find(k => k.code === code)
          const mock = d.mock?.keyQuestions.find(k => k.code === code)
          return (
            <li key={code} className="grid gap-2 py-3 sm:grid-cols-[1fr_10rem_1fr] sm:items-center sm:gap-4" data-testid="cqc-key-question">
              <span className="font-medium text-foreground">{KEY_QUESTION_LABEL[code] ?? ev?.title ?? code}</span>
              {d.mock ? (
                <span className="min-w-0">
                  <Rating rating={mock?.rating} />
                  {mock ? (
                    <Link
                      to="/governance/mock-inspections/$inspectionId"
                      params={{ inspectionId: mock.inspectionId }}
                      className="mt-0.5 block truncate text-xs text-muted-foreground hover:underline"
                      title={mock.inspectionTitle}
                    >
                      {date(mock.completedAt)}
                    </Link>
                  ) : null}
                </span>
              ) : (
                <span />
              )}
              {ev ? (
                <div>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="tabular-nums">
                      {ev.coveredCount} / {ev.statementCount}
                    </span>
                    {ev.gapCount ? <span className="text-xs text-warning">{ev.gapCount} missing</span> : <span className="text-xs text-success">Complete</span>}
                  </div>
                  <Bar value={pct(ev.coveredCount, ev.statementCount)} className="mt-1" />
                </div>
              ) : (
                <span />
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function NextActions({ mock }: { mock: NonNullable<CqcDashboard['mock']> }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm" data-testid="cqc-next-actions">
      <h2 className="text-base font-semibold text-foreground">Next improvement actions</h2>
      {mock.actions.next.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No open actions.</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {mock.actions.next.map(a => (
            <li key={a.id} className="flex items-start justify-between gap-3 py-2 text-sm">
              <Link to="/governance/mock-inspections/$inspectionId" params={{ inspectionId: a.inspectionId }} className="min-w-0 hover:underline">
                <span className="font-medium text-foreground">{a.title}</span>
                {a.statementTitle ? <span className="block text-xs text-muted-foreground">{a.statementTitle}</span> : null}
              </Link>
              <span className={cn('shrink-0 text-xs', a.overdue ? 'font-medium text-destructive' : 'text-muted-foreground')}>
                {a.dueAt ? `${a.overdue ? 'Late · was due ' : 'Due '}${date(a.dueAt)}` : 'No due date'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function OpenNotifications({ n }: { n: NonNullable<CqcDashboard['notifications']> }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm" data-testid="cqc-open-notifications">
      <h2 className="text-base font-semibold text-foreground">CQC notifications to send</h2>
      {n.next.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nothing waiting to be sent.</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {n.next.map(x => (
            <li key={x.id} className="flex items-start justify-between gap-3 py-2 text-sm">
              <Link to="/governance/cqc-notifications/$notificationId" params={{ notificationId: x.id }} className="min-w-0 hover:underline">
                <span className="font-medium text-foreground">{NOTIFICATION_TYPE_LABEL[x.type] ?? x.type}</span>
                <span className="block text-xs text-muted-foreground">
                  {x.referenceNumber} · {NOTIFICATION_STATUS[x.status as keyof typeof NOTIFICATION_STATUS] ?? x.status}
                </span>
              </Link>
              <span className={cn('shrink-0 text-xs', x.overdue ? 'font-medium text-destructive' : 'text-muted-foreground')}>
                {x.overdue ? 'Late · was due ' : 'Send by '}
                {date(x.dueAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
