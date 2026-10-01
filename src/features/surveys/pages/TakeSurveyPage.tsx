import * as React from 'react'
import { useParams } from '@tanstack/react-router'
import { CheckCircle2, ClipboardList, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { AppToaster } from '@/components/layout/AppToaster'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { cn } from '@/shared/lib/utils'
import {
  usePublicSurvey,
  useSubmitPublicSurvey,
} from '@/features/surveys/hooks/useSurveys'
import type {
  PublicSurveyQuestion,
  SurveyAnswerInput,
  SurveyQuestionType,
} from '@/features/surveys/types'

type AnswerState = Record<string, SurveyAnswerInput>

const DEFAULT_LIKERT = [
  'Strongly agree',
  'Agree',
  'Neutral',
  'Disagree',
  'Strongly disagree',
]

function ratingValues(config: Record<string, unknown> | null): number[] {
  const min = typeof config?.min === 'number' ? config.min : 0
  const max = typeof config?.max === 'number' ? config.max : 10
  return Array.from({ length: Math.max(0, max - min) + 1 }, (_, i) => min + i)
}

function choiceOptions(q: PublicSurveyQuestion): string[] {
  if (q.questionType === 'LIKERT') {
    return q.options?.length ? q.options : DEFAULT_LIKERT
  }
  return q.options ?? []
}

function hasValue(type: SurveyQuestionType, answer: SurveyAnswerInput | undefined): boolean {
  if (!answer) return false
  switch (type) {
    case 'YES_NO':
      return typeof answer.booleanValue === 'boolean'
    case 'SINGLE_SELECT':
    case 'LIKERT':
    case 'MULTI_SELECT':
      return Boolean(answer.selectedOptions?.length)
    case 'TEXT':
    case 'TEXTAREA':
      return Boolean(answer.textValue?.trim())
    case 'NUMBER':
    case 'RATING':
      return typeof answer.numberValue === 'number' && !Number.isNaN(answer.numberValue)
    default:
      return false
  }
}

function ChoiceButton({
  selected,
  disabled,
  onClick,
  children,
}: {
  selected: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
        selected
          ? 'border-teal-600 bg-teal-600/10 text-foreground ring-1 ring-teal-600/40'
          : 'border-border bg-background text-foreground hover:bg-muted/60',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      {children}
    </button>
  )
}

function QuestionField({
  q,
  index,
  value,
  disabled,
  onChange,
}: {
  q: PublicSurveyQuestion
  index: number
  value: SurveyAnswerInput | undefined
  disabled: boolean
  onChange: (next: SurveyAnswerInput) => void
}) {
  const options = choiceOptions(q)

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-600/10 text-xs font-semibold text-teal-700 dark:text-teal-300">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold leading-snug text-foreground sm:text-[15px]">
            {q.questionText}
            {q.isRequired ? <span className="ml-1 text-destructive">*</span> : null}
          </h2>
          {q.helpText ? (
            <p className="mt-1 text-xs text-muted-foreground">{q.helpText}</p>
          ) : null}

          <div className="mt-3.5">
            {q.questionType === 'YES_NO' ? (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Yes', val: true },
                  { label: 'No', val: false },
                ].map(opt => (
                  <ChoiceButton
                    key={opt.label}
                    selected={value?.booleanValue === opt.val}
                    disabled={disabled}
                    onClick={() => onChange({ questionId: q.id, booleanValue: opt.val })}
                  >
                    {opt.label}
                  </ChoiceButton>
                ))}
              </div>
            ) : q.questionType === 'SINGLE_SELECT' || q.questionType === 'LIKERT' ? (
              <div className="space-y-2">
                {options.map(opt => (
                  <ChoiceButton
                    key={opt}
                    selected={value?.selectedOptions?.[0] === opt}
                    disabled={disabled}
                    onClick={() => onChange({ questionId: q.id, selectedOptions: [opt] })}
                  >
                    {opt}
                  </ChoiceButton>
                ))}
              </div>
            ) : q.questionType === 'MULTI_SELECT' ? (
              <div className="space-y-2">
                {options.map(opt => {
                  const selected = value?.selectedOptions ?? []
                  const checked = selected.includes(opt)
                  return (
                    <ChoiceButton
                      key={opt}
                      selected={checked}
                      disabled={disabled}
                      onClick={() => {
                        const next = checked
                          ? selected.filter(s => s !== opt)
                          : [...selected, opt]
                        onChange({ questionId: q.id, selectedOptions: next })
                      }}
                    >
                      {opt}
                    </ChoiceButton>
                  )
                })}
              </div>
            ) : q.questionType === 'RATING' ? (
              <div className="flex flex-wrap gap-2">
                {ratingValues(q.config).map(n => (
                  <button
                    key={n}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange({ questionId: q.id, numberValue: n })}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium tabular-nums transition-colors',
                      value?.numberValue === n
                        ? 'border-teal-600 bg-teal-600 text-white'
                        : 'border-border bg-background text-foreground hover:bg-muted/60',
                      disabled && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            ) : q.questionType === 'NUMBER' ? (
              <Input
                type="number"
                className="h-11 w-40"
                disabled={disabled}
                value={value?.numberValue ?? ''}
                onChange={e => {
                  const raw = e.target.value
                  onChange({
                    questionId: q.id,
                    numberValue: raw === '' ? undefined : Number(raw),
                  })
                }}
              />
            ) : q.questionType === 'TEXTAREA' ? (
              <textarea
                rows={4}
                disabled={disabled}
                value={value?.textValue ?? ''}
                onChange={e => onChange({ questionId: q.id, textValue: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                placeholder="Your answer…"
              />
            ) : (
              <Input
                type="text"
                className="h-11"
                disabled={disabled}
                value={value?.textValue ?? ''}
                onChange={e => onChange({ questionId: q.id, textValue: e.target.value })}
                placeholder="Your answer…"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

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
}: {
  icon: React.ReactNode
  title: string
  description: string
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
    if (!data?.canSubmit || missingRequired.length > 0) return
    try {
      await submitMut.mutateAsync({
        answers: Object.values(answers).filter(a => {
          const q = questions.find(item => item.id === a.questionId)
          return q ? hasValue(q.questionType, a) : false
        }),
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
              ) : (
                <span className="text-teal-700 dark:text-teal-300">Ready to submit</span>
              )}
            </div>

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
                  {missingRequired.length > 0
                    ? 'Please answer all required questions marked with *.'
                    : 'You can submit your response now.'}
                </p>
                <Button
                  type="submit"
                  disabled={submitMut.isPending || missingRequired.length > 0}
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
