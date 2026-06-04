import {
  InitialAssessmentControlTooltip,
  iaQuestionTooltipText,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentControlTooltip'
import { cn } from '@/shared/lib/utils'
import {
  IA_CHECKBOX_CLASS,
  IA_META_BADGE_CLASS,
  IA_OPTION_LABEL_CLASS,
  IA_QUESTION_LABEL_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import { parseQuestionOptions } from '@/features/service-users/initial-assessment/utils/question-options'
import type { InitialAssessmentAnswerInput, InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

type Props = {
  question: InitialAssessmentQuestion
  value: InitialAssessmentAnswerInput | undefined
  errorMessage?: string | null
  disabled?: boolean
  onChange: (patch: InitialAssessmentAnswerInput) => void
}

function selectedValues(value: InitialAssessmentAnswerInput | undefined): string[] {
  const raw = value?.selectedOptions
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string' && raw) return [raw]
  return []
}

export function InitialAssessmentMultiSelectOptionsGrid({
  question,
  value,
  errorMessage,
  disabled,
  onChange,
}: Props) {
  const options = parseQuestionOptions(question.options)
  const selected = new Set(selectedValues(value))
  const hasError = Boolean(errorMessage)
  const tooltipContent = iaQuestionTooltipText(question)
  const helpId = `${question.id}-help`
  const describedBy = question.helpText ? helpId : undefined

  const toggle = (optValue: string) => {
    const next = new Set(selected)
    if (next.has(optValue)) next.delete(optValue)
    else next.add(optValue)
    onChange({ questionId: question.id, selectedOptions: [...next] })
  }

  return (
    <div className="space-y-3">
      <div>
        <p className={IA_QUESTION_LABEL_CLASS}>
          {question.questionText}
          {question.isRequired ? (
            <span className="text-teal-700 dark:text-teal-400" aria-hidden>
              {' '}
              *
            </span>
          ) : null}
          {question.riskFlag ? (
            <span
              className={cn(
                IA_META_BADGE_CLASS,
                'ml-2 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
              )}
            >
              Risk
            </span>
          ) : null}
        </p>
        {question.helpText ? (
          <span id={helpId} className="sr-only">
            {question.helpText}
          </span>
        ) : null}
        {hasError ? (
          <p className="mt-1 text-xs font-medium text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((opt) => {
          const active = selected.has(opt.value)
          const isNoConcern = opt.value === 'no_concern'
          return (
            <label
              key={opt.value}
              className={cn(
                'flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors',
                IA_OPTION_LABEL_CLASS,
                active
                  ? isNoConcern
                    ? 'border-teal-500 bg-teal-50 dark:border-teal-700 dark:bg-teal-950/40'
                    : 'border-amber-400 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40'
                  : 'border-border bg-muted/20 hover:bg-muted/40',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <InitialAssessmentControlTooltip content={tooltipContent} disabled={disabled} className="inline-flex shrink-0">
                <input
                  type="checkbox"
                  className={cn('mt-0.5', IA_CHECKBOX_CLASS)}
                  checked={active}
                  disabled={disabled}
                  aria-describedby={describedBy}
                  onChange={() => toggle(opt.value)}
                />
              </InitialAssessmentControlTooltip>
              {opt.label}
            </label>
          )
        })}
      </div>
    </div>
  )
}
