import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3, Printer } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { PageHeader } from '@/shared/ui/page-elements'
import { Badge } from '@/shared/ui/badge'
import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'
import { feedbackSelectClass } from '@/features/complaints/components/FeedbackFormDialog'
import { useBranchOptions } from '@/features/cqc-mock-inspection/components/StartInspectionDialog'
import { CATEGORY_LABEL, RATING_LABEL, ratingVariant } from '@/features/cqc-mock-inspection/labels'
import type { CqcReports } from '../types'
import { useCqcReports } from '../hooks'
import { KEY_QUESTION_LABEL, NOTIFICATION_TYPE_LABEL, pct, shortMonth } from '../labels'

const PERIODS = [
  { months: 6, label: 'Last 6 months' },
  { months: 12, label: 'Last 12 months' },
  { months: 24, label: 'Last 2 years' },
]
const KQ_COLOURS: Record<string, string> = {
  SAFE: 'hsl(var(--destructive))',
  EFFECTIVE: 'hsl(var(--info))',
  CARING: 'hsl(var(--success))',
  RESPONSIVE: 'hsl(var(--warning))',
  WELL_LED: 'hsl(var(--primary))',
}

/** Governance → CQC reports: how CQC readiness has changed month by month. */
export default function CqcReportsPage() {
  const { wholeOrg, options } = useBranchOptions(true)
  const [locationId, setLocationId] = React.useState('')
  const [months, setMonths] = React.useState(12)
  const query = useCqcReports({ locationId: locationId || undefined, months })
  const r = query.data
  const branchName = locationId
    ? (options.find(o => o.id === locationId)?.label ?? 'Branch')
    : wholeOrg
      ? 'All branches'
      : 'All my branches'
  const error = query.error instanceof ApiError ? query.error.message : query.error ? 'Could not load the CQC reports.' : null

  return (
    <div className="flex flex-col gap-4 print:gap-3" data-testid="cqc-reports-page">
      <PageHeader
        title="CQC reports"
        description="How CQC readiness has changed over time. Start with the summary, then look at each section for detail."
        icon={<BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Governance' },
          { label: 'CQC dashboard', href: '/governance/cqc-dashboard' },
          { label: 'Reports' },
        ]}
        actions={[
          {
            label: 'Print',
            onClick: () => window.print(),
            icon: <Printer className="h-4 w-4" />,
            variant: 'outline' as const,
          },
        ]}
      />
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <select
          className={`${feedbackSelectClass} max-w-[16rem]`}
          value={locationId}
          onChange={e => setLocationId(e.target.value)}
          aria-label="Branch"
          data-testid="cqc-reports-branch"
        >
          <option value="">{wholeOrg ? 'All branches' : 'All my branches'}</option>
          {options.map(o => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className={`${feedbackSelectClass} max-w-[12rem]`}
          value={months}
          onChange={e => setMonths(Number(e.target.value))}
          aria-label="Period"
          data-testid="cqc-reports-period"
        >
          {PERIODS.map(p => (
            <option key={p.months} value={p.months}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <p className="hidden text-sm print:block">
        {branchName} · {PERIODS.find(p => p.months === months)?.label}
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {query.isLoading && !r ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {r ? (
        <>
          <Summary r={r} />
          {r.mock ? <MockReport mock={r.mock} /> : null}
          <div className="grid gap-4 lg:grid-cols-2">
            {r.mock ? <StatusPie counts={r.mock.statusCounts} /> : null}
            {r.evidence ? <EvidenceReport evidence={r.evidence} /> : null}
            {r.mock ? <ActionsReport mock={r.mock} /> : null}
            {r.notifications ? <NotificationsReport n={r.notifications} /> : null}
          </div>
        </>
      ) : null}
    </div>
  )
}

function Card({ title, lead, children, testId }: { title: string; lead?: React.ReactNode; children: React.ReactNode; testId: string }) {
  return (
    <section
      className="rounded-xl border border-border bg-card p-4 shadow-sm print:break-inside-avoid print:shadow-none"
      data-testid={testId}
    >
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {lead ? <p className="mt-0.5 text-sm text-muted-foreground">{lead}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  )
}

/** A short caption under a chart, so people know how to read it. */
const ChartNote = ({ children }: { children: React.ReactNode }) => <p className="mt-1 text-xs text-muted-foreground">{children}</p>

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** The period in four numbers, in plain words. */
function Summary({ r }: { r: CqcReports }) {
  const latest = r.mock?.inspections.at(-1)
  const raised = r.mock?.actionsByMonth.reduce((n, m) => n + m.raised, 0) ?? 0
  const done = r.mock?.actionsByMonth.reduce((n, m) => n + m.done, 0) ?? 0
  const late = r.mock?.actionsByMonth.reduce((n, m) => n + m.doneLate, 0) ?? 0
  const added = r.evidence?.byMonth.reduce((n, m) => n + m.added, 0) ?? 0
  const tiles: {
    label: string
    value: string
    note: React.ReactNode
    key: string
  }[] = []
  if (r.mock)
    tiles.push({
      key: 'mock',
      label: 'Mock inspections completed',
      value: String(r.mock.inspections.length),
      note: latest?.overall ? (
        <span className="inline-flex items-center gap-1">
          Latest:{' '}
          <Badge size="sm" variant={ratingVariant(latest.overall)}>
            {RATING_LABEL[latest.overall]}
          </Badge>
        </span>
      ) : (
        'None in this period'
      ),
    })
  if (r.evidence)
    tiles.push({
      key: 'evidence',
      label: 'Evidence added',
      value: String(added),
      note: 'Pieces of CQC evidence',
    })
  if (r.mock)
    tiles.push({
      key: 'actions',
      label: 'Improvement actions done',
      value: `${done} of ${raised}`,
      note: done ? `${pct(done - late, done)}% done on time` : 'None done yet',
    })
  if (r.notifications)
    tiles.push({
      key: 'notifications',
      label: 'CQC notifications sent',
      value: String(r.notifications.submitted),
      note: r.notifications.submitted ? `${pct(r.notifications.submittedOnTime, r.notifications.submitted)}% sent on time` : 'None sent',
    })
  if (!tiles.length) return null
  return (
    <section data-testid="cqc-report-summary">
      <h2 className="mb-2 text-base font-semibold text-foreground">Summary</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map(t => (
          <div
            key={t.key}
            className="rounded-xl border border-border bg-card p-4 shadow-sm print:shadow-none"
            data-testid={`cqc-report-summary-${t.key}`}
          >
            <p className="text-sm font-medium text-muted-foreground">{t.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{t.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t.note}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function MockReport({ mock }: { mock: NonNullable<CqcReports['mock']> }) {
  const codes = Object.keys(KEY_QUESTION_LABEL)
  const chart = mock.inspections.map(i => ({
    label: formatOrganisationDate(i.completedAt),
    ...Object.fromEntries(i.keyQuestions.map(k => [k.code, k.percent])),
  }))
  return (
    <Card
      title="Mock inspection ratings"
      lead={
        mock.inspections.length
          ? `${plural(mock.inspections.length, 'inspection', 'inspections')} completed. The newest is at the top.`
          : undefined
      }
      testId="cqc-report-mock"
    >
      {mock.inspections.length === 0 ? (
        <p className="text-sm text-muted-foreground">No mock inspections were completed in this period.</p>
      ) : (
        <>
          {mock.inspections.length > 1 ? (
            <div className="mb-4">
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chart} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} unit="%" width={40} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={v => `${String(v)}%`} />
                    <Legend formatter={v => KEY_QUESTION_LABEL[String(v)] ?? String(v)} />
                    {codes.map(c => (
                      <Line key={c} type="monotone" dataKey={c} stroke={KQ_COLOURS[c]} strokeWidth={2} connectNulls dot />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <ChartNote>Score for each key question at each inspection. Higher is better.</ChartNote>
            </div>
          ) : null}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm" data-testid="cqc-report-mock-table">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Inspection</th>
                  <th className="px-3 py-2 font-medium">Overall rating</th>
                  {codes.map(c => (
                    <th key={c} className="px-3 py-2 font-medium">
                      {KEY_QUESTION_LABEL[c]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...mock.inspections].reverse().map(i => (
                  <tr key={i.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      <Link
                        to="/governance/mock-inspections/$inspectionId"
                        params={{ inspectionId: i.id }}
                        className="font-medium text-primary hover:underline"
                      >
                        {i.title}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {formatOrganisationDate(i.completedAt)} · {i.branch ?? 'Whole organisation'}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {i.overall ? (
                        <Badge size="sm" variant={ratingVariant(i.overall)}>
                          {RATING_LABEL[i.overall]}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    {codes.map(c => {
                      const k = i.keyQuestions.find(x => x.code === c)
                      return (
                        <td key={c} className="whitespace-nowrap px-3 py-2">
                          {k?.rating ? (
                            <Badge size="sm" variant={ratingVariant(k.rating)}>
                              {RATING_LABEL[k.rating]}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  )
}

function EvidenceReport({ evidence }: { evidence: NonNullable<CqcReports['evidence']> }) {
  // All six CQC evidence categories, including the ones with nothing yet.
  const categories = Object.entries(CATEGORY_LABEL).map(([key, label]) => ({
    label,
    count: evidence.byCategory.find(c => c.key === key)?.count ?? 0,
  }))
  const total = categories.reduce((n, c) => n + c.count, 0)
  return (
    <Card
      title="CQC evidence"
      lead={`${plural(
        evidence.byMonth.reduce((n, m) => n + m.added, 0),
        'piece',
        'pieces',
      )} of evidence added in this period.`}
      testId="cqc-report-evidence"
    >
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={evidence.byMonth.map(m => ({
              ...m,
              label: shortMonth(m.month),
            }))}
            margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} width={28} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="added" name="Added" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartNote>Each bar is one month.</ChartNote>
      <div className="mt-4" data-testid="cqc-report-evidence-categories">
        <Breakdown
          title="Kinds of evidence CQC looks for"
          note="CQC wants evidence of all six kinds. Red means there is none yet."
          rows={categories}
          total={total}
        />
      </div>
    </Card>
  )
}

function Breakdown({
  title,
  note,
  rows,
  total,
}: {
  title: string
  note?: string
  rows: { label: string; count: number }[]
  total: number
}) {
  return (
    <div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      <div className="mb-1.5" />
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">None yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map(r => (
            <li key={r.label} className="text-sm">
              <div className="flex justify-between gap-2">
                <span className="truncate">{r.label}</span>
                {r.count ? (
                  <span className="tabular-nums text-muted-foreground">{r.count}</span>
                ) : (
                  <span className="font-medium text-destructive">None yet</span>
                )}
              </div>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div className="h-full bg-primary/70" style={{ width: `${pct(r.count, total)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ActionsReport({ mock }: { mock: NonNullable<CqcReports['mock']> }) {
  const raised = mock.actionsByMonth.reduce((n, m) => n + m.raised, 0)
  const done = mock.actionsByMonth.reduce((n, m) => n + m.done, 0)
  const late = mock.actionsByMonth.reduce((n, m) => n + m.doneLate, 0)
  return (
    <Card
      title="Improvement actions"
      lead={`${plural(raised, 'action', 'actions')} raised and ${done} done${done ? `, ${pct(done - late, done)}% done on time` : ''}.`}
      testId="cqc-report-actions"
    >
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={mock.actionsByMonth.map(m => ({
              ...m,
              label: shortMonth(m.month),
            }))}
            margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} width={28} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="raised" name="Raised" fill="hsl(var(--warning))" radius={[3, 3, 0, 0]} />
            <Bar dataKey="done" name="Done" fill="hsl(var(--success))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartNote>Each month: actions raised (amber) and actions done (green).</ChartNote>
    </Card>
  )
}

function NotificationsReport({ n }: { n: NonNullable<CqcReports['notifications']> }) {
  return (
    <Card
      title="CQC notifications"
      lead={
        <span data-testid="cqc-report-on-time">
          {n.submitted
            ? `${plural(n.submitted, 'notification', 'notifications')} sent to CQC, ${n.submittedOnTime} of them on time (${pct(n.submittedOnTime, n.submitted)}%).`
            : 'No notifications sent in this period.'}
        </span>
      }
      testId="cqc-report-notifications"
    >
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={n.byMonth.map(m => ({ ...m, label: shortMonth(m.month) }))} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} width={28} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" name="Notifications" fill="hsl(var(--info))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartNote>Each bar is one month.</ChartNote>
      <div className="mt-4">
        <Breakdown
          title="What they were about"
          rows={n.byType.map(t => ({
            label: NOTIFICATION_TYPE_LABEL[t.type] ?? t.type,
            count: t.count,
          }))}
          total={n.byType.reduce((s, t) => s + t.count, 0)}
        />
      </div>
    </Card>
  )
}

const STATUS_SLICES = [
  { key: 'completed', label: 'Completed', colour: 'hsl(var(--success))' },
  { key: 'inProgress', label: 'In progress', colour: 'hsl(var(--warning))' },
  { key: 'cancelled', label: 'Cancelled', colour: 'hsl(var(--muted-foreground))' },
] as const

/** Pie chart: how many mock inspections are completed, in progress or cancelled. */
function StatusPie({ counts }: { counts: NonNullable<CqcReports['mock']>['statusCounts'] }) {
  const total = counts.completed + counts.inProgress + counts.cancelled
  const data = STATUS_SLICES.map(x => ({ ...x, value: counts[x.key] })).filter(x => x.value > 0)
  return (
    <Card
      title="Mock inspections by status"
      lead={
        total
          ? `${plural(total, 'inspection', 'inspections')}: ${counts.completed} completed, ${counts.inProgress} in progress, ${counts.cancelled} cancelled.`
          : undefined
      }
      testId="cqc-report-status"
    >
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">No mock inspections in this period.</p>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="h-48 w-48 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={data.length > 1 ? 2 : 0}
                  stroke="none"
                >
                  {data.map(x => (
                    <Cell key={x.key} fill={x.colour} />
                  ))}
                </Pie>
                <Tooltip formatter={v => `${String(v)} (${pct(Number(v), total)}%)`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="w-full space-y-2 text-sm">
            {STATUS_SLICES.map(x => (
              <li key={x.key} className="flex items-center justify-between gap-3" data-testid={`cqc-report-status-${x.key}`}>
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm" style={{ background: x.colour }} aria-hidden />
                  {x.label}
                </span>
                <span className="tabular-nums">
                  <span className="font-semibold">{counts[x.key]}</span>
                  <span className="text-muted-foreground"> ({pct(counts[x.key], total)}%)</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ChartNote>Inspections started or completed in this period, plus any still in progress.</ChartNote>
    </Card>
  )
}
