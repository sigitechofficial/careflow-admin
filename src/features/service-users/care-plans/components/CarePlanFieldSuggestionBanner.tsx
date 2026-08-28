import type { CarePlanFieldSuggestion } from '@/features/service-users/care-plans/types'
import { IARecommendationCard } from '@/features/service-users/care-plans/components/IARecommendationCard'

/**
 * @deprecated Prefer `IARecommendationCard`. Kept as a thin adapter for existing imports/tests.
 */
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
  return (
    <IARecommendationCard
      suggestion={suggestion}
      currentValue={currentValue}
      disabled={disabled}
      onUse={onUse}
      onDismiss={onIgnore}
      onKeepCurrent={onKeepCurrent}
    />
  )
}
