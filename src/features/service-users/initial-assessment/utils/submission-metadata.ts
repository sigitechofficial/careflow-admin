import type { InitialAssessmentSubmission } from '@/features/service-users/initial-assessment/types'
import { parseMobilityMetadata } from '@/features/service-users/initial-assessment/utils/mobility-metadata'
import {
  computeWaterlowScore,
  defaultWaterlowMetadata,
  waterlowBand,
  type LegacyWaterlowFactors,
  type WaterlowMetadata,
} from '@/features/service-users/initial-assessment/utils/waterlow-scoring'

export type { WaterlowMetadata, LegacyWaterlowFactors as WaterlowFactors }
export {
  computeWaterlowScore as waterlowScoreFromFactors,
  waterlowBand,
  defaultWaterlowMetadata as defaultWaterlowFactors,
}

/** @deprecated Use WATERLOW_*_OPTIONS from waterlow-scoring.ts */
export const WATERLOW_FACTOR_LABELS: { key: string; label: string }[] = []

import {
  ADL_SCORE_OPTIONS,
  defaultAdlWorksheetRows,
  normalizeAdlWorksheetRows,
  type AdlWorksheetMetadata,
  type AdlWorksheetRow,
} from '@/features/service-users/initial-assessment/utils/adl-scoring'

export type AdlRow = AdlWorksheetRow

export type AdlMetadata = AdlWorksheetMetadata

/** @deprecated Use {@link ADL_SCORE_OPTIONS} from adl-scoring.ts */
export const ADL_LEVELS = ADL_SCORE_OPTIONS.map((o) => o.label) as readonly string[]

/** @deprecated Use {@link defaultAdlWorksheetRows} */
export const ADL_ACTIVITIES = [
  'Mobility',
  'Transfer',
  'Personal hygiene',
  'Toilet use',
  'Continence',
  'Feeding',
] as const

export function parseSubmissionMetadata(submission: InitialAssessmentSubmission | null | undefined) {
  const raw = submission?.metadata
  const meta = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}

  const sectionComments: Record<string, SectionCommentEntry> = {}
  const sc = meta.sectionComments
  if (sc && typeof sc === 'object') {
    for (const [k, v] of Object.entries(sc as Record<string, unknown>)) {
      if (typeof v === 'string' && v.trim()) {
        sectionComments[k] = { text: v }
      } else if (v && typeof v === 'object' && 'text' in v) {
        const entry = v as SectionCommentEntry
        if (typeof entry.text === 'string' && entry.text.trim()) sectionComments[k] = entry
      }
    }
  }

  const waterlow: WaterlowMetadata =
    meta.waterlow && typeof meta.waterlow === 'object' ? (meta.waterlow as WaterlowMetadata) : {}

  const rawAdl = meta.adl && typeof meta.adl === 'object' ? (meta.adl as AdlMetadata) : {}
  const adl: AdlMetadata = {
    ...rawAdl,
    rows: normalizeAdlWorksheetRows(rawAdl.rows),
  }

  const managerReviewRequired = meta.managerReviewRequired === true
  const mobility = parseMobilityMetadata(meta)

  return {
    sectionComments,
    waterlow,
    adl,
    managerReviewRequired,
    ...mobility,
    raw: meta,
  }
}

export type SectionCommentEntry = {
  text: string
  visibility?: 'care_team' | 'internal'
}

export function defaultAdlRows(): AdlRow[] {
  return defaultAdlWorksheetRows()
}

export function mergeMetadataPatch(
  existing: Record<string, unknown> | undefined,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const base = { ...(existing ?? {}) }
  for (const [k, v] of Object.entries(patch)) {
    if (k === 'sectionComments' && v && typeof v === 'object') {
      const prev =
        base.sectionComments && typeof base.sectionComments === 'object'
          ? (base.sectionComments as Record<string, unknown>)
          : {}
      const merged = { ...prev }
      for (const [sk, sv] of Object.entries(v as Record<string, unknown>)) {
        if (sv === '' || sv == null) delete merged[sk]
        else merged[sk] = sv
      }
      base.sectionComments = merged
    } else {
      base[k] = v
    }
  }
  return base
}
