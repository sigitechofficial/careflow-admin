import { Sparkles } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { CarePlanFieldSuggestion } from '@/features/service-users/care-plans/types'
import {
  displayCarePlanValue,
  formatSuggestionSourceDate,
  suggestionConflictState,
} from '@/features/service-users/care-plans/care-plan-suggestion-state'

export function CarePlanFieldSuggestionBanner({
  suggestion,
  currentValue,
  disabled,
  onUse,
  onIgnore,
  onKeepCurrent,
}: {
  suggestion: CarePlanFieldSuggestion
  currentValue: string | boolean | undefined
  disabled?: boolean
  onUse: (suggestion: CarePlanFieldSuggestion) => void
  onIgnore: (suggestion: CarePlanFieldSuggestion) => void
  onKeepCurrent: (suggestion: CarePlanFieldSuggestion) => void
}) {
  const state = suggestionConflictState(currentValue, suggestion)
  if (state === 'match') return null

  const sourceMeta = [
    suggestion.sourceSection,
    formatSuggestionSourceDate(suggestion.sourceDate),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      className="rounded-md border border-[#b8d9eb] bg-[#f3f9fc] px-3 py-2.5 text-sm dark:border-sky-900 dark:bg-sky-950/20"
      data-testid={`care-plan-suggestion-${suggestion.targetFieldKey}`}
    >
      {state === 'conflict' ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0f766e]">
            New suggestion from Initial Assessment
          </p>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Current Care Plan value: </span>
              {displayCarePlanValue(currentValue)}
            </p>
            <p>
              <span className="text-muted-foreground">New suggestion from Initial Assessment: </span>
              {suggestion.displayText}
            </p>
          </div>
          {sourceMeta ? <p className="text-xs text-muted-foreground">{sourceMeta}</p> : null}
          {disabled ? null : (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" size="sm" onClick={() => onUse(suggestion)}>
                Use new suggestion
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => onKeepCurrent(suggestion)}>
                Keep current
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#0f766e]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {suggestion.kind === 'context' ? 'Suggested information from Initial Assessment' : 'Suggested from Initial Assessment'}
          </p>
          <p className="text-foreground">{suggestion.displayText}</p>
          {sourceMeta ? <p className="text-xs text-muted-foreground">{sourceMeta}</p> : null}
          {disabled ? null : suggestion.kind === 'value' ? (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" size="sm" onClick={() => onUse(suggestion)}>
                Use suggestion
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => onIgnore(suggestion)}>
                Ignore
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
