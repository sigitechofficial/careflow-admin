import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { cn } from '@/shared/lib/utils'
import { feedbackSelectClass } from '@/features/complaints/components/FeedbackFormDialog'
import { InfoTip } from '@/features/cqc-mock-inspection/components/InfoTip'
import type { AuditFilters, ComplianceLevel } from '../types'
import { useAuditReports, useAudits } from '../hooks'
import { LEVEL_LABEL, shortMonth } from '../labels'
import { HELP } from '../help'
import { AuditFiltersBar } from '../components/AuditFiltersBar'
import { AuditTable } from '../components/AuditTable'

const LEVELS: { level: ComplianceLevel; tone: string }[] = [
  { level: 'NOT_COMPLIANT', tone: 'text-destructive' },
  { level: 'PARTIALLY_COMPLIANT', tone: 'text-warning' },
  { level: 'COMPLIANT', tone: 'text-success' },
]
const PERIODS = [
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 3 months' },
  { days: 182, label: 'Last 6 months' },
  { days: 365, label: 'Last 12 months' },
]
const DUE_COLOURS = ['hsl(var(--destructive))', 'hsl(var(--info))', 'hsl(var(--primary) / 0.35)']

/** Governance → Audits → Reports: compliance of completed audits, what is coming due, compliance by month. */
export default function AuditReportsPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = React.useState<AuditFilters>({})
  const [days, setDays] = React.useState(30)
  const [level, setLevel] = React.useState<ComplianceLevel>('NOT_COMPLIANT')
  const [page, setPage] = React.useState(1)
  const reports = useAuditReports({ ...filters, days })
  const list = useAudits({ ...filters, tab: 'COMPLETED', level, page, limit: 10 })
  const data = reports.data
  const due = data
    ? [
        { name: 'Overdue', value: data.due.overdue },
        { name: 'Due this week', value: data.due.dueThisWeek },
        { name: 'Due in 30 days', value: Math.max(0, data.due.dueIn30Days - data.due.dueThisWeek) },
      ]
    : []
  const dueTotal = due.reduce((n, d) => n + d.value, 0)

  return (
    <div className="flex flex-col gap-4" data-testid="audit-reports-page">
      <PageHeader
        title="Audit reports"
        description="How compliant completed audits were, and what is coming due."
        icon={<BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden />}
        info={HELP.reports}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Governance' }, { label: 'Audits', href: '/governance/audits' }, { label: 'Reports' }]}
      />
      <AuditFiltersBar
        value={filters}
        onChange={f => {
          setFilters(f)
          setPage(1)
        }}
      >
        <select
          className={`${feedbackSelectClass} max-w-[12rem]`}
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          aria-label="Period"
          data-testid="audit-report-period"
        >
          {PERIODS.map(p => (
            <option key={p.days} value={p.days}>
              {p.label}
            </option>
          ))}
        </select>
      </AuditFiltersBar>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Compliance level">
          {LEVELS.map(l => (
            <button
              key={l.level}
              type="button"
              role="tab"
              aria-selected={level === l.level}
              onClick={() => {
                setLevel(l.level)
                setPage(1)
              }}
              className={cn(
                'flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm font-medium',
                level === l.level ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:bg-muted/30',
              )}
              data-testid={`audit-level-${l.level}`}
            >
              <CheckCircle2 className={cn('h-6 w-6', l.tone)} aria-hidden />
              <span className="rounded-full border border-border px-2 text-xs tabular-nums">{data ? data.levels[l.level] : '–'}</span>
              {LEVEL_LABEL[l.level]}
            </button>
          ))}
        </div>
        <p className="mb-2 text-xs text-muted-foreground">
          Completed audits at this level (all time, for the filters above). The counts on the buttons are for{' '}
          {PERIODS.find(p => p.days === days)?.label.toLowerCase()}.
        </p>
        <AuditTable
          rows={list.data?.rows ?? []}
          loading={list.isLoading}
          empty={`No ${LEVEL_LABEL[level].toLowerCase()} audits.`}
          onOpen={id => void navigate({ to: '/governance/audits/$auditId', params: { auditId: id } })}
          completed
          page={page}
          totalPages={list.data?.totalPages}
          onPage={setPage}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm" data-testid="audit-report-due">
          <h2 className="text-sm font-semibold text-foreground">Audits due</h2>
          {dueTotal === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nothing overdue or due in the next 30 days.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <div className="h-48 w-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={due} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {due.map((d, i) => (
                        <Cell key={d.name} fill={DUE_COLOURS[i]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1.5 text-sm">
                {due.map((d, i) => (
                  <li key={d.name} className="flex items-center gap-2">
                    <i className="h-3 w-3 rounded-sm" style={{ background: DUE_COLOURS[i] }} aria-hidden />
                    {d.name} ({d.value})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm" data-testid="audit-report-compliance">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              Overall compliance level
              <InfoTip label="compliance">{HELP.score}</InfoTip>
            </h2>
            <span className="text-2xl font-semibold tabular-nums" data-testid="audit-report-overall">
              {data?.overallPercent === null || data?.overallPercent === undefined ? '—' : `${data.overallPercent}%`}
            </span>
          </div>
          {!data?.byMonth.length ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No audits completed in this period.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byMonth.map(m => ({ ...m, label: shortMonth(m.month) }))} margin={{ top: 16, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" width={40} />
                  <Tooltip formatter={v => [`${String(v)}%`, 'Average']} />
                  <Bar dataKey="percent" radius={[4, 4, 0, 0]}>
                    {data.byMonth.map(m => (
                      <Cell
                        key={m.month}
                        fill={
                          m.percent >= data.bands.compliant
                            ? 'hsl(var(--success))'
                            : m.percent >= data.bands.partially
                              ? 'hsl(var(--warning))'
                              : 'hsl(var(--destructive))'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
