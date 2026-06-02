import type { InitialAssessmentAnswerInput, InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import type { AdlWorksheetMetadata } from '@/features/service-users/initial-assessment/utils/adl-scoring'

export type AdlWorksheetFooterQuestionIds = {
  fallsAssessmentCompletedId?: string
  fallsAssessmentDateId?: string
  mobilityAidsRequiredId?: string
  mobilityAidsListId?: string
}

export function resolveAdlWorksheetFooterQuestionIds(
  questions: InitialAssessmentQuestion[],
): AdlWorksheetFooterQuestionIds {
  const ids: AdlWorksheetFooterQuestionIds = {}
  for (const q of questions) {
    const text = q.questionText.toLowerCase()
    if (q.metadata?.specRef === '12.7' && text.includes('falls assessment completed')) {
      ids.fallsAssessmentCompletedId = q.id
    } else if (q.metadata?.specRef === '12.7' && text.includes('falls assessment date')) {
      ids.fallsAssessmentDateId = q.id
    } else if (q.metadata?.specRef === '12.8' && text.includes('mobility aids in use or required')) {
      ids.mobilityAidsRequiredId = q.id
    } else if (q.metadata?.specRef === '12.8' && text.includes('mobility aids list')) {
      ids.mobilityAidsListId = q.id
    }
  }
  return ids
}

export function section12AdlFooterExcludedIds(questions: InitialAssessmentQuestion[]): Set<string> {
  const ids = new Set<string>()
  const footer = resolveAdlWorksheetFooterQuestionIds(questions)
  for (const id of Object.values(footer)) {
    if (id) ids.add(id)
  }
  return ids
}

function triFromAnswer(
  answer: InitialAssessmentAnswerInput | undefined,
): boolean | null {
  if (!answer) return null
  if (answer.checked === true || answer.booleanValue === true) return true
  if (answer.checked === false || answer.booleanValue === false) return false
  return null
}

/** Prefer stored worksheet metadata; fill gaps from linked template answers. */
export function enrichAdlWorksheetFromAnswers(
  adl: AdlWorksheetMetadata,
  questions: InitialAssessmentQuestion[],
  answers: Record<string, InitialAssessmentAnswerInput>,
): AdlWorksheetMetadata {
  const fq = resolveAdlWorksheetFooterQuestionIds(questions)
  const fallsCompleted =
    adl.fallsAssessmentCompleted ??
    (fq.fallsAssessmentCompletedId
      ? triFromAnswer(answers[fq.fallsAssessmentCompletedId])
      : null)
  const fallsDate =
    adl.fallsAssessmentDate ??
    (fq.fallsAssessmentDateId
      ? answers[fq.fallsAssessmentDateId]?.dateValue?.slice(0, 10) ?? null
      : null)
  const mobilityRequired =
    adl.mobilityAidsRequired ??
    (fq.mobilityAidsRequiredId ? triFromAnswer(answers[fq.mobilityAidsRequiredId]) : null)
  const mobilityList =
    adl.mobilityAidsList ??
    (fq.mobilityAidsListId ? answers[fq.mobilityAidsListId]?.textValue?.trim() ?? '' : '')

  return {
    ...adl,
    fallsAssessmentCompleted: fallsCompleted,
    fallsAssessmentDate: fallsDate,
    mobilityAidsRequired: mobilityRequired,
    mobilityAidsList: mobilityList,
  }
}

export function yesNoAnswer(questionId: string, yes: boolean): InitialAssessmentAnswerInput {
  return { questionId, checked: yes, booleanValue: yes }
}

export function isYesNoTrue(value: boolean | null | undefined): boolean {
  return value === true
}

export function syncAdlFooterToAnswers(
  adl: AdlWorksheetMetadata,
  footerIds: AdlWorksheetFooterQuestionIds,
  onChange: (questionId: string, patch: InitialAssessmentAnswerInput) => void,
): void {
  if (footerIds.fallsAssessmentCompletedId && adl.fallsAssessmentCompleted != null) {
    onChange(
      footerIds.fallsAssessmentCompletedId,
      yesNoAnswer(footerIds.fallsAssessmentCompletedId, adl.fallsAssessmentCompleted),
    )
  }
  if (footerIds.fallsAssessmentDateId && adl.fallsAssessmentDate) {
    onChange(footerIds.fallsAssessmentDateId, {
      questionId: footerIds.fallsAssessmentDateId,
      dateValue: `${adl.fallsAssessmentDate.slice(0, 10)}T00:00:00.000Z`,
    })
  }
  if (footerIds.mobilityAidsRequiredId && adl.mobilityAidsRequired != null) {
    onChange(
      footerIds.mobilityAidsRequiredId,
      yesNoAnswer(footerIds.mobilityAidsRequiredId, adl.mobilityAidsRequired),
    )
  }
  if (footerIds.mobilityAidsListId) {
    onChange(footerIds.mobilityAidsListId, {
      questionId: footerIds.mobilityAidsListId,
      textValue: adl.mobilityAidsList ?? '',
    })
  }
}

export function footerCompleteForValidation(
  adl: AdlWorksheetMetadata,
  footerIds: AdlWorksheetFooterQuestionIds,
): boolean {
  if (footerIds.fallsAssessmentCompletedId && adl.fallsAssessmentCompleted == null) return false
  if (
    footerIds.fallsAssessmentDateId &&
    adl.fallsAssessmentCompleted === true &&
    !adl.fallsAssessmentDate?.trim()
  ) {
    return false
  }
  if (footerIds.mobilityAidsRequiredId && adl.mobilityAidsRequired == null) return false
  if (
    footerIds.mobilityAidsListId &&
    adl.mobilityAidsRequired === true &&
    !adl.mobilityAidsList?.trim()
  ) {
    return false
  }
  return true
}
