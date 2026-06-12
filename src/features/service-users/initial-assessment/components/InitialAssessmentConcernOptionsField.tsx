import { useMemo, useState } from 'react'
import {
  InitialAssessmentControlTooltip,
  iaQuestionTooltipText,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentControlTooltip'
import { holisticQuestionLabel } from '@/features/service-users/initial-assessment/utils/holistic-assessment-labels'
import { cn } from '@/shared/lib/utils'
import {
  IA_CHECKBOX_CLASS,
  IA_META_BADGE_CLASS,
  IA_OPTION_LABEL_CLASS,
  IA_QUESTION_LABEL_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import { parseQuestionOptions } from '@/features/service-users/initial-assessment/utils/question-options'
import {
  activeConcernFollowUpGroups,
  followUpGroupsForConcernField,
  questionsForConcernFollowUpGroup,
  type ConcernFollowUpGroup,
} from '@/features/service-users/initial-assessment/utils/section-5-concern-follow-ups'
import { fieldKeyOf } from '@/features/service-users/initial-assessment/utils/question-lookup'
import type { InitialAssessmentAnswerInput, InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

type Props = {
  question: InitialAssessmentQuestion
  value: InitialAssessmentAnswerInput | undefined
  followUpQuestions: InitialAssessmentQuestion[]
  errorMessage?: string | null
  disabled?: boolean
  onChange: (patch: InitialAssessmentAnswerInput) => void
  renderField: (q: InitialAssessmentQuestion) => ReactNode
}

function selectedValues(value: InitialAssessmentAnswerInput | undefined): string[] {
  const raw = value?.selectedOptions
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string' && raw) return [raw]
  return []
}

function selectedOptionsKey(value: InitialAssessmentAnswerInput | undefined): string {
  const raw = value?.selectedOptions
  if (Array.isArray(raw)) return raw.map(String).slice().sort().join('\0')
  if (typeof raw === 'string' && raw) return raw
  return ''
}

function ConcernFollowUpPanel({
  group,
  questions,
  expanded,
  disabled,
  onToggle,
  renderField,
}: {
  group: ConcernFollowUpGroup
  questions: InitialAssessmentQuestion[]
  expanded: boolean
  disabled?: boolean
  onToggle: () => void
  renderField: (q: InitialAssessmentQuestion) => ReactNode
}) {
  if (questions.length === 0) return null

  return (
    <div
      className="overflow-hidden rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20"
      data-testid={`ia-concern-follow-up-${group.id}`}
    >
      <button
        type="button"
        className={cn(
          'flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-foreground',
          disabled && 'cursor-not-allowed opacity-60',
        )}
        disabled={disabled}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span>{group.title}</span>
        <ChevronDown
          className={cn('size-4 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')}
          aria-hidden
        />
      </button>
      {expanded ? (
        <div className="space-y-3 border-t border-amber-200/80 px-3 py-3 dark:border-amber-900/80">
          {questions.map((q) => (
            <div key={q.id}>{renderField(q)}</div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function InitialAssessmentConcernOptionsField({
  question,
  value,
  followUpQuestions,
  errorMessage,
  disabled,
  onChange,
  renderField,
}: Props) {
  const options = parseQuestionOptions(question.options)
  const selectionKey = selectedOptionsKey(value)
  const selected = useMemo(() => selectedValues(value), [selectionKey])
  const selectedSet = useMemo(() => new Set(selected), [selectionKey])
  const hasError = Boolean(errorMessage)
  const tooltipContent = iaQuestionTooltipText(question)
  const helpId = `${question.id}-help`
  const describedBy = question.helpText ? helpId : undefined

  const fieldKey = fieldKeyOf(question) ?? ''
  const followUpGroups = followUpGroupsForConcernField(fieldKey)
  const activeGroups = useMemo(
    () => activeConcernFollowUpGroups(followUpGroups, selected),
    [followUpGroups, selectionKey],
  )

  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(() => new Set())

  const expandedGroupIds = useMemo(() => {
    const expanded = new Set<string>()
    for (const group of activeGroups) {
      if (!collapsedGroupIds.has(group.id)) expanded.add(group.id)
    }
    return expanded
  }, [activeGroups, collapsedGroupIds])

  const toggleOption = (optValue: string) => {
    const next = new Set(selectedSet)
    if (next.has(optValue)) next.delete(optValue)
    else next.add(optValue)
    onChange({ questionId: question.id, selectedOptions: [...next] })
  }

  const toggleGroup = (groupId: string) => {
    setCollapsedGroupIds((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  const renderedFollowUpIds = new Set<string>()

  return (
    <div className="space-y-4" data-testid={`ia-concern-options-${fieldKey}`}>
      <div>
        <p className={IA_QUESTION_LABEL_CLASS}>
          {holisticQuestionLabel(question.questionText)}
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
          const active = selectedSet.has(opt.value)
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
                  onChange={() => toggleOption(opt.value)}
                />
              </InitialAssessmentControlTooltip>
              {opt.label}
            </label>
          )
        })}
      </div>

      {activeGroups.length > 0 ? (
        <div className="space-y-3">
          {activeGroups.map((group) => {
            const groupQuestions = questionsForConcernFollowUpGroup(group, followUpQuestions).filter((q) => {
              if (renderedFollowUpIds.has(q.id)) return false
              renderedFollowUpIds.add(q.id)
              return true
            })
            return (
              <ConcernFollowUpPanel
                key={group.id}
                group={group}
                questions={groupQuestions}
                expanded={expandedGroupIds.has(group.id)}
                disabled={disabled}
                onToggle={() => toggleGroup(group.id)}
                renderField={renderField}
              />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
