import type { CarePlanInstanceDisplayStatus } from '@/features/service-users/care-plans/types'

export type CarePlanDisplayState =
  | 'RECOMMENDED'
  | 'IN_PROGRESS'
  | 'LIVE'
  | 'LIVE_WITH_DRAFT'
  | 'AVAILABLE'

export type CarePlanRecommendationStatus = 'pending' | 'accepted' | 'declined'

export type CarePlanRecommendationRef = {
  carePathwayFormId?: string | null
  status: CarePlanRecommendationStatus
}

/**
 * Derive the Care Plan page lifecycle state from instance displayStatus and
 * recommendation status. Form names are never used.
 *
 * Priority:
 * PUBLISHED_WITH_DRAFT → LIVE_WITH_DRAFT
 * PUBLISHED → LIVE
 * DRAFT → IN_PROGRESS (even if a recommendation is still pending)
 * accepted recommendation without a published instance → IN_PROGRESS
 * pending recommendation → RECOMMENDED
 * otherwise → AVAILABLE
 */
export function deriveCarePlanDisplayState(input: {
  displayStatus?: CarePlanInstanceDisplayStatus | null
  recommendationStatus?: CarePlanRecommendationStatus | null
}): CarePlanDisplayState {
  const display =
    input.displayStatus && input.displayStatus !== 'NOT_STARTED' ? input.displayStatus : null
  const rec = input.recommendationStatus ?? null

  if (display === 'PUBLISHED_WITH_DRAFT') return 'LIVE_WITH_DRAFT'
  if (display === 'PUBLISHED') return 'LIVE'
  if (display === 'DRAFT') return 'IN_PROGRESS'
  if (rec === 'accepted') return 'IN_PROGRESS'
  if (rec === 'pending') return 'RECOMMENDED'
  return 'AVAILABLE'
}

export function recommendationStatusForForm(
  recommendations: CarePlanRecommendationRef[],
  formId: string,
): CarePlanRecommendationStatus | null {
  const matches = recommendations.filter((r) => r.carePathwayFormId === formId)
  if (matches.some((r) => r.status === 'accepted')) return 'accepted'
  if (matches.some((r) => r.status === 'pending')) return 'pending'
  if (matches.some((r) => r.status === 'declined')) return 'declined'
  return null
}

export function resolveRecommendationStatusForForm(
  recommendations: CarePlanRecommendationRef[],
  formId: string,
  acceptedFormIds?: ReadonlySet<string>,
): CarePlanRecommendationStatus | null {
  const fromRecs = recommendationStatusForForm(recommendations, formId)
  if (fromRecs === 'accepted' || acceptedFormIds?.has(formId)) return 'accepted'
  return fromRecs
}

export function displayStateForForm(
  formId: string,
  instanceDisplayStatus: CarePlanInstanceDisplayStatus | null | undefined,
  recommendations: CarePlanRecommendationRef[],
  acceptedFormIds?: ReadonlySet<string>,
): CarePlanDisplayState {
  const recStatus = resolveRecommendationStatusForForm(recommendations, formId, acceptedFormIds)
  return deriveCarePlanDisplayState({
    displayStatus: instanceDisplayStatus,
    recommendationStatus: recStatus === 'declined' ? null : recStatus,
  })
}

export type CarePlanLifecycleBuckets<T extends { id: string }> = {
  recommended: T[]
  inProgress: T[]
  live: T[]
  available: T[]
}

export function groupFormsByDisplayState<T extends { id: string }>(
  forms: T[],
  stateFor: (form: T) => CarePlanDisplayState,
): CarePlanLifecycleBuckets<T> {
  const buckets: CarePlanLifecycleBuckets<T> = {
    recommended: [],
    inProgress: [],
    live: [],
    available: [],
  }
  for (const form of forms) {
    switch (stateFor(form)) {
      case 'RECOMMENDED':
        buckets.recommended.push(form)
        break
      case 'IN_PROGRESS':
        buckets.inProgress.push(form)
        break
      case 'LIVE':
      case 'LIVE_WITH_DRAFT':
        buckets.live.push(form)
        break
      default:
        buckets.available.push(form)
    }
  }
  return buckets
}

export function filterCarePlansByNameSearch<T extends { name: string }>(
  items: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter((item) => item.name.toLowerCase().includes(q))
}

/**
 * Pending recommendations shown in Recommended: those whose form is in the
 * Recommended bucket, plus recs with no form, plus recs whose form is not on
 * this page's catalogue. Recs for forms already In Progress / Live are omitted
 * so the same plan is not listed twice.
 */
export function pendingRecommendationsForRecommendedSection<T extends CarePlanRecommendationRef>(
  recommendations: T[],
  recommendedFormIds: ReadonlySet<string>,
  cataloguedFormIds: ReadonlySet<string>,
): T[] {
  return recommendations.filter((rec) => {
    if (rec.status !== 'pending') return false
    if (!rec.carePathwayFormId) return true
    if (recommendedFormIds.has(rec.carePathwayFormId)) return true
    return !cataloguedFormIds.has(rec.carePathwayFormId)
  })
}

export function declinedRecommendations<T extends { status: string }>(recommendations: T[]): T[] {
  return recommendations.filter((r) => r.status === 'declined') as T[]
}

export function lifecycleFormIds(buckets: CarePlanLifecycleBuckets<{ id: string }>): string[] {
  return [...buckets.recommended, ...buckets.inProgress, ...buckets.live, ...buckets.available].map(
    (form) => form.id,
  )
}

export const AVAILABLE_CARE_PLANS_SEARCH_THRESHOLD = 6

export const RECOMMENDED_EVIDENCE_PREVIEW_LIMIT = 3

/** Documented Care Plan page section order (lifecycle before supporting risk/assessment). */
export const CARE_PLAN_PAGE_SECTION_ORDER = [
  'live',
  'in-progress',
  'recommended',
  'monitor',
  'assessment-risk',
  'available',
  'declined',
] as const

export type RecommendationTriggerRef = {
  questionId: string
  questionText: string
  specRef?: string
}

export type GroupablePendingRecommendation = CarePlanRecommendationRef & {
  id: string
  title: string
  carePathwayFormName?: string
  triggerCount?: number
  triggers?: RecommendationTriggerRef[]
}

export type MergedPendingRecommendationGroup<T extends GroupablePendingRecommendation> = {
  key: string
  formId: string | null
  name: string
  recs: T[]
  triggers: RecommendationTriggerRef[]
  triggerCount: number
}

export function mergeRecommendationTriggers(
  recs: Array<{ triggers?: RecommendationTriggerRef[] }>,
): RecommendationTriggerRef[] {
  const seen = new Set<string>()
  const out: RecommendationTriggerRef[] = []
  for (const rec of recs) {
    for (const trigger of rec.triggers ?? []) {
      const key = trigger.questionId || trigger.questionText
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(trigger)
    }
  }
  return out
}

/**
 * Presentation-only merge: one Recommended card per target form.
 * Does not mutate recommendation records.
 */
export function groupPendingRecommendationsByForm<T extends GroupablePendingRecommendation>(
  recommendations: T[],
): MergedPendingRecommendationGroup<T>[] {
  const pending = recommendations.filter((rec) => rec.status === 'pending')
  const groups = new Map<string, T[]>()
  const order: string[] = []
  for (const rec of pending) {
    const key = rec.carePathwayFormId ? rec.carePathwayFormId : `unlinked:${rec.id}`
    if (!groups.has(key)) {
      groups.set(key, [])
      order.push(key)
    }
    groups.get(key)!.push(rec)
  }
  return order.map((key) => {
    const recs = groups.get(key)!
    const first = recs[0]!
    const triggers = mergeRecommendationTriggers(recs)
    const triggerCount =
      recs.reduce((sum, rec) => sum + (rec.triggerCount ?? rec.triggers?.length ?? 0), 0) ||
      triggers.length
    return {
      key,
      formId: first.carePathwayFormId ?? null,
      name: first.carePathwayFormName || first.title,
      recs,
      triggers,
      triggerCount,
    }
  })
}

export function splitEvidencePreview<T>(
  items: T[],
  limit = RECOMMENDED_EVIDENCE_PREVIEW_LIMIT,
  expanded = false,
): { visible: T[]; hiddenCount: number } {
  if (expanded || items.length <= limit) {
    return { visible: items, hiddenCount: 0 }
  }
  return { visible: items.slice(0, limit), hiddenCount: items.length - limit }
}
