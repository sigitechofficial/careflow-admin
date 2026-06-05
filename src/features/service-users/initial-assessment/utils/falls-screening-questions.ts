import type { InitialAssessmentAnswerInput, InitialAssessmentSection } from '@/features/service-users/initial-assessment/types'
import type { AdlWorksheetMetadata } from '@/features/service-users/initial-assessment/utils/adl-scoring'
import {
  isFallsScreeningComplete,
  type FallsScreeningMetadata,
} from '@/features/service-users/initial-assessment/utils/falls-screening'
import { findQuestionBySpecRefAndText } from '@/features/service-users/initial-assessment/utils/question-lookup'

function yesNoAnswer(questionId: string, value: boolean): InitialAssessmentAnswerInput {
  return {
    questionId,
    checked: value,
    booleanValue: value,
  }
}

/** Keep §12.7 template fields and ADL footer in sync with the falls screening tab. */
export function syncFallsScreeningDerivedState(
  sections: InitialAssessmentSection[],
  screening: FallsScreeningMetadata | undefined,
  adl: AdlWorksheetMetadata,
  onAdlChange: (next: AdlWorksheetMetadata) => void,
  onAnswerChange: (questionId: string, patch: InitialAssessmentAnswerInput) => void,
): void {
  const complete = isFallsScreeningComplete(screening)
  const today = new Date().toISOString().slice(0, 10)

  const nextAdl: AdlWorksheetMetadata = {
    ...adl,
    fallsAssessmentCompleted: complete ? true : null,
    fallsAssessmentDate:
      complete && !adl.fallsAssessmentDate?.trim() ? today : adl.fallsAssessmentDate ?? null,
  }
  onAdlChange(nextAdl)

  const fallsLast12Q = findQuestionBySpecRefAndText(sections, '12.7', 'falls in last 12 months')
  if (fallsLast12Q && screening?.q1FallsNeedInvestigating != null) {
    onAnswerChange(
      fallsLast12Q.id,
      yesNoAnswer(fallsLast12Q.id, screening.q1FallsNeedInvestigating),
    )
  }
}
