import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { CheckCircle2, ClipboardList, Eye, Loader2 } from 'lucide-react'
import { usePortalSurveyAnswers, usePortalSurveys } from '@/features/surveys/hooks/useSurveys'
import { describeSurveyRespondent } from '@/features/surveys/survey-respondent'
import type { PortalSurveyItem } from '@/features/surveys/types'
import { formatPortalDate } from '@/features/service-user-portal/components/portal-display.util'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { SurveySectionHeading } from '@/features/surveys/components/SurveySectionHeading'
import { withSectionHeadings } from '@/features/surveys/survey-sections'

function MyAnswersDialog({ survey, onClose }: { survey: PortalSurveyItem | null; onClose: () => void }) {
  const { data, isLoading, isError } = usePortalSurveyAnswers(survey?.token ?? null)
  return (
    <Dialog open={survey != null} onOpenChange={open => (open ? undefined : onClose())}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{survey?.title ?? 'Your answers'}</DialogTitle>
          <DialogDescription>
            {data
              ? `Submitted ${formatPortalDate(data.submittedAt)}${
                  data.respondentRelation
                    ? ` · ${describeSurveyRespondent(data.respondentRelation, data.respondentName)}`
                    : ''
                }`
              : 'The answers you submitted.'}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-2">
          {isLoading ? (
            <div role="status" className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading your answers…
            </div>
          ) : isError || !data ? (
            <p role="alert" className="py-6 text-center text-sm text-destructive">
              Could not load your answers.
            </p>
          ) : data.answers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No answers recorded.</p>
          ) : (
            withSectionHeadings(data.answers).map(({ item: a, index: idx, heading }) => (
              <React.Fragment key={a.questionId}>
                {heading ? <SurveySectionHeading title={heading} /> : null}
                <div className="rounded-lg border border-border bg-card px-3 py-2.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Q{idx + 1}. {a.questionText}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{a.displayValue}</p>
                  {a.comment ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                      <span className="text-xs font-medium text-muted-foreground">Your comment: </span>
                      {a.comment}
                    </p>
                  ) : null}
                </div>
              </React.Fragment>
            ))
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

function SurveyCard({ survey, onViewAnswers }: { survey: PortalSurveyItem; onViewAnswers: () => void }) {
  const completed = survey.state === 'COMPLETED'
  // Answered without their name (or an anonymous survey): nothing is kept against them to show.
  const canViewAnswers = completed && survey.answersAvailable !== false
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
          <h2 className="font-medium text-foreground">{survey.title}</h2>
          {survey.description ? (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{survey.description}</p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {completed
              ? survey.answeredWithoutName
                ? 'Completed · answered without your name, so your answers are not kept against your name'
                : !survey.completedAt
                  ? 'Completed'
                  : `Completed ${formatPortalDate(survey.completedAt)}${
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
            Answer survey<span className="sr-only">: {survey.title}</span>
          </Link>
        </Button>
      ) : canViewAnswers ? (
        <Button type="button" variant="outline" className="gap-1.5" onClick={onViewAnswers}>
          <Eye className="h-4 w-4" aria-hidden /> View my answers<span className="sr-only">: {survey.title}</span>
        </Button>
      ) : null}
    </li>
  )
}

export default function PortalSurveysPage() {
  const { data, isLoading, isError } = usePortalSurveys()
  const [viewing, setViewing] = React.useState<PortalSurveyItem | null>(null)

  if (isLoading) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Loading surveys…
      </p>
    )
  }
  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Could not load your surveys.
      </p>
    )
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
        <ul className="space-y-3" aria-label="Your surveys">
          {surveys.map(s => (
            <SurveyCard key={s.token} survey={s} onViewAnswers={() => setViewing(s)} />
          ))}
        </ul>
      )}

      <MyAnswersDialog survey={viewing} onClose={() => setViewing(null)} />
    </div>
  )
}
