import { Link } from '@tanstack/react-router'
import { CheckCircle2, ClipboardList } from 'lucide-react'
import { usePortalSurveys } from '@/features/surveys/hooks/useSurveys'
import { describeSurveyRespondent } from '@/features/surveys/survey-respondent'
import type { PortalSurveyItem } from '@/features/surveys/types'
import { formatPortalDate } from '@/features/service-user-portal/components/portal-display.util'
import { Button } from '@/shared/ui/button'

function SurveyCard({ survey }: { survey: PortalSurveyItem }) {
  const completed = survey.state === 'COMPLETED'
  return (
    <li className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div
          className={
            completed
              ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-600/10 text-teal-700 dark:text-teal-300'
          }
        >
          {completed ? <CheckCircle2 className="h-5 w-5" aria-hidden /> : <ClipboardList className="h-5 w-5" aria-hidden />}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-foreground">{survey.title}</p>
          {survey.description ? (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{survey.description}</p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {completed
              ? `Completed ${formatPortalDate(survey.completedAt)}${
                  survey.respondentRelation
                    ? ` · ${describeSurveyRespondent(survey.respondentRelation)}`
                    : ''
                }`
              : survey.state === 'OPEN'
                ? survey.closesAt
                  ? `Please answer by ${formatPortalDate(survey.closesAt)}`
                  : 'Waiting for your answers'
                : (survey.unavailableReason ?? 'Not available right now')}
          </p>
        </div>
      </div>
      {survey.state === 'OPEN' ? (
        <Button asChild>
          <Link to="/survey/$token" params={{ token: survey.token }}>
            Answer survey
          </Link>
        </Button>
      ) : null}
    </li>
  )
}

export default function PortalSurveysPage() {
  const { data, isLoading, isError } = usePortalSurveys()

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading surveys…</p>
  }
  if (isError) {
    return <p className="text-sm text-destructive">Could not load your surveys.</p>
  }

  const surveys = data ?? []
  const openCount = surveys.filter(s => s.state === 'OPEN').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Surveys</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your care team would like your feedback. A family member or representative can answer on your
          behalf.
          {openCount > 0 ? ` You have ${openCount} survey${openCount === 1 ? '' : 's'} to answer.` : ''}
        </p>
      </div>

      {surveys.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">You have no surveys right now.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {surveys.map(s => (
            <SurveyCard key={s.token} survey={s} />
          ))}
        </ul>
      )}
    </div>
  )
}
