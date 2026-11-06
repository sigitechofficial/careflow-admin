import * as React from 'react'
import { useDocumentTitle } from '@/shared/lib/use-document-title'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2, Eye, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useSurvey } from '@/features/surveys/hooks/useSurveys'
import type { PublicSurveyForm, SurveyDetail, SurveyTargetKind } from '@/features/surveys/types'
import { SurveyRespondentForm } from '@/features/surveys/components/SurveyRespondentForm'

/** Where the people this survey is for open it, said to the member of staff previewing it. */
const HOW_PEOPLE_SEE_IT: Record<SurveyTargetKind, string> = {
  SERVICE_USER:
    'People we support see this in their portal, after following the link in the email we send them. Their own name appears under the title, and a family member or representative can answer for them. Staff recording answers by phone, on a visit or from paper use the same questions.',
  EMPLOYEE:
    'Staff see this when they open the personal link in their survey email. The carer app notification opens the same survey.',
  PUBLIC: 'Anyone who opens the shareable link sees this page. They do not need an account.',
}

/** The survey as the person answering it receives it, so a preview shows exactly what they will see. */
function asRespondentForm(survey: SurveyDetail): PublicSurveyForm {
  return {
    title: survey.title,
    description: survey.description,
    isAnonymous: survey.isAnonymous,
    allowAnonymousResponses: Boolean(survey.allowAnonymousResponses && !survey.isAnonymous),
    status: survey.status,
    opensAt: survey.opensAt,
    closesAt: survey.closesAt,
    alreadyCompleted: false,
    canSubmit: true,
    unavailableReason: null,
    linkKind: survey.targetKind === 'PUBLIC' ? 'share' : 'recipient',
    askRespondent: survey.targetKind === 'SERVICE_USER',
    forName: null,
    questions: survey.questions,
    sectionIntros: survey.sectionIntros ?? {},
  }
}

/**
 * Staff preview of a survey or template: the same page the people it is for answer on. Answers can
 * be tried out, including questions shown only after certain answers; nothing is saved.
 */
export default function SurveyPreviewPage() {
  const { surveyId = '' } = useParams({ strict: false }) as { surveyId?: string }
  const { data: survey, isLoading, isError } = useSurvey(surveyId || undefined)
  useDocumentTitle(survey ? `Preview: ${survey.title} – CareAdmin` : null)
  /** Bumped by "Start again": remounts the form with no answers. */
  const [attempt, setAttempt] = React.useState(0)
  const [finished, setFinished] = React.useState(false)
  const form = React.useMemo(() => (survey ? asRespondentForm(survey) : null), [survey])

  const startAgain = () => {
    setFinished(false)
    setAttempt(n => n + 1)
  }

  return (
    <div className="w-full flex-1 px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="flex min-w-0 items-start gap-2">
          <Button type="button" variant="ghost" size="icon" className="mt-0.5 shrink-0" asChild>
            <Link to="/surveys/$surveyId" params={{ surveyId }}>
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
              <Eye className="h-5 w-5 text-muted-foreground" aria-hidden />
              Preview: what people see
            </h1>
            <p className="mt-0.5 max-w-3xl text-sm text-muted-foreground">
              {survey ? HOW_PEOPLE_SEE_IT[survey.targetKind] : 'Loading the survey…'}{' '}
              <span className="font-medium text-foreground">Try answering. Nothing you enter here is saved.</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={startAgain}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Start again
          </Button>
          <Button type="button" size="sm" asChild>
            <Link to="/surveys/$surveyId" params={{ surveyId }}>
              Back to the survey
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-slate-50 dark:bg-background" data-testid="survey-preview-frame">
        <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground" role="status">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Loading survey…
            </div>
          ) : isError || !survey || !form ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              This survey could not be loaded. Go back and try again.
            </p>
          ) : form.questions.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              This survey has no questions yet, so there is nothing for people to answer.
            </p>
          ) : finished ? (
            <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <CheckCircle2 className="h-6 w-6 text-teal-600" aria-hidden />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Response recorded</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Thank you for completing this survey.</p>
              {survey?.closingMessage ? (
                <p
                  className="mt-4 whitespace-pre-line border-t border-border pt-4 text-left text-sm leading-relaxed text-foreground"
                  data-testid="survey-closing-message"
                >
                  {survey.closingMessage}
                </p>
              ) : null}
              <p className="mt-4 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                This is what people see after they submit. In this preview nothing was saved.
              </p>
              <Button type="button" variant="outline" className="mt-5 gap-1.5" onClick={startAgain}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Start again
              </Button>
            </div>
          ) : (
            <SurveyRespondentForm
              key={attempt}
              data={form}
              submitting={false}
              onSubmit={async () => setFinished(true)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
