import * as React from 'react'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'
import type {
  PublicSurveyQuestion,
  SurveyAnswerInput,
  SurveyQuestionType,
} from '@/features/surveys/types'

/** One survey question with its answer control — shared by the public form and staff recording. */
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

export function hasValue(type: SurveyQuestionType, answer: SurveyAnswerInput | undefined): boolean {
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

export function ChoiceButton({
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

export function QuestionField({
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
