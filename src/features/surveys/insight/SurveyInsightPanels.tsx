import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import {
  describePoint,
  formatPoint,
  heatClass,
  useSurveyHeatmap,
  useSurveyQuality,
  useSurveyScores,
  useSurveyThemes,
  useSurveyTrends,
  type InsightLine,
  type InsightUnit,
  type QuestionPoint,
  type ScaleResult,
  type ThemeCount,
} from './survey-insight'

const card = 'rounded-xl border border-border bg-card p-4'

function Loading({ what }: { what: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading {what}…
    </div>
  )
}

function percentOf(p: QuestionPoint | null): number | null {
  return p && p.kind !== 'AVERAGE' ? p.percent : null
}

/**
 * Questions down the side, periods (or copies) across, each cell the question's figure for that period. Hidden
 * periods show why, and are left out of the years and the total.
 */
export function InsightLinesTable({ units, questions, caption }: { units: InsightUnit[]; questions: InsightLine[]; caption: string }) {
  const years = questions[0]?.years ?? []
  if (!questions.length) {
    return <p className="text-sm text-muted-foreground">No question figures to compare yet.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th scope="col" className="py-2 pr-3 font-medium">Question</th>
            {units.map(u => (
              <th key={u.id} scope="col" className="px-2 py-2 text-right font-medium">
                <span className="block">{u.label}</span>
                <span className="block font-normal">{u.shown ? `${u.responses} answers` : u.hiddenNote}</span>
              </th>
            ))}
            {years.length > 1
              ? years.map(y => (
                  <th key={y.year} scope="col" className="px-2 py-2 text-right font-medium">
                    {y.year}
                  </th>
                ))
              : null}
            <th scope="col" className="px-2 py-2 text-right font-medium">All shown</th>
          </tr>
        </thead>
        <tbody>
          {questions.map(q => (
            <tr key={q.key} className="border-b border-border/60 align-top">
              <th scope="row" className="py-2 pr-3 text-left font-normal text-foreground">
                {q.questionText}
              </th>
              {q.points.map(p => (
                <td key={p.unitId} className={cn('px-2 py-2 text-right tabular-nums', heatClass(percentOf(p.point)))} title={describePoint(p.point)}>
                  {formatPoint(p.point)}
                </td>
              ))}
              {years.length > 1
                ? q.years.map(y => (
                    <td key={y.year} className="px-2 py-2 text-right tabular-nums" title={describePoint(y.point)}>
                      {formatPoint(y.point)}
                    </td>
                  ))
                : null}
              <td className="px-2 py-2 text-right font-medium tabular-nums" title={describePoint(q.pooled)}>
                {formatPoint(q.pooled)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Results → Trends: every question across a repeating survey's periods and years. */
export function SurveyTrendsPanel({ surveyId }: { surveyId: string }) {
  const { data, isLoading } = useSurveyTrends(surveyId)
  if (isLoading || !data) return <Loading what="trends" />
  return (
    <section className={card} aria-labelledby="trends-heading" data-testid="survey-trends">
      <h2 id="trends-heading" className="text-base font-semibold text-foreground">Trends</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Scale questions show the share who gave one of the top two answers; Yes / No questions the share who said Yes; ratings
        the average. {data.note}
      </p>
      <div className="mt-3">
        <InsightLinesTable units={data.units} questions={data.questions} caption={`${data.title}: questions by period`} />
      </div>
      {data.pool ? (
        <p className="mt-3 text-xs">
          <Link
            to="/surveys/insight/pool"
            search={data.pool.templateId ? { templateId: data.pool.templateId } : { libraryReference: data.pool.libraryReference }}
            className="text-primary underline-offset-2 hover:underline"
          >
            Pool every copy of this survey
          </Link>
        </p>
      ) : null}
    </section>
  )
}

/** Results → By branch: questions by branch, with small branches combined or left blank. */
export function SurveyHeatmapPanel({ surveyId }: { surveyId: string }) {
  const { data, isLoading } = useSurveyHeatmap(surveyId)
  if (isLoading || !data) return <Loading what="the branch comparison" />
  return (
    <section className={card} aria-labelledby="heatmap-heading" data-testid="survey-heatmap">
      <h2 id="heatmap-heading" className="text-base font-semibold text-foreground">By branch</h2>
      {data.note ? <p className="mt-1 text-xs text-muted-foreground">{data.note}</p> : null}
      {data.columns.length && data.rows.length ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <caption className="sr-only">{data.title}: each question by branch</caption>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="py-2 pr-3 font-medium">Question</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">All</th>
                {data.columns.map(c => (
                  <th key={c.key} scope="col" className="px-2 py-2 text-right font-medium">
                    <span className="block">{c.label}</span>
                    <span className="block font-normal">{c.responses} answers</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map(r => (
                <tr key={r.key} className="border-b border-border/60">
                  <th scope="row" className="py-2 pr-3 text-left font-normal">{r.questionText}</th>
                  <td className="px-2 py-2 text-right font-medium tabular-nums">{r.overall.percent === null ? '—' : `${r.overall.percent}%`}</td>
                  {r.cells.map(c => (
                    <td
                      key={c.key}
                      className={cn('px-2 py-2 text-right tabular-nums', heatClass(c.percent))}
                      title={c.percent === null ? 'Too few answers to show' : `${c.percent}% of ${c.base}`}
                    >
                      {c.percent === null ? <span aria-label="Too few answers to show">·</span> : `${c.percent}%`}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}

function ThemeList({ themes }: { themes: ThemeCount[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {themes.map(t => (
        <li key={t.code} className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs">
          {t.label}: <span className="font-medium">{t.count === null ? 'fewer than 3' : t.count}</span>
        </li>
      ))}
    </ul>
  )
}

/** Results → Summary: themes in written answers (counts only). */
export function SurveyThemesPanel({ surveyId }: { surveyId: string }) {
  const { data, isLoading } = useSurveyThemes(surveyId)
  if (isLoading || !data) return <Loading what="themes" />
  return (
    <section className={card} aria-labelledby="themes-heading" data-testid="survey-themes">
      <h2 id="themes-heading" className="text-base font-semibold text-foreground">What people wrote about</h2>
      <p className="mt-1 text-xs text-muted-foreground">{data.note}</p>
      {data.themes.length ? (
        <>
          <p className="mt-2 text-sm">{data.writtenAnswers} written answers</p>
          <ThemeList themes={data.themes} />
          {data.questions.map(q => (
            <div key={q.questionText} className="mt-3">
              <h3 className="text-sm font-medium">{q.questionText}</h3>
              <ThemeList themes={q.themes} />
            </div>
          ))}
        </>
      ) : null}
    </section>
  )
}

/** Results → Summary: responses flagged for a look (never removed). */
export function SurveyQualityPanel({ surveyId }: { surveyId: string }) {
  const { data } = useSurveyQuality(surveyId)
  if (!data || data.responses === null) return null
  return (
    <section className={card} aria-labelledby="quality-heading" data-testid="survey-quality">
      <h2 id="quality-heading" className="text-base font-semibold text-foreground">Answer quality</h2>
      <p className="mt-1 text-sm">
        {data.flagged === 0 ? 'No responses flagged.' : `${data.flagged} of ${data.responses} responses flagged for a look.`}
      </p>
      {data.flagged ? (
        <ul className="mt-1 list-disc pl-5 text-sm">
          {data.flags.filter(f => f.count > 0).map(f => (
            <li key={f.flag}>
              {f.label}: {f.count}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-1 text-xs text-muted-foreground">{data.note}</p>
    </section>
  )
}

function ScaleRow({ s }: { s: ScaleResult }) {
  const value = s.average === null ? '—' : s.method === 'PERCENT_OF_MAX' ? `${s.average}%` : s.average.toFixed(2)
  return (
    <tr className="border-b border-border/60">
      <th scope="row" className="py-2 pr-3 text-left font-normal">{s.label}</th>
      <td className="px-2 py-2 text-right font-medium tabular-nums">{value}</td>
      <td className="px-2 py-2">{s.band ?? ''}</td>
      <td className="px-2 py-2 text-xs text-muted-foreground">
        {s.bands ? s.bands.map(b => `${b.label}: ${b.people}`).join(' · ') : s.people ? 'Bands not listed (a band would hold fewer than 3 people)' : ''}
      </td>
    </tr>
  )
}

/** Results → Summary: scale scores for a scored survey. */
export function SurveyScoresPanel({ surveyId }: { surveyId: string }) {
  const { data } = useSurveyScores(surveyId)
  if (!data?.scoring) return null
  return (
    <section className={card} aria-labelledby="scores-heading" data-testid="survey-scores">
      <h2 id="scores-heading" className="text-base font-semibold text-foreground">Scores</h2>
      {data.note ? <p className="mt-1 text-sm text-muted-foreground">{data.note}</p> : null}
      {data.scales.length ? (
        <table className="mt-2 w-full border-collapse text-sm">
          <caption className="sr-only">Scores by scale</caption>
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th scope="col" className="py-2 pr-3 font-medium">Scale</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">Score</th>
              <th scope="col" className="px-2 py-2 font-medium">Band</th>
              <th scope="col" className="px-2 py-2 font-medium">People in each band</th>
            </tr>
          </thead>
          <tbody>
            {data.scales.map(s => (
              <ScaleRow key={s.key} s={s} />
            ))}
          </tbody>
        </table>
      ) : null}
      {data.units.length > 1 ? (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-xs text-primary">By period</summary>
          {data.units.map(u => (
            <div key={u.id} className="mt-2">
              <h3 className="text-xs font-medium">{u.label}</h3>
              <p className="text-xs text-muted-foreground">
                {u.scales.map(s => `${s.label}: ${s.average === null ? '—' : s.average}${s.band ? ` (${s.band})` : ''}`).join(' · ')}
              </p>
            </div>
          ))}
        </details>
      ) : null}
    </section>
  )
}
