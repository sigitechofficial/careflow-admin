import * as React from 'react'
import { ClipboardList, ShieldCheck } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  ChoiceOption,
  FieldError,
  QuestionField,
  RequiredMark,
  hasValue,
  questionAnchorId,
} from '@/features/surveys/components/SurveyQuestionField'
import type {
  PublicSurveyForm,
  SubmitSurveyResponseInput,
  SurveyAnswerInput,
  SurveyRespondentRelation,
} from '@/features/surveys/types'
import { SurveySectionHeading } from '@/features/surveys/components/SurveySectionHeading'
import { withSectionHeadings } from '@/features/surveys/survey-sections'
import { answerProblems, answersToSend, questionsAsked, visibleQuestions } from '@/features/surveys/survey-logic'
import { SurveyAnswerWithoutNameChoice } from '@/features/surveys/components/SurveyAnswerWithoutName'

const RESPONDENT_OPTIONS: { value: SurveyRespondentRelation; label: string }[] = [
  { value: 'SELF', label: 'I am the service user' },
  { value: 'FAMILY_MEMBER', label: 'I am a family member answering for them' },
  { value: 'REPRESENTATIVE', label: 'I am their representative (e.g. advocate, attorney)' },
]

type AnswerState = Record<string, SurveyAnswerInput>

/** One thing to put right before submitting, shown in the error summary and by the question. */
type Problem = { key: string; targetId: string; summary: string }

export const ANSWER_THIS_QUESTION = 'Answer this question'
export const DESCRIBE_OTHER_ANSWER = 'Tell us your “Other” answer'
export const CHOOSE_WHO_IS_ANSWERING = 'Choose who is answering this survey'
const RESPONDENT_BLOCK_ID = 'survey-who-is-answering'

/** Move focus to the first answer control in a block (the error summary's links). */
function focusFirstControl(blockId: string) {
  const block = document.getElementById(blockId)
  const control = block?.querySelector<HTMLElement>(
    'input:not([type=hidden]):not(:disabled), textarea:not(:disabled), select:not(:disabled)',
  )
  block?.scrollIntoView?.({ block: 'start' })
  control?.focus({ preventScroll: true })
}

/**
 * The survey exactly as the person answering it sees it: used by the survey link / portal page and
 * by the staff preview, so the preview can never drift from the real thing.
 */
export function SurveyRespondentForm({
  data,
  submitting,
  onSubmit,
}: {
  data: PublicSurveyForm
  submitting: boolean
  /** Called with the answers to send; the caller saves them (or, in a preview, does not). */
  onSubmit: (input: SubmitSurveyResponseInput) => Promise<void>
}) {
  const [answers, setAnswers] = React.useState<AnswerState>({})
  const [respondentRelation, setRespondentRelation] = React.useState<SurveyRespondentRelation | null>(null)
  const [respondentName, setRespondentName] = React.useState('')
  /** Named survey that allows it: answer without my name (the contact-me question is not asked). */
  const [withoutName, setWithoutName] = React.useState(false)
  const offerWithoutName = Boolean(data.allowAnonymousResponses && !data.isAnonymous)
  const answeringWithoutName = offerWithoutName && withoutName
  // Answering without their name: who is answering is neither asked nor kept (it narrows down who it was).
  const askRespondent = Boolean(data.askRespondent) && !answeringWithoutName
  const respondentMissing = askRespondent && !respondentRelation

  const allQuestions = React.useMemo(
    () => [...data.questions].sort((a, b) => a.sortOrder - b.sortOrder),
    [data],
  )
  // Linked to no one (anonymous survey, or without a name): contact-me and its follow-ups are not
  // asked — the server leaves them out and discards any answer to them too.
  const unlinked = answeringWithoutName || Boolean(data.isAnonymous) || Boolean(data.unlinked)
  const questions = React.useMemo(() => questionsAsked(allQuestions, unlinked), [allQuestions, unlinked])

  // Questions with "Show only if" appear and disappear as the person answers.
  const shown = visibleQuestions(questions, answers)
  const answeredCount = shown.filter(q => hasValue(q.questionType, answers[q.id])).length
  const { missingRequired, missingOtherText } = answerProblems(questions, answers)
  const incomplete = missingRequired.length > 0 || missingOtherText.length > 0

  // Errors appear only after a first try to submit, then update as the person puts them right.
  const [showErrors, setShowErrors] = React.useState(false)
  const [attempt, setAttempt] = React.useState(0)
  const summaryRef = React.useRef<HTMLDivElement>(null)
  // When the form opened: only how long it took is sent (to flag very fast answers); the API never keeps it.
  const openedAt = React.useRef(Date.now())
  const missingIds = new Set(missingRequired.map(q => q.id))
  const otherIds = new Set(missingOtherText.map(q => q.id))
  const problems: Problem[] = [
    ...(respondentMissing
      ? [{ key: 'respondent', targetId: RESPONDENT_BLOCK_ID, summary: CHOOSE_WHO_IS_ANSWERING }]
      : []),
    ...shown.flatMap((q, i) =>
      missingIds.has(q.id) || otherIds.has(q.id)
        ? [
            {
              key: q.id,
              targetId: questionAnchorId(q.id),
              summary: `${missingIds.has(q.id) ? ANSWER_THIS_QUESTION : DESCRIBE_OTHER_ANSWER}: question ${i + 1}, “${q.questionText}”`,
            },
          ]
        : [],
    ),
  ]
  React.useEffect(() => {
    if (attempt > 0) summaryRef.current?.focus()
  }, [attempt])
  // With section headings (h2), questions are h3 beneath them.
  const sectioned = shown.some(q => q.sectionTitle?.trim())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data.canSubmit || submitting) return
    if (incomplete || respondentMissing) {
      setShowErrors(true)
      setAttempt(n => n + 1)
      return
    }
    await onSubmit({
      answers: answersToSend(questions, answers),
      ...(askRespondent && respondentRelation
        ? {
            respondentRelation,
            ...(respondentRelation !== 'SELF' && respondentName.trim() && !answeringWithoutName
              ? { respondentName: respondentName.trim() }
              : {}),
          }
        : {}),
      ...(answeringWithoutName ? { answerWithoutName: true } : {}),
      secondsTaken: Math.max(0, Math.round((Date.now() - openedAt.current) / 1000)),
    })
  }

  return (
    <>
      <header className="mb-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white">
            <ClipboardList className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Survey</p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{data.title}</h1>
            {data.forName ? (
              <p className="mt-1 text-sm text-muted-foreground">
                For <span className="font-medium text-foreground">{data.forName}</span>
              </p>
            ) : null}
            {data.description ? (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {data.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {data.isAnonymous ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-600/10 px-2.5 py-1 text-xs font-medium text-teal-800 dark:text-teal-200">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Anonymous responses
            </span>
          ) : data.sharedLinkNote ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-600/10 px-2.5 py-1 text-xs font-medium text-teal-800 dark:text-teal-200">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Not linked to your name
            </span>
          ) : offerWithoutName ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-600/10 px-2.5 py-1 text-xs font-medium text-teal-800 dark:text-teal-200">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              {answeringWithoutName ? 'Answering without your name' : 'You can answer without your name'}
            </span>
          ) : null}
          {shown.length > 0 ? (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              {shown.length} question{shown.length === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>
        {data.sharedLinkNote ? (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground" data-testid="shared-link-note">
            {data.sharedLinkNote}
          </p>
        ) : null}
        {data.canSubmit && (shown.some(q => q.isRequired) || askRespondent) ? (
          <p className="mt-3 text-xs text-muted-foreground" data-testid="required-note">
            Questions marked{' '}
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
            <span className="sr-only"> with a star</span> need an answer.
          </p>
        ) : null}
        {data.oncePerDeviceNote ? (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground" data-testid="once-per-device-note">
            {data.oncePerDeviceNote}
          </p>
        ) : null}
      </header>

      {!data.canSubmit ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">
            {data.unavailableReason ?? 'This survey is not accepting responses right now.'}
          </p>
        </div>
      ) : (
        <form onSubmit={e => void handleSubmit(e)} noValidate className="pb-24" aria-label={data.title}>
          {showErrors && problems.length > 0 ? (
            <div
              ref={summaryRef}
              tabIndex={-1}
              role="alert"
              aria-labelledby="survey-error-summary-title"
              className="mb-4 rounded-2xl border-2 border-destructive bg-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
              data-testid="survey-error-summary"
            >
              <h2 id="survey-error-summary-title" className="text-base font-semibold text-foreground">
                There is a problem
              </h2>
              <ul className="mt-2 space-y-1.5 text-sm">
                {problems.map(p => (
                  <li key={p.key}>
                    <a
                      href={`#${p.targetId}`}
                      className="font-medium text-destructive underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={e => {
                        e.preventDefault()
                        focusFirstControl(p.targetId)
                      }}
                    >
                      {p.summary}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mb-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              Answered {answeredCount} of {shown.length}
            </span>
            {missingRequired.length > 0 ? (
              <span>{missingRequired.length} required left</span>
            ) : missingOtherText.length > 0 ? (
              <span>Please fill in your “Other” answer</span>
            ) : respondentMissing ? (
              <span>Choose who is answering</span>
            ) : (
              <span className="text-teal-700 dark:text-teal-300">Ready to submit</span>
            )}
          </div>

          {askRespondent ? (
            <div
              id={RESPONDENT_BLOCK_ID}
              className={`mb-3 scroll-mt-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-5 ${
                showErrors && respondentMissing ? 'border-destructive' : 'border-border'
              }`}
            >
              <fieldset
                className="min-w-0"
                aria-describedby={`${RESPONDENT_BLOCK_ID}-hint${
                  showErrors && respondentMissing ? ` ${RESPONDENT_BLOCK_ID}-error` : ''
                }`}
              >
                <legend className="w-full">
                  <h2 className="text-sm font-medium text-foreground">
                    Who is answering this survey?
                    <RequiredMark />
                  </h2>
                </legend>
                <p id={`${RESPONDENT_BLOCK_ID}-hint`} className="mt-0.5 text-xs text-muted-foreground">
                  A family member or representative can answer on the service user's behalf.
                </p>
                {showErrors && respondentMissing ? (
                  <FieldError id={`${RESPONDENT_BLOCK_ID}-error`}>{CHOOSE_WHO_IS_ANSWERING}</FieldError>
                ) : null}
                <div className="mt-3 grid gap-2">
                  {RESPONDENT_OPTIONS.map(opt => (
                    <ChoiceOption
                      key={opt.value}
                      type="radio"
                      name="survey-respondent-relation"
                      checked={respondentRelation === opt.value}
                      disabled={submitting}
                      invalid={showErrors && respondentMissing}
                      onChange={() => setRespondentRelation(opt.value)}
                    >
                      {opt.label}
                    </ChoiceOption>
                  ))}
                </div>
              </fieldset>
              {respondentRelation && respondentRelation !== 'SELF' && !answeringWithoutName ? (
                <div className="mt-3 space-y-1 text-sm">
                  <label htmlFor="survey-respondent-name" className="block text-xs font-medium text-foreground">
                    Your name (optional)
                  </label>
                  <Input
                    id="survey-respondent-name"
                    autoComplete="name"
                    value={respondentName}
                    maxLength={200}
                    disabled={submitting}
                    onChange={e => setRespondentName(e.target.value)}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {offerWithoutName ? (
            <SurveyAnswerWithoutNameChoice withoutName={withoutName} disabled={submitting} onChange={setWithoutName} />
          ) : null}

          <div className="space-y-3">
            {withSectionHeadings(shown).map(({ item: q, index: i, heading }) => (
              <React.Fragment key={q.id}>
                {heading ? (
                  <SurveySectionHeading
                    title={heading}
                    introduction={data.sectionIntros?.[heading]}
                    level={2}
                    className="pt-4 text-base"
                  />
                ) : null}
                <QuestionField
                  q={q}
                  index={i}
                  value={answers[q.id]}
                  disabled={submitting}
                  anonymous={unlinked}
                  headingLevel={sectioned ? 3 : 2}
                  error={showErrors && missingIds.has(q.id) ? ANSWER_THIS_QUESTION : null}
                  otherTextError={showErrors && otherIds.has(q.id) ? DESCRIBE_OTHER_ANSWER : null}
                  onChange={next => setAnswers(prev => ({ ...prev, [q.id]: next }))}
                />
              </React.Fragment>
            ))}
          </div>

          {/* Sticky on ordinary screens; in short windows (e.g. zoomed to 400%) it scrolls with the page
              so it never hides the answer that has focus (WCAG 2.4.11). */}
          <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-border bg-slate-50/95 px-4 py-3 backdrop-blur dark:bg-background/95 sm:-mx-6 sm:px-6 [@media(max-height:32rem)]:static">
            <div className="mx-auto flex max-w-2xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {respondentMissing
                  ? 'Please choose who is answering this survey.'
                  : missingRequired.length > 0
                    ? 'Please answer all required questions marked with *.'
                    : missingOtherText.length > 0
                      ? `Please tell us your “Other” answer for: ${missingOtherText[0]!.questionText}`
                      : 'You can submit your response now.'}
              </p>
              <Button
                type="submit"
                disabled={submitting}
                className="min-w-[160px] self-end sm:self-auto"
              >
                {submitting ? 'Submitting…' : 'Submit response'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </>
  )
}
