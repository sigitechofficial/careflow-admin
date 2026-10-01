import * as React from 'react'
import { ChevronDown, ChevronRight, Loader2, Users } from 'lucide-react'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { dayKeyFromInstant } from '@/shared/lib/operational-day.util'
import { useSurveyResponses } from '@/features/surveys/hooks/useSurveys'
import type { SurveyResponseItem } from '@/features/surveys/types'
import { describeSurveyRespondent } from '@/features/surveys/survey-respondent'

function ResponseRow({
  response,
  formatInstant,
}: {
  response: SurveyResponseItem
  formatInstant: (iso: string) => string
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="border-b border-border/70 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-start gap-2 px-4 py-3 text-left hover:bg-muted/30"
      >
        <span className="mt-0.5 text-muted-foreground">
          {open ? (
            <ChevronDown className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4" aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">
            {response.respondentLabel}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Submitted {formatInstant(response.submittedAt)} · {response.answerCount} answer
            {response.answerCount === 1 ? '' : 's'}
            {response.respondentRelation
              ? ` · ${describeSurveyRespondent(response.respondentRelation, response.respondentName)}`
              : ''}
          </span>
        </span>
      </button>

      {open ? (
        <div className="space-y-2 bg-muted/20 px-4 pb-4 pt-1">
          {response.answers.length === 0 ? (
            <p className="text-xs text-muted-foreground">No answers recorded.</p>
          ) : (
            response.answers.map((a, idx) => (
              <div
                key={a.questionId}
                className="rounded-lg border border-border bg-card px-3 py-2.5"
              >
                <p className="text-xs font-medium text-muted-foreground">
                  Q{idx + 1}. {a.questionText}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                  {a.displayValue}
                </p>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

export function SurveyResponsesPanel({ surveyId }: { surveyId: string }) {
  const { formatDate, formatTime } = useOrganisationDisplayFormat()
  const formatInstant = (iso: string) => {
    const day = dayKeyFromInstant(iso)
    return day ? `${formatDate(day)} ${formatTime(iso)}` : '—'
  }
  const { data, isLoading, isError, refetch, isFetching } = useSurveyResponses(surveyId)

  return (
    <div className="mb-5 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
            Response audience
            {data ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {data.total}
              </span>
            ) : null}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {data?.isAnonymous
              ? 'This survey is anonymous — respondent names are hidden.'
              : 'Who submitted and what they answered.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-xs font-medium text-primary hover:underline"
          disabled={isFetching}
        >
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 px-4 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading responses…
        </div>
      ) : isError ? (
        <p className="px-4 py-6 text-sm text-destructive">Could not load responses.</p>
      ) : !data || data.responses.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          No responses yet. Share the survey link and check back here.
        </p>
      ) : (
        <div>
          {data.responses.map(r => (
            <ResponseRow key={r.id} response={r} formatInstant={formatInstant} />
          ))}
        </div>
      )}
    </div>
  )
}
