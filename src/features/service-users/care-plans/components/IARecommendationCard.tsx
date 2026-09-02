import { Check, Sparkles } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { CarePlanFieldSuggestion } from '@/features/service-users/care-plans/types'
import {
  formatSuggestionSourceDate,
  suggestionConflictState,
} from '@/features/service-users/care-plans/care-plan-suggestion-state'

export type IARecommendationCardProps = {
  suggestion: CarePlanFieldSuggestion
  currentValue: string | boolean | undefined
  disabled?: boolean
  /** Brief success flash after Accept. */
  applied?: boolean
  onUse: (suggestion: CarePlanFieldSuggestion) => void
  onDismiss: (suggestion: CarePlanFieldSuggestion) => void
  onKeepCurrent: (suggestion: CarePlanFieldSuggestion) => void
  /** Put the suggestion into the field for staff to amend before save. Does not persist. */
  onEdit?: (suggestion: CarePlanFieldSuggestion) => void
}

/**
 * Dedicated IA recommendation panel for Care Plan review rows.
 * Soft mint card with source metadata and Accept / Edit / Dismiss actions.
 */
export function IARecommendationCard({
  suggestion,
  currentValue,
  disabled,
  applied = false,
  onUse,
  onDismiss,
  onKeepCurrent,
  onEdit,
}: IARecommendationCardProps) {
  const state = suggestionConflictState(currentValue, suggestion)
  if (state === 'match' && !applied) return null

  const sourceDate = formatSuggestionSourceDate(suggestion.sourceDate)
  const isConflict = state === 'conflict'
  const isContext = suggestion.kind === 'context'

  if (applied && state === 'match') {
    return (
      <div
        className="flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-3.5 py-3 text-sm text-emerald-800 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
        data-testid={`care-plan-suggestion-applied-${suggestion.targetFieldKey}`}
      >
        <Check className="h-4 w-4 shrink-0" aria-hidden />
        <span className="font-medium">Suggestion applied</span>
      </div>
    )
  }

  return (
    <div
      className="flex h-full flex-col rounded-xl border border-emerald-200/70 bg-[#f0faf5] p-3.5 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/25"
      data-testid={`care-plan-suggestion-${suggestion.targetFieldKey}`}
    >
      <div className="flex items-center gap-1.5">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
        </span>
        <p className="text-xs font-semibold tracking-wide text-emerald-900 dark:text-emerald-200">
          {isConflict ? 'Updated IA Recommendation' : 'IA Recommendation'}
        </p>
      </div>

      <p className="mt-2.5 flex-1 whitespace-pre-wrap text-sm font-medium leading-relaxed text-[#0f2744] dark:text-slate-100">
        {suggestion.displayText}
      </p>

      <div className="mt-3 space-y-0.5 border-t border-emerald-200/60 pt-2.5 text-[11px] leading-relaxed text-slate-600 dark:border-emerald-900/50 dark:text-slate-300">
        <p className="font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Source</p>
        <p>Initial Assessment</p>
        {suggestion.sourceSection ? <p>{suggestion.sourceSection}</p> : null}
        {sourceDate ? <p>{sourceDate}</p> : null}
      </div>

      {disabled || isContext ? null : (
        <div className="mt-3 flex flex-wrap gap-2">
          {isConflict ? (
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              This field already has a saved value. The suggestion will not overwrite it.
            </p>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-lg bg-emerald-700 px-3 text-xs font-medium text-white shadow-sm hover:bg-emerald-800"
                onClick={() => onUse(suggestion)}
              >
                Accept
              </Button>
              {onEdit ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg border-emerald-300 bg-white px-3 text-xs font-medium text-emerald-800 hover:bg-emerald-50 dark:border-emerald-700 dark:bg-transparent dark:text-emerald-200"
                  onClick={() => onEdit(suggestion)}
                >
                  Edit
                </Button>
              ) : null}
            </>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-lg border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-transparent dark:text-slate-200"
            onClick={() => (isConflict ? onKeepCurrent(suggestion) : onDismiss(suggestion))}
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  )
}
