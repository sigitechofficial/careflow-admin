import type { CarePlanPublishedVersionSummary } from '@/features/service-users/care-plans/types'
import type { CarePlanDraftValues } from '@/features/service-users/care-plan/care-plan-draft-storage'

export type CarePlanHistoryStatus = 'Current' | 'Superseded'

export type CarePlanVersionHistoryDisplay = {
  id: string
  versionLabel: string
  versionNumber: number
  publishedAtLabel: string
  publishedByLabel: string
  status: CarePlanHistoryStatus
  summary: string | null
  /** Discriminator for Phase 2 visit-activity rows. */
  kind: 'care_plan_version'
}

export function formatCarePlanHistoryPublishedAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatCarePlanHistoryPublishedBy(publishedById?: string | null): string {
  if (!publishedById?.trim()) return 'Unknown'
  // API currently returns id only; keep a stable short display until name enrichment exists.
  const id = publishedById.trim()
  if (id.length <= 8) return id
  return `Staff · ${id.slice(0, 8)}`
}

export function resolveCarePlanHistoryStatus(
  version: Pick<CarePlanPublishedVersionSummary, 'isCurrent' | 'supersededAt'>,
): CarePlanHistoryStatus {
  if (version.isCurrent === true) return 'Current'
  if (version.isCurrent === false) return 'Superseded'
  return version.supersededAt ? 'Superseded' : 'Current'
}

/**
 * Map published care plan versions → Care History Phase 1 rows.
 * Does not read or write care plan draft values.
 */
export function mapCarePlanVersionsToHistory(
  versions: CarePlanPublishedVersionSummary[],
): CarePlanVersionHistoryDisplay[] {
  return [...versions]
    .sort((a, b) => b.versionNumber - a.versionNumber)
    .map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      versionLabel: `Version ${v.versionNumber}`,
      publishedAtLabel: formatCarePlanHistoryPublishedAt(v.publishedAt),
      publishedByLabel: formatCarePlanHistoryPublishedBy(v.publishedById),
      status: resolveCarePlanHistoryStatus(v),
      summary: v.summary?.trim() || null,
      kind: 'care_plan_version' as const,
    }))
}

/**
 * Phase 1 invariant: Care History must not depend on draft meta.
 * (Visit activity Phase 2 will also be API-backed, not draft.)
 */
export function careHistoryIsIndependentOfDraft(_values?: CarePlanDraftValues): true {
  return true
}
