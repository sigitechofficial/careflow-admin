export const CARE_PLAN_REVIEW_FREQUENCY_OPTIONS = [
  { value: 1, label: '1 Month' },
  { value: 2, label: '2 Months' },
  { value: 3, label: '3 Months' },
  { value: 6, label: '6 Months' },
  { value: 12, label: '12 Months' },
] as const

export type CarePlanReviewFrequencyMonths = (typeof CARE_PLAN_REVIEW_FREQUENCY_OPTIONS)[number]['value']

export const DEFAULT_CARE_PLAN_REVIEW_FREQUENCY_MONTHS: CarePlanReviewFrequencyMonths = 6

export function isoDateOnlyFromValue(value: string | null | undefined): string {
  if (!value?.trim()) return ''
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim())
  return match?.[1] ?? ''
}

/** Editor display order: staff override, then published canonical date, then pathway default. */
export function resolveEditorNextReviewDate(params: {
  metaDate?: string | null
  publishedNextReviewDueAt?: string | null
  defaultNextReviewDate?: string | null
}): string {
  return (
    isoDateOnlyFromValue(params.metaDate) ||
    isoDateOnlyFromValue(params.publishedNextReviewDueAt) ||
    isoDateOnlyFromValue(params.defaultNextReviewDate)
  )
}
