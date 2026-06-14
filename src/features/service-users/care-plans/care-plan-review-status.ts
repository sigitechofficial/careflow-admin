import type { CarePlanReviewState } from '@/features/service-users/care-plans/types'

export function carePlanReviewLabel(review?: CarePlanReviewState | null): string | null {
  if (!review || review.status === 'none') return null
  if (review.status === 'overdue') return 'Review overdue'
  if (review.status === 'due_soon') return 'Review due soon'
  if (review.nextReviewDueAt) {
    const d = new Date(review.nextReviewDueAt)
    if (!Number.isNaN(d.getTime())) {
      return `Review ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
    }
  }
  return 'Review OK'
}

export function carePlanReviewTone(
  review?: CarePlanReviewState | null,
): 'default' | 'warning' | 'danger' {
  if (!review) return 'default'
  if (review.status === 'overdue') return 'danger'
  if (review.status === 'due_soon') return 'warning'
  return 'default'
}
