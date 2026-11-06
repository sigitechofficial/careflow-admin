import { Fragment, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { useSurvey } from '@/features/surveys/hooks/useSurveys'
import type { SurveyAnswerInput } from '@/features/surveys/types'
import { SurveySectionHeading } from '@/features/surveys/components/SurveySectionHeading'
import { QuestionField } from '@/features/surveys/components/SurveyQuestionField'
import { withSectionHeadings } from '@/features/surveys/survey-sections'
import { questionsAsked, visibleQuestions } from '@/features/surveys/survey-logic'
import { SurveyAnswerWithoutNameChoice } from '@/features/surveys/components/SurveyAnswerWithoutName'

/**
 * How recipients see the survey, to try out: answers here are never saved, but questions asked
 * only after certain answers, "Other" text boxes and comment boxes appear as they would.
 */
export function SurveyPreviewDialog({
  surveyId,
  open,
  onOpenChange,
}: {
  surveyId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: survey, isLoading } = useSurvey(open ? surveyId ?? undefined : undefined)
  const [answers, setAnswers] = useState<Record<string, SurveyAnswerInput>>({})
  const [withoutName, setWithoutName] = useState(false)
  useEffect(() => {
    if (open) {
      setAnswers({})
      setWithoutName(false)
    }
  }, [open, surveyId])
  const offerWithoutName = Boolean(survey?.allowAnonymousResponses && !survey?.isAnonymous)
  const answeringWithoutName = offerWithoutName && withoutName
  const allQuestions = survey ? [...survey.questions].sort((a, b) => a.sortOrder - b.sortOrder) : []
  // Linked to no one (anonymous survey, or without a name): contact-me and its follow-ups are not asked.
  const questions = questionsAsked(allQuestions, answeringWithoutName || Boolean(survey?.isAnonymous))
  const shown = visibleQuestions(questions, answers)
  const hiddenCount = questions.length - shown.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{survey?.title ?? 'Survey preview'}</DialogTitle>
          {survey?.description ? (
            <DialogDescription className="whitespace-pre-line">{survey.description}</DialogDescription>
          ) : (
            <DialogDescription>How recipients see this survey. Try answering — nothing is saved.</DialogDescription>
          )}
        </DialogHeader>
        <DialogBody className="space-y-3">
          {isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading survey…
            </div>
          ) : questions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">This survey has no questions yet.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                <span>
                  Preview — try answering; nothing is saved.
                  {survey?.isAnonymous ? ' Responses to this survey are anonymous.' : ''}
                  {hiddenCount > 0
                    ? ` ${hiddenCount} question${hiddenCount === 1 ? ' is' : 's are'} asked only after certain answers.`
                    : ''}
                </span>
                {Object.keys(answers).length > 0 ? (
                  <Button type="button" size="sm" variant="ghost" className="h-7" onClick={() => setAnswers({})}>
                    Clear answers
                  </Button>
                ) : null}
              </div>
              {offerWithoutName ? (
                <SurveyAnswerWithoutNameChoice withoutName={withoutName} onChange={setWithoutName} />
              ) : null}
              {withSectionHeadings(shown).map(({ item: q, index: i, heading }) => (
                <Fragment key={q.id}>
                  {heading ? <SurveySectionHeading title={heading} introduction={survey?.sectionIntros?.[heading]} /> : null}
                  <QuestionField
                    q={q}
                    index={i}
                    value={answers[q.id]}
                    disabled={false}
                    headingLevel={shown.some(s => s.sectionTitle?.trim()) ? 4 : 3}
                    anonymous={survey?.isAnonymous || answeringWithoutName}
                    onChange={next => setAnswers(prev => ({ ...prev, [q.id]: next }))}
                  />
                </Fragment>
              ))}
              {survey?.closingMessage ? (
                <section className="space-y-1 rounded-md border border-dashed p-3" data-testid="preview-closing-message">
                  <h3 className="text-sm font-medium">After submitting, people see</h3>
                  <p className="text-sm text-muted-foreground">Thank you for completing this survey.</p>
                  <p className="whitespace-pre-line text-sm">{survey.closingMessage}</p>
                </section>
              ) : null}
            </>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
