import type { ReactNode } from 'react'
import type { CarePlanFieldSuggestion } from '@/features/service-users/care-plans/types'
import { CarePlanReviewRow } from '@/features/service-users/care-plans/components/CarePlanReviewRow'
import { CarePlanSectionHeader } from '@/features/service-users/care-plans/components/CarePlanSectionHeader'

export type CarePlanFieldReviewProps = {
  label: string
  required?: boolean
  helpText?: string | null
  category?: string | null
  input: ReactNode
  answerFooter?: ReactNode
  suggestion?: CarePlanFieldSuggestion | null
  currentValue?: string | boolean
  disabled?: boolean
  onApply?: (suggestion: CarePlanFieldSuggestion) => void
  onDismiss?: (suggestion: CarePlanFieldSuggestion) => void
  onKeepCurrent?: (suggestion: CarePlanFieldSuggestion) => void
}

/** @deprecated Prefer `CarePlanSectionHeader`. */
export function CarePlanSectionIaRecommendationsHint({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <CarePlanSectionHeader title="Recommendations" recommendationCount={count} />
  )
}

/**
 * @deprecated Prefer `CarePlanReviewRow`. Adapter for existing renderer/tests.
 */
export function CarePlanFieldReview({
  label,
  required,
  helpText,
  category,
  input,
  answerFooter,
  suggestion,
  currentValue,
  disabled,
  onApply,
  onDismiss,
  onKeepCurrent,
}: CarePlanFieldReviewProps) {
  return (
    <CarePlanReviewRow
      label={label}
      required={required}
      helpText={helpText}
      category={category}
      input={input}
      answerFooter={answerFooter}
      suggestion={suggestion}
      currentValue={currentValue}
      disabled={disabled}
      onUseSuggestion={onApply}
      onDismissSuggestion={onDismiss}
      onKeepCurrentSuggestion={onKeepCurrent}
    />
  )
}
