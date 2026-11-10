import * as React from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import { ArrowLeft, BarChart3, Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { useDocumentTitle } from '@/shared/lib/use-document-title'
import { InsightLinesTable } from './SurveyInsightPanels'
import {
  DASHBOARD_VIEW_LABELS,
  heatClass,
  usePoolOptions,
  usePooledResults,
  useReport360,
  useSurveysDashboard,
  type DashboardView,
} from './survey-insight'

const card = 'rounded-xl border border-border bg-card p-4'

function Header({ title, back = '/surveys', children }: { title: string; back?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
      <div className="flex items-start gap-2">
        <Button type="button" variant="ghost" size="icon" className="mt-0.5 shrink-0" asChild>
          <Link to={back}>
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5" aria-hidden /> Survey insight
          </div>
          <h1 className="mt-0.5 text-xl font-semibold text-foreground">{title}</h1>
        </div>
      </div>
      {children}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'warn' }) {
  return (
    <div className={cn(card, 'min-w-[140px] flex-1')}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('mt-1 text-2xl font-semibold tabular-nums', tone === 'warn' && 'text-rose-700 dark:text-rose-300')}>{value}</div>
    </div>
  )
}

/** Loading, or a failure with Try again (never stuck on "Loading…"). */
function LoadState({ isError, onRetry, retrying, what }: { isError: boolean; onRetry: () => void; retrying: boolean; what: string }) {
  if (isError) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm" role="alert">
        <p>{what} could not be loaded. Check your connection and try again.</p>
        <Button type="button" size="sm" variant="outline" className="mt-2" onClick={onRetry} disabled={retrying}>
          {retrying ? 'Trying again…' : 'Try again'}
        </Button>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
    </div>
  )
}

const VIEWS: DashboardView[] = ['REGISTERED_MANAGER', 'BRANCH_MANAGER', 'NOMINATED_INDIVIDUAL']

/** /surveys/insight: a surveys dashboard for each role, with links to pooled reports and the 360 report. */
export default function SurveyInsightPage() {
  useDocumentTitle('Survey insight – CareAdmin')
  const [view, setView] = React.useState<DashboardView | null>(null)
  const { data, isLoading, isError, refetch, isFetching } = useSurveysDashboard(view)
  const pools = usePoolOptions()
  const current = view ?? data?.view ?? 'REGISTERED_MANAGER'
  return (
    <div className="w-full flex-1 px-4 py-6 sm:px-6">
      <Header title="Surveys dashboard">
        <div role="group" aria-label="Dashboard for" className="flex flex-wrap gap-1 rounded-lg border border-border p-1">
          {VIEWS.map(v => (
            <button
              key={v}
              type="button"
              aria-pressed={current === v}
              className={cn('rounded-md px-3 py-1.5 text-sm', current === v ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
              onClick={() => setView(v)}
            >
              {DASHBOARD_VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      </Header>
      {!data ? (
        <LoadState isError={isError && !isLoading} onRetry={() => void refetch()} retrying={isFetching} what="The dashboard" />
      ) : (
        <div className="space-y-5" data-testid="surveys-dashboard">
          <p className="text-xs text-muted-foreground">
            {current === 'BRANCH_MANAGER'
              ? 'Your branches only. '
              : current === 'NOMINATED_INDIVIDUAL'
                ? 'The organisation as a whole. '
                : ''}
            Figures show only for surveys whose results you may see, and only where enough people answered for nobody to be identified.
          </p>
          <div className="flex flex-wrap gap-3">
            <Stat label="Open surveys" value={data.totals.open} />
            <Stat label="Closed this year" value={data.totals.closedThisYear} />
            <Stat label="Alerts open" value={data.alerts.open} />
            <Stat label="Alerts overdue" value={data.alerts.overdue} tone={data.alerts.overdue ? 'warn' : undefined} />
            {data.actions ? <Stat label="Actions open" value={data.actions.open} /> : null}
            {data.actions ? <Stat label="Actions overdue" value={data.actions.overdue} tone={data.actions.overdue ? 'warn' : undefined} /> : null}
          </div>
          {data.work ? (
            <section className={card} aria-labelledby="work-heading">
              <h2 id="work-heading" className="text-base font-semibold">Waiting for someone</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {data.work.eventsWaiting !== null ? <li>Event sends to check or offer: {data.work.eventsWaiting}</li> : null}
                {data.work.heldBack !== null ? <li>People held back by the 4-week rule: {data.work.heldBack}</li> : null}
                {data.work.callLists !== null ? <li>Call lists open: {data.work.callLists}</li> : null}
                <li>
                  <Link to="/surveys/follow-ups" className="text-primary underline-offset-2 hover:underline">
                    Open the follow-ups
                  </Link>
                </li>
              </ul>
            </section>
          ) : null}
          <section className={card} aria-labelledby="open-heading">
            <h2 id="open-heading" className="text-base font-semibold">Open surveys</h2>
            {data.openSurveys.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No surveys are open.</p>
            ) : (
              <table className="mt-2 w-full border-collapse text-sm">
                <caption className="sr-only">Open surveys and their response rates</caption>
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th scope="col" className="py-2 pr-3 font-medium">Survey</th>
                    <th scope="col" className="px-2 py-2 font-medium">Closes</th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">Response rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.openSurveys.map(s => (
                    <tr key={s.id} className="border-b border-border/60">
                      <th scope="row" className="py-2 pr-3 text-left font-normal">
                        <Link to="/surveys/$surveyId/responses" params={{ surveyId: s.id }} className="text-primary underline-offset-2 hover:underline">
                          {s.title}
                        </Link>
                      </th>
                      <td className="px-2 py-2">{s.closesAt ? new Date(s.closesAt).toLocaleDateString('en-GB') : '—'}</td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {s.countsRestricted ? 'Limited' : s.responseRate === null ? 'Shared link' : `${s.responseRate}% of ${s.sentTo}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
          <section className={card} aria-labelledby="trends-heading">
            <h2 id="trends-heading" className="text-base font-semibold">Trends: overall experience</h2>
            {data.trends.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No repeating surveys with results to show yet.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {data.trends.map(t => (
                  <li key={t.surveyId}>
                    <Link to="/surveys/$surveyId/responses" params={{ surveyId: t.surveyId }} className="font-medium text-primary underline-offset-2 hover:underline">
                      {t.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {t.points.map(p => (
                        <span key={p.label} className={cn('rounded px-2 py-0.5 text-xs tabular-nums', heatClass(p.percent))}>
                          {p.label}: {p.percent === null ? 'not shown' : `${p.percent}%`}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className={card} aria-labelledby="reports-heading">
            <h2 id="reports-heading" className="text-base font-semibold">Reports</h2>
            <ul className="mt-2 space-y-1 text-sm">
              <li>
                <Link to="/surveys/insight/360" className="text-primary underline-offset-2 hover:underline">
                  360 report: people, families, staff and professionals by CQC key question
                </Link>
              </li>
              <li>
                <Link to="/surveys/insight/benchmarks" className="text-primary underline-offset-2 hover:underline">
                  Compared with other agencies (anonymised benchmarks)
                </Link>
              </li>
              {(pools.data ?? []).map(p => (
                <li key={p.templateId ?? p.libraryReference}>
                  <Link
                    to="/surveys/insight/pool"
                    search={p.templateId ? { templateId: p.templateId } : { libraryReference: p.libraryReference ?? undefined }}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    All copies of “{p.title}” together ({p.copies} copies)
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}

/** /surveys/insight/pool: every copy of one template or ready-made survey in one report. */
export function SurveyPoolPage() {
  const search = useSearch({ strict: false }) as { templateId?: string; libraryReference?: string }
  const { data, isLoading, isError, refetch, isFetching } = usePooledResults(search)
  useDocumentTitle('Pooled survey results – CareAdmin')
  return (
    <div className="w-full flex-1 px-4 py-6 sm:px-6">
      <Header title="All copies together" back="/surveys/insight" />
      {!data ? (
        <LoadState isError={isError && !isLoading} onRetry={() => void refetch()} retrying={isFetching} what="These results" />
      ) : (
        <section className={card} data-testid="pooled-results">
          <p className="text-sm">
            {data.copies.length} {data.copies.length === 1 ? 'copy' : 'copies'}
            {data.responsesInFigures !== null ? ` · ${data.responsesInFigures} answers in the figures` : ''}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{data.note}</p>
          <div className="mt-3">
            <InsightLinesTable units={data.units} questions={data.questions} caption="Questions by copy" />
          </div>
        </section>
      )}
    </div>
  )
}

/** /surveys/insight/360: the year's annual surveys side by side by CQC key question. */
export function Survey360Page() {
  const [year, setYear] = React.useState(new Date().getFullYear())
  const { data, isLoading, isError, refetch, isFetching } = useReport360(year)
  useDocumentTitle('360 report – CareAdmin')
  return (
    <div className="w-full flex-1 px-4 py-6 sm:px-6">
      <Header title="360 report" back="/surveys/insight">
        <label className="flex items-center gap-2 text-sm">
          Year
          <select className="h-9 rounded-md border border-input bg-background px-2" value={year} onChange={e => setYear(Number(e.target.value))}>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </Header>
      {!data ? (
        <LoadState isError={isError && !isLoading} onRetry={() => void refetch()} retrying={isFetching} what="The 360 report" />
      ) : (
        <section className={card} data-testid="report-360">
          <p className="text-xs text-muted-foreground">{data.note}</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <caption className="sr-only">Share of positive answers by audience and CQC key question</caption>
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th scope="col" className="py-2 pr-3 font-medium">Who answered</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">Overall</th>
                  {data.keyQuestions.map(k => (
                    <th key={k.code} scope="col" className="px-2 py-2 text-right font-medium">
                      {k.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.audiences.map(a => (
                  <tr key={a.code} className="border-b border-border/60 align-top">
                    <th scope="row" className="py-2 pr-3 text-left font-normal">
                      <span className="block font-medium">{a.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {a.unit ? `${a.unit.title}${a.responses !== null ? ` · ${a.responses} answers` : ''}` : ''}
                        {a.hiddenNote ? ` ${a.hiddenNote}` : ''}
                      </span>
                    </th>
                    <td className={cn('px-2 py-2 text-right tabular-nums', heatClass(a.headline?.percent ?? null))}>
                      {a.headline?.percent != null ? `${a.headline.percent}%` : '—'}
                    </td>
                    {a.keyQuestions.length
                      ? a.keyQuestions.map(k => (
                          <td key={k.code} className={cn('px-2 py-2 text-right tabular-nums', heatClass(k.percent))} title={k.answers ? `${k.answers} answers to ${k.questions} questions` : 'No questions for this key question'}>
                            {k.percent === null ? '—' : `${k.percent}%`}
                          </td>
                        ))
                      : data.keyQuestions.map(k => (
                          <td key={k.code} className="px-2 py-2 text-right text-muted-foreground">—</td>
                        ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
