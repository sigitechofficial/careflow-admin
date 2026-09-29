import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, ClipboardList, Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useSurvey, useSurveyResults } from '@/features/surveys/hooks/useSurveys'
import { SurveyResponsesPanel } from '@/features/surveys/components/SurveyResponsesPanel'
import { SurveyCompletionProgress } from '@/features/surveys/components/SurveyCompletionProgress'

export default function SurveyResponsesPage() {
  const { surveyId = '' } = useParams({ strict: false }) as { surveyId?: string }
  const { data: survey, isLoading, isError } = useSurvey(surveyId)
  const showStats = Boolean(survey)
  const { data: results } = useSurveyResults(surveyId, showStats)

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading responses…
      </div>
    )
  }

  if (isError || !survey) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">Survey not found.</p>
        <Button variant="outline" asChild>
          <Link to="/surveys">Back to surveys</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full flex-1 px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-start gap-2">
          <Button type="button" variant="ghost" size="icon" className="mt-0.5 shrink-0" asChild>
            <Link to="/surveys/$surveyId" params={{ surveyId }}>
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back to survey</span>
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <ClipboardList className="h-3.5 w-3.5" aria-hidden />
              Response audience
            </div>
            <h1 className="mt-0.5 text-xl font-semibold text-foreground">{survey.title}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {survey.status}
              {survey.isAnonymous ? ' · Anonymous' : ''}
              {typeof survey.responseCount === 'number'
                ? ` · ${survey.responseCount} response${survey.responseCount === 1 ? '' : 's'}`
                : ''}
            </p>
          </div>
        </div>
        <Button type="button" size="sm" variant="outline" asChild>
          <Link to="/surveys/$surveyId" params={{ surveyId }}>
            Edit survey
          </Link>
        </Button>
      </div>

      <SurveyCompletionProgress
        className="mb-5"
        completed={results?.completed ?? survey.responseCount ?? 0}
        recipients={results?.recipients ?? survey.recipientCount ?? 0}
        hint={
          results?.includesPeriodRuns
            ? 'Includes all weekly/monthly period runs created from this survey.'
            : undefined
        }
      />

      {results && results.recipients > 0 ? (
        <div className="mb-5 grid grid-cols-3 gap-3">
          {[
            { label: 'Recipients', value: results.recipients },
            { label: 'Completed', value: results.completed },
            { label: 'Response rate', value: `${results.responseRate}%` },
          ].map(stat => (
            <div key={stat.label} className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <SurveyResponsesPanel surveyId={surveyId} />
    </div>
  )
}
