import type { InitialAssessmentAnswerInput, InitialAssessmentSection } from '@/features/service-users/initial-assessment/types'
import type { AdlWorksheetMetadata } from '@/features/service-users/initial-assessment/utils/adl-scoring'
import {
  isFallsScreeningComplete,
  type FallsScreeningMetadata,
} from '@/features/service-users/initial-assessment/utils/falls-screening'

/**
 * Keep the ADL footer status in step with the Falls tab. Completion is derived only (never a manual
 * answer). §12.7 falls history is its own always-asked question, so the paper Q1 ("falls … that need
 * investigating") no longer writes "Falls in last 12 months?" — a known, already-investigated fall
 * would otherwise be recorded as No.
 */
export function syncFallsScreeningDerivedState(
  _sections: InitialAssessmentSection[],
  screening: FallsScreeningMetadata | undefined,
  adl: AdlWorksheetMetadata,
  onAdlChange: (next: AdlWorksheetMetadata) => void,
  _onAnswerChange?: (questionId: string, patch: InitialAssessmentAnswerInput) => void,
): void {
  const complete = isFallsScreeningComplete(screening)
  const today = new Date().toISOString().slice(0, 10)
  const nextAdl: AdlWorksheetMetadata = {
    ...adl,
    fallsAssessmentCompleted: complete,
    fallsAssessmentDate: complete ? adl.fallsAssessmentDate?.trim() || today : null,
  }
  onAdlChange(nextAdl)
}
