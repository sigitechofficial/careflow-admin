import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

export type InitialAssessmentFieldRenderOptions = {
  hideLabel?: boolean
  /** Skip the muted Yes/No card when the parent panel already provides grouping. */
  yesNoPlain?: boolean
}

export function groupedYesNoFieldOptions(
  q: InitialAssessmentQuestion,
): InitialAssessmentFieldRenderOptions | undefined {
  return q.questionType === 'YES_NO' ? { yesNoPlain: true } : undefined
}
