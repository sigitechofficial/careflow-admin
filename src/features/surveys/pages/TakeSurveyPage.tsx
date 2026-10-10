import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { CheckCircle2, ClipboardList, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { AppToaster } from '@/components/layout/AppToaster'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  usePublicSurvey,
  useSubmitPublicSurvey,
} from '@/features/surveys/hooks/useSurveys'
import {
  ChoiceButton,
  QuestionField,
  hasValue,
} from '@/features/surveys/components/SurveyQuestionField'
import type {
  SurveyAnswerInput,
  SurveyRespondentRelation,
} from '@/features/surveys/types'

const RESPONDENT_OPTIONS: { value: SurveyRespondentRelation; label: string }[] = [
  { value: 'SELF', label: 'I am the service user' },
  { value: 'FAMILY_MEMBER', label: 'I am a family member answering for them' },
  { value: 'REPRESENTATIVE', label: 'I am their representative (e.g. advocate, attorney)' },
]

type AnswerState = Record<string, SurveyAnswerInput>

function PublicShell({ children }: { children: React.ReactNode }) {
  // #root is overflow:hidden for the admin shell — this page must own scrolling.
  return (
    <div className="h-full overflow-y-auto overscroll-y-contain bg-slate-50 dark:bg-background">
      <AppToaster />
      {children}
    </div>
  )
}

function CenteredState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <PublicShell>
      <div className="flex min-h-full items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            {icon}
          </div>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          {action ? <div className="mt-5">{action}</div> : null}
        </div>
      </div>
    </PublicShell>
  )
}

export default function TakeSurveyPage() {
  const { token = '' } = useParams({ strict: false }) as { token?: string }
  const { data, isLoading, isError, error } = usePublicSurvey(token || undefined)
  const submitMut = useSubmitPublicSurvey(token)
  const [answers, setAnswers] = React.useState<AnswerState>({})
  const [submitted, setSubmitted] = React.useState(false)
  const [respondentRelation, setRespondentRelation] = React.useState<SurveyRespondentRelation | null>(null)
  const [respondentName, setRespondentName] = React.useState('')
  const askRespondent = Boolean(data?.askRespondent)
  const respondentMissing = askRespondent && !respondentRelation

  const questions = React.useMemo(
    () => (data ? [...data.questions].sort((a, b) => a.sortOrder - b.sortOrder) : []),
    [data],
  )

  const answeredCount = questions.filter(q => hasValue(q.questionType, answers[q.id])).length
  const missingRequired = questions.filter(
    q => q.isRequired && !hasValue(q.questionType, answers[q.id]),
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data?.canSubmit || missingRequired.length > 0 || respondentMissing) return
    try {
      await submitMut.mutateAsync({
        answers: Object.values(answers).filter(a => {
          const q = questions.find(item => item.id === a.questionId)
          return q ? hasValue(q.questionType, a) : false
        }),
        ...(askRespondent && respondentRelation
          ? {
              respondentRelation,
              ...(respondentRelation !== 'SELF' && respondentName.trim()
                ? { respondentName: respondentName.trim() }
                : {}),
            }
          : {}),
      })
      setSubmitted(true)
      toastSuccess('Thank you — your response was submitted.')
    } catch (err) {
      toastApiError(err, 'Could not submit survey')
    }
  }

  if (isLoading) {
    return (
      <PublicShell>
        <div className="flex min-h-full items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading survey…
        </div>
      </PublicShell>
    )
  }

  if (isError || !data) {
    return (
      <CenteredState
        icon={<ClipboardList className="h-6 w-6 text-muted-foreground" />}
        title="Survey unavailable"
        description={
          (error as Error)?.message || 'This survey link is invalid or no longer available.'
        }
      />
    )
  }

  if (submitted || (data.alreadyCompleted && data.linkKind !== 'share')) {
    return (
      <CenteredState
        icon={<CheckCircle2 className="h-6 w-6 text-teal-600" />}
        title="Response recorded"
        description={
          data.alreadyCompleted && !submitted
            ? 'You have already completed this survey. Thank you.'
            : 'Thank you for completing this survey.'
        }
        action={
          data.askRespondent ? (
            <Button asChild variant="outline">
              <Link to="/portal/surveys">Back to my surveys</Link>
            </Button>
          ) : undefined
        }
      />
    )
  }

  return (
    <PublicShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white">
              <ClipboardList className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Survey
              </p>
              <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {data.title}
              </h1>
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
            ) : null}
            {questions.length > 0 ? (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                {questions.length} question{questions.length === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>
        </header>

        {!data.canSubmit ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">
              {data.unavailableReason ?? 'This survey is not accepting responses right now.'}
            </p>
          </div>
        ) : (
          <form onSubmit={e => void handleSubmit(e)} className="pb-24">
            <div className="mb-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                Answered {answeredCount} of {questions.length}
              </span>
              {missingRequired.length > 0 ? (
                <span>{missingRequired.length} required left</span>
              ) : respondentMissing ? (
                <span>Choose who is answering</span>
              ) : (
                <span className="text-teal-700 dark:text-teal-300">Ready to submit</span>
              )}
            </div>

            {askRespondent ? (
              <section className="mb-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
                <p className="text-sm font-medium text-foreground">
                  Who is answering this survey? <span className="text-destructive">*</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  A family member or representative can answer on the service user's behalf.
                </p>
                <div className="mt-3 grid gap-2">
                  {RESPONDENT_OPTIONS.map(opt => (
                    <ChoiceButton
                      key={opt.value}
                      selected={respondentRelation === opt.value}
                      disabled={submitMut.isPending}
                      onClick={() => setRespondentRelation(opt.value)}
                    >
                      {opt.label}
                    </ChoiceButton>
                  ))}
                </div>
                {respondentRelation && respondentRelation !== 'SELF' ? (
                  <label className="mt-3 block space-y-1 text-sm">
                    <span className="text-xs text-muted-foreground">Your name (optional)</span>
                    <Input
                      value={respondentName}
                      maxLength={200}
                      disabled={submitMut.isPending}
                      onChange={e => setRespondentName(e.target.value)}
                    />
                  </label>
                ) : null}
              </section>
            ) : null}

            <div className="space-y-3">
              {questions.map((q, i) => (
                <QuestionField
                  key={q.id}
                  q={q}
                  index={i}
                  value={answers[q.id]}
                  disabled={submitMut.isPending}
                  onChange={next => setAnswers(prev => ({ ...prev, [q.id]: next }))}
                />
              ))}
            </div>

            <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-border bg-slate-50/95 px-4 py-3 backdrop-blur dark:bg-background/95 sm:-mx-6 sm:px-6">
              <div className="mx-auto flex max-w-2xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  {respondentMissing
                    ? 'Please choose who is answering this survey.'
                    : missingRequired.length > 0
                      ? 'Please answer all required questions marked with *.'
                      : 'You can submit your response now.'}
                </p>
                <Button
                  type="submit"
                  disabled={submitMut.isPending || missingRequired.length > 0 || respondentMissing}
                  className="min-w-[160px] self-end sm:self-auto"
                >
                  {submitMut.isPending ? 'Submitting…' : 'Submit response'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </PublicShell>
  )
}
