import { Progress } from '@/shared/ui/misc'
import { SURVEY_QUESTION_TYPE_LABELS, type SurveyQuestionSummary } from '@/features/surveys/types'

type SurveySummaryPanelProps = {
  summaries: SurveyQuestionSummary[]
  className?: string
}

export function SurveySummaryPanel({ summaries, className }: SurveySummaryPanelProps) {
  if (summaries.length === 0) return null

  return (
    <div className={className}>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">Survey summary</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Answer breakdown by question from submitted responses.
        </p>
      </div>
      <div className="space-y-3">
        {summaries.map((q, idx) => (
          <div key={q.questionId} className="rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {idx + 1}. {q.questionText}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {SURVEY_QUESTION_TYPE_LABELS[q.questionType]} · {q.answerCount} answer
                  {q.answerCount === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            {q.answerCount === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">No answers yet.</p>
            ) : q.options?.length ? (
              <ul className="mt-3 space-y-2">
                {q.options.map(opt => (
                  <li key={opt.label} className="flex items-center gap-2 text-sm">
                    <span className="w-36 shrink-0 truncate text-muted-foreground" title={opt.label}>
                      {opt.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Progress value={opt.percent} size="sm" aria-label={`${opt.label} ${opt.percent}%`} />
                    </div>
                    <span className="w-16 shrink-0 text-right tabular-nums text-muted-foreground">
                      {opt.count} · {opt.percent}%
                    </span>
                  </li>
                ))}
              </ul>
            ) : q.numeric ? (
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-md bg-muted/40 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Average</p>
                  <p className="font-semibold tabular-nums">{q.numeric.average ?? '—'}</p>
                </div>
                <div className="rounded-md bg-muted/40 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Min</p>
                  <p className="font-semibold tabular-nums">{q.numeric.min ?? '—'}</p>
                </div>
                <div className="rounded-md bg-muted/40 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Max</p>
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
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">No displayable answers.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
