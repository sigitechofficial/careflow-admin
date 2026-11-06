import * as React from 'react'
import { CheckCircle2, RotateCcw } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { LibrarySurveyDetail } from '@/features/surveys/api/survey-library.api'
import type { PublicSurveyForm, SurveyQuestion } from '@/features/surveys/types'
import { SurveyRespondentForm } from '@/features/surveys/components/SurveyRespondentForm'

/**
 * A ready-made survey as the person answering it receives it (the same form as Preview): what they
 * read first, the sections, and the questions, including ones shown only after certain answers.
 */
export function libraryAsRespondentForm(survey: LibrarySurveyDetail): PublicSurveyForm {
  let sortOrder = 0
  const questions: SurveyQuestion[] = survey.sections.flatMap(section =>
    section.questions.map(q => {
      const notCounted = q.notCountedOptions?.length ? { notCountedOptions: q.notCountedOptions } : {}
      // The library names the earlier question by its text too; the form needs only its id and answers.
      const showIf = q.showIf ? (({ questionText: _t, ...rule }) => rule)(q.showIf) : null
      return {
        id: q.id,
        questionText: q.questionText,
        helpText: q.helpText,
        questionType: q.questionType,
        options: q.options,
        config: q.config || Object.keys(notCounted).length ? { ...(q.config ?? {}), ...notCounted } : null,
        isRequired: q.isRequired,
        sortOrder: sortOrder++,
        sectionTitle: section.title,
        otherOption: q.otherOption ?? null,
        exclusiveOptions: q.exclusiveOptions,
        commentConfig: q.commentConfig ?? null,
        showIf,
      } as SurveyQuestion
    }),
  )
  const sectionIntros: Record<string, string> = {}
  for (const s of survey.sections) {
    if (s.title && s.introduction?.trim()) sectionIntros[s.title] = s.introduction
  }
  return {
    title: survey.title,
    description: `${survey.introduction.trim()}\n\n${survey.privacyNotice.trim()}`,
    isAnonymous: survey.anonymous,
    allowAnonymousResponses: Boolean(survey.allowAnonymousResponses && !survey.anonymous),
    status: 'ACTIVE',
    opensAt: null,
    closesAt: null,
    alreadyCompleted: false,
    canSubmit: true,
    unavailableReason: null,
    linkKind: survey.audience === 'PUBLIC' ? 'share' : 'recipient',
    askRespondent: survey.audience === 'SERVICE_USER',
    forName: null,
    questions,
    sectionIntros,
  } as PublicSurveyForm
}

/** Try a ready-made survey as people answer it. Nothing is saved. */
export function LibrarySurveyRespondentView({ survey }: { survey: LibrarySurveyDetail }) {
  const form = React.useMemo(() => libraryAsRespondentForm(survey), [survey])
  const [attempt, setAttempt] = React.useState(0)
  const [finished, setFinished] = React.useState(false)
  const startAgain = () => {
    setFinished(false)
    setAttempt(n => n + 1)
  }

  if (finished) {
    return (
      <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <CheckCircle2 className="h-6 w-6 text-teal-600" aria-hidden />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Response recorded</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Thank you for completing this survey.</p>
        {survey.closingMessage ? (
          <p className="mt-4 whitespace-pre-line border-t border-border pt-4 text-left text-sm leading-relaxed text-foreground">
            {survey.closingMessage}
          </p>
        ) : null}
        <p className="mt-4 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          This is what people see after they submit. Nothing was saved.
        </p>
        <Button type="button" variant="outline" className="mt-5 gap-1.5" onClick={startAgain}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Start again
        </Button>
      </div>
    )
  }

  return (
    <div data-testid="library-respondent-view">
      <p className="mb-4 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        This is the page people answer on. Try answering: questions shown only after certain answers appear as you go.
        Nothing you enter here is saved.
      </p>
      <SurveyRespondentForm key={attempt} data={form} submitting={false} onSubmit={async () => setFinished(true)} />
    </div>
  )
}
