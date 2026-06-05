import type { InitialAssessmentSubmission } from '@/features/service-users/initial-assessment/types'
import { parseMobilityMetadata } from '@/features/service-users/initial-assessment/utils/mobility-metadata'
import {
  defaultPainAssessmentMetadata,
  type PainAssessmentMetadata,
} from '@/features/service-users/initial-assessment/utils/pain-assessment-scoring'
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
import {
  defaultMustMetadata,
  enrichMustMetadata,
  type MustMetadata,
} from '@/features/service-users/initial-assessment/utils/must-scoring'
import {
  normalizeFallsScreeningMetadata,
  type FallsScreeningMetadata,
} from '@/features/service-users/initial-assessment/utils/falls-screening'
import {
  normalizeMovingHandlingOperationsMetadata,
  type MovingHandlingOperationsMetadata,
} from '@/features/service-users/initial-assessment/utils/moving-handling-operations'
import {
  normalizeSkinIntegrityCheckMetadata,
  type SkinIntegrityCheckMetadata,
} from '@/features/service-users/initial-assessment/utils/skin-integrity-check'
import {
  normalizeEnvironmentAssessmentMetadata,
  type EnvironmentAssessmentMetadata,
} from '@/features/service-users/initial-assessment/utils/environment-assessment'
import {
  normalizeAdvanceCarePlanningMetadata,
  type AdvanceCarePlanningMetadata,
} from '@/features/service-users/initial-assessment/utils/advance-care-planning'
import {
  normalizeEndOfLifeAssessmentMetadata,
  type EndOfLifeAssessmentMetadata,
} from '@/features/service-users/initial-assessment/utils/end-of-life-assessment'
import {
  normalizeClinicalAssessmentOutcomeSummaryMetadata,
  type ClinicalAssessmentOutcomeSummaryMetadata,
} from '@/features/service-users/initial-assessment/utils/clinical-assessment-outcome-summary'
import {
  normalizeCarePlanObjectivesMetadata,
  type CarePlanObjectivesMetadata,
} from '@/features/service-users/initial-assessment/utils/care-plan-objectives'
import {
  normalizeMentalCapacityChecklistMetadata,
  type MentalCapacityChecklistMetadata,
} from '@/features/service-users/initial-assessment/utils/mental-capacity-checklist'
import {
  normalizePhotographyConsentMetadata,
  type PhotographyConsentMetadata,
} from '@/features/service-users/initial-assessment/utils/photography-consent'
import {
  normalizeEquipmentSelectionMetadata,
  type EquipmentSelectionMetadata,
} from '@/features/service-users/initial-assessment/utils/equipment-selection'

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

  const painAssessment: PainAssessmentMetadata =
    meta.painAssessment && typeof meta.painAssessment === 'object'
      ? (meta.painAssessment as PainAssessmentMetadata)
      : defaultPainAssessmentMetadata()

  const sectionFooters: Record<string, { dateCompleted?: string; assessorNameDesignation?: string }> =
    {}
  const rawFooters = meta.sectionFooters
  if (rawFooters && typeof rawFooters === 'object' && !Array.isArray(rawFooters)) {
    for (const [k, v] of Object.entries(rawFooters as Record<string, unknown>)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const row = v as Record<string, unknown>
        sectionFooters[k] = {
          dateCompleted: typeof row.dateCompleted === 'string' ? row.dateCompleted : undefined,
          assessorNameDesignation:
            typeof row.assessorNameDesignation === 'string' ? row.assessorNameDesignation : undefined,
        }
      }
    }
  }

  const rawAdl = meta.adl && typeof meta.adl === 'object' ? (meta.adl as AdlMetadata) : {}
  const adl: AdlMetadata = {
    ...rawAdl,
    rows: normalizeAdlWorksheetRows(rawAdl.rows),
  }

  const managerReviewRequired = meta.managerReviewRequired === true
  const mobility = parseMobilityMetadata(meta)

  const skinIntegrityCheck: SkinIntegrityCheckMetadata = normalizeSkinIntegrityCheckMetadata(
    meta.skinIntegrityCheck,
  )

  const mustAssessment: MustMetadata = enrichMustMetadata(
    meta.mustAssessment && typeof meta.mustAssessment === 'object'
      ? (meta.mustAssessment as MustMetadata)
      : defaultMustMetadata(),
  )

  const fallsScreening: FallsScreeningMetadata = normalizeFallsScreeningMetadata(meta.fallsScreening)

  const movingHandlingOperations: MovingHandlingOperationsMetadata =
    normalizeMovingHandlingOperationsMetadata(meta.movingHandlingOperations)

  const environmentAssessment: EnvironmentAssessmentMetadata =
    normalizeEnvironmentAssessmentMetadata(meta.environmentAssessment)

  const advanceCarePlanning: AdvanceCarePlanningMetadata =
    normalizeAdvanceCarePlanningMetadata(meta.advanceCarePlanning)

  const endOfLifeAssessment: EndOfLifeAssessmentMetadata =
    normalizeEndOfLifeAssessmentMetadata(meta.endOfLifeAssessment)

  const clinicalOutcomeSummary: ClinicalAssessmentOutcomeSummaryMetadata =
    normalizeClinicalAssessmentOutcomeSummaryMetadata(meta.clinicalOutcomeSummary)

  const carePlanObjectives: CarePlanObjectivesMetadata =
    normalizeCarePlanObjectivesMetadata(meta.carePlanObjectives)

  const mentalCapacityChecklist: MentalCapacityChecklistMetadata =
    normalizeMentalCapacityChecklistMetadata(meta.mentalCapacityChecklist)

  const photographyConsent: PhotographyConsentMetadata =
    normalizePhotographyConsentMetadata(meta.photographyConsent)

  const equipmentSelection: EquipmentSelectionMetadata =
    normalizeEquipmentSelectionMetadata(meta.equipmentSelection)

  return {
    sectionComments,
    waterlow,
    painAssessment,
    sectionFooters,
    adl,
    skinIntegrityCheck,
    mustAssessment,
    fallsScreening,
    movingHandlingOperations,
    environmentAssessment,
    advanceCarePlanning,
    endOfLifeAssessment,
    clinicalOutcomeSummary,
    carePlanObjectives,
    mentalCapacityChecklist,
    photographyConsent,
    equipmentSelection,
    managerReviewRequired,
    ...mobility,
    raw: meta,
  }
}

export type {
  AdvanceCarePlanningMetadata,
  CarePlanObjectivesMetadata,
  MentalCapacityChecklistMetadata,
  PhotographyConsentMetadata,
  EquipmentSelectionMetadata,
  ClinicalAssessmentOutcomeSummaryMetadata,
  EndOfLifeAssessmentMetadata,
  EnvironmentAssessmentMetadata,
  FallsScreeningMetadata,
  MovingHandlingOperationsMetadata,
  MustMetadata,
  PainAssessmentMetadata,
  SkinIntegrityCheckMetadata,
}
export { defaultPainAssessmentMetadata }
export {
  defaultSkinIntegrityCheckMetadata,
  skinIntegrityCheckHasEntries,
} from '@/features/service-users/initial-assessment/utils/skin-integrity-check'

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
