import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

export type InitialAssessmentFieldRenderOptions = {
  /** When true, omit the question label (parent provides context, e.g. table column). */
  hideLabel?: boolean
}

/** @deprecated Yes/No fields always use the card layout; kept for call-site compatibility. */
export function groupedYesNoFieldOptions(
  _q: InitialAssessmentQuestion,
): InitialAssessmentFieldRenderOptions | undefined {
  return undefined
}
