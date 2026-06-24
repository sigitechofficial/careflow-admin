import type { CarePlanReviewState } from '@/features/service-users/care-plans/types'
import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'

export function carePlanReviewLabel(review?: CarePlanReviewState | null): string | null {
  if (!review || review.status === 'none') return null
  if (review.status === 'overdue') return 'Review overdue'
  if (review.status === 'due_soon') return 'Review due soon'
  if (review.nextReviewDueAt) {
    const label = formatOrganisationDate(review.nextReviewDueAt)
    if (label !== '—') return `Review ${label}`
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
