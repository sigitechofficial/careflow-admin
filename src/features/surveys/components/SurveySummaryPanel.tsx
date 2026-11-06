import { Progress } from '@/shared/ui/misc'
import { Badge } from '@/shared/ui/badge'
import {
  MIN_ANONYMOUS_RECIPIENTS,
  SURVEY_QUESTION_TYPE_LABELS,
  type SurveyQuestionOptionSummary,
  type SurveyQuestionSummary,
  type SurveyTopTwo,
} from '@/features/surveys/types'
import { Fragment } from 'react'
import { SurveySectionHeading } from '@/features/surveys/components/SurveySectionHeading'
import { withSectionHeadings } from '@/features/surveys/survey-sections'
import { describeLikertScale } from '@/features/surveys/survey-likert'

const periodLabel = (p: { title: string; periodKey: string | null }) => {
  // Period titles read "<survey> — <period>"; the period part is enough here.
  const dash = p.title.lastIndexOf(' — ')
  return dash >= 0 ? p.title.slice(dash + 3) : (p.periodKey ?? p.title)
}

/** Anonymous surveys: why written answers (Other text, comments, text answers) are not shown yet. */
export const WRITTEN_ANSWERS_WITHHELD_NOTE = `Written answers on an anonymous survey are shown once the survey has closed and at least ${MIN_ANONYMOUS_RECIPIENTS} people have answered, so they cannot be traced to anyone.`

function WithheldNote({ note }: { note?: string | null }) {
  return (
    <p className="mt-3 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground" data-testid="written-answers-withheld">
      {note ?? WRITTEN_ANSWERS_WITHHELD_NOTE}
    </p>
  )
}

/** People's own words under a question: their "Other" text and comments. */
function WrittenAnswers({ q, withheldNote }: { q: SurveyQuestionSummary; withheldNote?: string | null }) {
  const list = q.writtenAnswers ?? []
  if (!list.length) return q.writtenAnswersWithheld ? <WithheldNote note={withheldNote} /> : null
  const total = q.writtenAnswerCount ?? list.length
  return (
    <div className="mt-3" data-testid="written-answers">
      <p className="text-xs font-medium text-foreground">Written answers ({total})</p>
      <ul className="mt-1.5 space-y-1.5">
        {list.map((w, i) => (
          <li key={i} className="rounded-md bg-muted/40 px-3 py-2 text-sm text-foreground">
            {w.answer ? <p className="text-xs text-muted-foreground">Answered: {w.answer}</p> : null}
            {w.otherText ? (
              <p className="whitespace-pre-wrap">
                <span className="text-xs font-medium text-muted-foreground">Other: </span>“{w.otherText}”
              </p>
            ) : null}
            {w.comment ? (
              <p className="whitespace-pre-wrap">
                <span className="text-xs font-medium text-muted-foreground">Comment: </span>“{w.comment}”
              </p>
            ) : null}
            {w.respondentName ? <p className="mt-0.5 text-xs text-muted-foreground">— {w.respondentName}</p> : null}
          </li>
        ))}
      </ul>
      {total > list.length ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Showing the latest {list.length} of {total}. Every answer is under Individual responses.
        </p>
      ) : null}
      {q.writtenAnswersWithheld ? <WithheldNote note={withheldNote} /> : null}
    </div>
  )
}

type SurveySummaryPanelProps = {
  summaries: SurveyQuestionSummary[]
  /** From the results: why some written answers are held back (anonymous surveys). */
  writtenAnswersNote?: string | null
  /** Responses whose answers are in the figures: each question says how many were not asked or skipped. */
  responsesInFigures?: number
  className?: string
}

/** "N% said Always or Usually" (scale questions on a standard scale). */
export function describeTopTwo(t: SurveyTopTwo): string | null {
  if (t.percent === null || t.base <= 0) return null
  return `${t.percent}% said ${t.labels.join(' or ')}`
}

/** "12 said Don't know" for answers marked not counted in the percentages. */
function NotCountedAnswers({ options }: { options: SurveyQuestionOptionSummary[] }) {
  const notCounted = options.filter(o => o.notCounted && o.count > 0)
  if (!notCounted.length) return null
  return (
    <p className="mt-2 text-xs text-muted-foreground" data-testid="not-counted-answers">
      {notCounted.map(o => `${o.count} said ${o.label}`).join(' · ')} (not counted in the percentages)
    </p>
  )
}

export function SurveySummaryPanel({ summaries, writtenAnswersNote, responsesInFigures, className }: SurveySummaryPanelProps) {
  if (summaries.length === 0) return null

  return (
    <div className={className}>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">Each question</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Percentages are of the people who answered that question. Answers marked “not counted” (such as Don’t
          know) are shown as numbers only and left out of the percentages.
        </p>
      </div>
      <div className="space-y-3">
        {withSectionHeadings(summaries).map(({ item: q, heading }) => {
          const retired = q.status === 'reworded' || q.status === 'removed'
          const number = retired ? null : summaries.filter(s => !s.status || s.status === 'current').indexOf(q) + 1
          const notAsked =
            responsesInFigures !== undefined && !retired ? Math.max(0, responsesInFigures - q.answerCount) : null
          const topTwo = q.topTwo ? describeTopTwo(q.topTwo) : null
          const shownOptions = (q.options ?? []).filter(o => !o.notCounted)
          return (
            <Fragment key={q.questionId}>
            {heading && !retired ? <SurveySectionHeading title={heading} /> : null}
            <div
              className={retired ? 'rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3' : 'rounded-lg border border-border bg-card px-4 py-3'}
              data-testid={retired ? `retired-question-${q.status}` : `question-summary-${q.questionId}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {number ? `${number}. ` : ''}
                    {q.questionText}
                    {retired ? (
                      <Badge variant="muted" size="sm" className="ml-2 align-middle">
                        {q.status === 'removed' ? 'Removed' : 'Reworded'}
                      </Badge>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {q.questionType === 'LIKERT'
                      ? describeLikertScale(q.options?.map(o => o.label))
                      : SURVEY_QUESTION_TYPE_LABELS[q.questionType]}{' '}
                    · {q.answerCount} answered
                    {notAsked !== null ? ` · ${notAsked} not asked or skipped` : ''}
                  </p>
                  {retired ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {q.status === 'reworded'
                        ? `Earlier wording${q.currentQuestionText ? ` — now “${q.currentQuestionText}”` : ''}. `
                        : 'No longer asked. '}
                      {q.askedIn?.length ? `Asked in ${q.askedIn.map(periodLabel).join(', ')}.` : ''}
                    </p>
                  ) : null}
                </div>
                {topTwo ? (
                  <div className="shrink-0 rounded-md bg-primary/10 px-2.5 py-1 text-right" data-testid="question-top-two">
                    <p className="text-sm font-semibold tabular-nums text-foreground">{topTwo}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {q.topTwo!.positive} of {q.topTwo!.base} on the scale
                    </p>
                  </div>
                ) : null}
              </div>

              {q.answerCount === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">No answers yet.</p>
              ) : q.options?.length ? (
                <>
                  <ul className="mt-3 space-y-2">
                    {shownOptions.map(opt => (
                      <li key={opt.label} className="flex items-center gap-2 text-sm">
                        <span className="w-40 shrink-0 truncate text-muted-foreground" title={opt.label}>
                          {opt.label}
                        </span>
                        <div className="min-w-0 flex-1">
                          <Progress value={opt.percent ?? 0} size="sm" aria-label={`${opt.label} ${opt.percent ?? 0}%`} />
                        </div>
                        <span className="w-20 shrink-0 text-right tabular-nums text-muted-foreground">
                          {opt.count} · {opt.percent ?? 0}%
                        </span>
                      </li>
                    ))}
                  </ul>
                  <NotCountedAnswers options={q.options} />
                  {q.optionsFrom ? (
                    <div className="mt-2 space-y-1" data-testid="lookup-details">
                      {q.lookupDetails?.length ? (
                        <ul className="space-y-0.5 text-xs text-muted-foreground">
                          {q.lookupDetails.map(d => (
                            <li key={d.label}>
                              {d.label}: {d.count}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {q.lookupDetailsNote ? <p className="text-xs text-muted-foreground">{q.lookupDetailsNote}</p> : null}
                    </div>
                  ) : null}
                  {q.questionType === 'MULTI_SELECT' ? (
                    <p className="mt-2 text-xs text-muted-foreground" data-testid="multi-select-note">
                      People could choose more than one answer, so the percentages add up to more than 100%.
                    </p>
                  ) : null}
                </>
              ) : q.numeric ? (
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-md bg-muted/40 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Average</p>
                    <p className="font-semibold tabular-nums">{q.numeric.average ?? '—'}</p>
                  </div>
                  <div className="rounded-md bg-muted/40 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Lowest</p>
                    <p className="font-semibold tabular-nums">{q.numeric.min ?? '—'}</p>
                  </div>
                  <div className="rounded-md bg-muted/40 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Highest</p>
                    <p className="font-semibold tabular-nums">{q.numeric.max ?? '—'}</p>
                  </div>
                </div>
              ) : q.textSamples?.length ? (
                <ul className="mt-3 space-y-1.5">
                  {q.textSamples.map((sample, i) => (
                    <li
                      key={i}
                      className="rounded-md bg-muted/40 px-3 py-2 text-sm text-foreground"
                    >
                      “{sample}”
                    </li>
                  ))}
                </ul>
              ) : q.writtenAnswersWithheld ? null : (
                <p className="mt-3 text-xs text-muted-foreground">No displayable answers.</p>
              )}
              {q.answerCount > 0 ? <WrittenAnswers q={q} withheldNote={writtenAnswersNote} /> : null}
            </div>

            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
