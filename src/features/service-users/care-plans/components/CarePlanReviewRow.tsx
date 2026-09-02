import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import type { CarePlanFieldSuggestion } from '@/features/service-users/care-plans/types'
import { suggestionConflictState } from '@/features/service-users/care-plans/care-plan-suggestion-state'
import { IARecommendationCard } from '@/features/service-users/care-plans/components/IARecommendationCard'

export type CarePlanReviewRowProps = {
  label: string
  required?: boolean
  helpText?: string | null
  /** Section / category badge (e.g. section title). */
  category?: string | null
  input: ReactNode
  answerFooter?: ReactNode
  suggestion?: CarePlanFieldSuggestion | null
  currentValue?: string | boolean
  disabled?: boolean
  onUseSuggestion?: (suggestion: CarePlanFieldSuggestion) => void
  onDismissSuggestion?: (suggestion: CarePlanFieldSuggestion) => void
  onKeepCurrentSuggestion?: (suggestion: CarePlanFieldSuggestion) => void
  onEditSuggestion?: (suggestion: CarePlanFieldSuggestion) => void
}

const APPLIED_FLASH_MS = 1800

/**
 * Enterprise Care Plan review row: Question | Current Answer | IA Recommendation.
 * Desktop = 3 columns; tablet/mobile stacks vertically.
 */
export function CarePlanReviewRow({
  label,
  required,
  helpText,
  category,
  input,
  answerFooter,
  suggestion,
  currentValue,
  disabled,
  onUseSuggestion,
  onDismissSuggestion,
  onKeepCurrentSuggestion,
  onEditSuggestion,
}: CarePlanReviewRowProps) {
  const [appliedFlash, setAppliedFlash] = useState(false)
  const help = helpText?.trim() || null

  const canShowHandlers =
    Boolean(onUseSuggestion) && Boolean(onDismissSuggestion) && Boolean(onKeepCurrentSuggestion)

  const pendingSuggestion =
    canShowHandlers &&
    suggestion != null &&
    suggestionConflictState(currentValue, suggestion) !== 'match'
      ? suggestion
      : null

  const showRecommendationColumn = pendingSuggestion != null || appliedFlash

  useEffect(() => {
    if (!appliedFlash) return
    const timer = window.setTimeout(() => setAppliedFlash(false), APPLIED_FLASH_MS)
    return () => window.clearTimeout(timer)
  }, [appliedFlash])

  const handleUse = (item: CarePlanFieldSuggestion) => {
    onUseSuggestion?.(item)
    setAppliedFlash(true)
  }

  if (!showRecommendationColumn) {
    return (
      <div className="space-y-2 py-1">
        <QuestionColumn label={label} required={required} help={help} category={null} compact />
        <div className="min-w-0 space-y-1.5">{input}{answerFooter}</div>
      </div>
    )
  }

  const activeSuggestion = pendingSuggestion ?? suggestion

  return (
    <div
      className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,39,68,0.04)] dark:border-slate-700 dark:bg-card"
      data-testid={
        activeSuggestion
          ? `care-plan-field-review-${activeSuggestion.targetFieldKey}`
          : 'care-plan-field-review'
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)] md:items-start md:gap-5">
        <QuestionColumn label={label} required={required} help={help} category={category} />

        <div className="min-w-0 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 md:sr-only">
            Current Answer
          </p>
          {input}
          {answerFooter}
        </div>

        <div className="min-w-0 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 md:sr-only">
            IA Recommendation
          </p>
          {activeSuggestion && onUseSuggestion && onDismissSuggestion && onKeepCurrentSuggestion ? (
            <IARecommendationCard
              suggestion={activeSuggestion}
              currentValue={currentValue}
              disabled={disabled}
              applied={appliedFlash}
              onUse={handleUse}
              onDismiss={onDismissSuggestion}
              onKeepCurrent={onKeepCurrentSuggestion}
              onEdit={onEditSuggestion}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

function QuestionColumn({
  label,
  required,
  help,
  category,
  compact = false,
}: {
  label: string
  required?: boolean
  help: string | null
  category?: string | null
  compact?: boolean
}) {
  return (
    <div className="min-w-0 space-y-2">
      {compact ? null : (
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 md:sr-only">
          Field / Question
        </p>
      )}
      {category?.trim() ? (
        <span className="inline-flex max-w-full truncate rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {category.trim()}
        </span>
      ) : null}
      <div className="flex items-start gap-1.5">
        <label
          className={
            compact
              ? 'text-sm font-medium text-foreground'
              : 'text-sm font-semibold leading-snug text-[#0f2744] dark:text-slate-100'
          }
        >
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </label>
        {help ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="mt-0.5 inline-flex shrink-0 rounded-full text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30"
                aria-label={`Help: ${help}`}
              >
                <HelpCircle className="h-3.5 w-3.5" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              {help}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      {!compact && help ? (
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-3">{help}</p>
      ) : null}
    </div>
  )
}
