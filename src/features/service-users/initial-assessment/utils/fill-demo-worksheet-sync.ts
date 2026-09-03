import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import type { AdlWorksheetMetadata } from '@/features/service-users/initial-assessment/utils/adl-scoring'
import type { FallsScreeningMetadata } from '@/features/service-users/initial-assessment/utils/falls-screening'
import { syncFallsScreeningDerivedState } from '@/features/service-users/initial-assessment/utils/falls-screening-questions'
import { syncMustAssessmentAnswers } from '@/features/service-users/initial-assessment/utils/must-questions'
import type { MustMetadata } from '@/features/service-users/initial-assessment/utils/must-scoring'
import type { PainAssessmentMetadata } from '@/features/service-users/initial-assessment/utils/pain-assessment-scoring'
import { syncPainAssessmentAnswers } from '@/features/service-users/initial-assessment/utils/pain-questions'

function asObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

/**
 * After Fill Demo applies worksheet metadata, copy MUST / Pain / Falls derived
 * catalogue answers using the same helpers as live worksheet edits.
 */
export function syncFillDemoCatalogueAnswers(
  sections: InitialAssessmentSection[],
  metadata: Record<string, unknown>,
  adl: AdlWorksheetMetadata,
  onAdlChange: (next: AdlWorksheetMetadata) => void,
  onAnswerChange: (questionId: string, patch: InitialAssessmentAnswerInput) => void,
): void {
  const must = asObject(metadata.mustAssessment)
  if (must) syncMustAssessmentAnswers(sections, must as MustMetadata, onAnswerChange)

  const pain = asObject(metadata.painAssessment)
  if (pain) syncPainAssessmentAnswers(sections, pain as PainAssessmentMetadata, onAnswerChange)

  const falls = asObject(metadata.fallsScreening)
  if (falls) {
    const incomingAdl = asObject(metadata.adl) as AdlWorksheetMetadata | undefined
    syncFallsScreeningDerivedState(
      sections,
      falls as FallsScreeningMetadata,
      incomingAdl ?? adl,
      onAdlChange,
      onAnswerChange,
    )
  }
}
