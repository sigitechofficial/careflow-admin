import type { InitialAssessmentQuestion, InitialAssessmentSection } from '@/features/service-users/initial-assessment/types'
import { findQuestionByFieldKey, findQuestionByTextIncludes } from '@/features/service-users/initial-assessment/utils/question-lookup'

export const SECTION_31_FIRE_FIELD_KEYS = [
  'fireSafetyRisksIdentified',
  'fireSafetyRisksDetails',
  'fireSafetyRisks',
  'londonFireBrigadeInformed',
  'londonFireBrigadeDetails',
  'smokeAlarmFittedWorking',
  'smokeCoFireAlarmReferral',
  'smokingInProperty',
  'cookingLeftUnattendedRisk',
  'cookingFireRiskDetails',
  'primaryEscapeRoute',
  'fireEmergencyArrangements',
] as const

export type Section31FireQuestions = {
  fireRisksIdentified?: InitialAssessmentQuestion
  fireRisksDetails?: InitialAssessmentQuestion
  lfbInformed?: InitialAssessmentQuestion
  lfbDetails?: InitialAssessmentQuestion
  manageHomeSafely?: InitialAssessmentQuestion
  safetyMeasures?: InitialAssessmentQuestion
}

function findFireRisksIdentifiedQuestion(
  sections: InitialAssessmentSection[],
): InitialAssessmentQuestion | undefined {
  const byKey = findQuestionByFieldKey(sections, 'fireSafetyRisksIdentified')
  if (byKey) return byKey
  return sections
    .flatMap((s) => s.questions)
    .find(
      (q) =>
        q.questionType === 'YES_NO' &&
        q.questionText.trim().toLowerCase() === 'any fire safety risks identified?',
    )
}

function findFireRisksDetailsQuestion(
  sections: InitialAssessmentSection[],
): InitialAssessmentQuestion | undefined {
  return (
    findQuestionByFieldKey(sections, 'fireSafetyRisksDetails') ??
    findQuestionByFieldKey(sections, 'fireSafetyRisks') ??
    findQuestionByTextIncludes(sections, 'fire safety risks identified? (please state)')
  )
}

export function findSection31FireQuestions(sections: InitialAssessmentSection[]): Section31FireQuestions {
  return {
    fireRisksIdentified: findFireRisksIdentifiedQuestion(sections),
    fireRisksDetails: findFireRisksDetailsQuestion(sections),
    lfbInformed:
      findQuestionByFieldKey(sections, 'londonFireBrigadeInformed') ??
      findQuestionByTextIncludes(sections, 'london fire brigade informed'),
    lfbDetails:
      findQuestionByFieldKey(sections, 'londonFireBrigadeDetails') ??
      findQuestionByTextIncludes(sections, 'london fire brigade contact') ??
      findQuestionByTextIncludes(sections, 'london fire brigade informed — details'),
    manageHomeSafely:
      findQuestionByFieldKey(sections, 'manageHomeEnvironmentSafely') ??
      findQuestionByTextIncludes(sections, 'manage home environment safely'),
    safetyMeasures:
      findQuestionByFieldKey(sections, 'homeEnvironmentSafetyMeasures') ??
      findQuestionByTextIncludes(sections, 'if no, what measure should be taken') ??
      findQuestionByTextIncludes(sections, 'measures needed if home is unsafe'),
  }
}

/** §3.1–3.4 fields rendered inside tab 1 social history — must be included in tab save scope. */
export function listSection31FireQuestions(sections: InitialAssessmentSection[]): InitialAssessmentQuestion[] {
  const fire = findSection31FireQuestions(sections)
  return [
    fire.fireRisksIdentified,
    fire.fireRisksDetails,
    fire.lfbInformed,
    fire.lfbDetails,
    fire.manageHomeSafely,
    fire.safetyMeasures,
  ].filter((q): q is InitialAssessmentQuestion => Boolean(q))
}

export function isSection31FireQuestion(q: InitialAssessmentQuestion): boolean {
  const fieldKey = q.metadata?.fieldKey
  if (typeof fieldKey === 'string' && (SECTION_31_FIRE_FIELD_KEYS as readonly string[]).includes(fieldKey)) {
    return true
  }
  const specRef = q.metadata?.specRef
  return (
    specRef === '18.1' ||
    specRef === '18.2' ||
    specRef === '18.3' ||
    specRef === '18.4' ||
    specRef === '18.5' ||
    specRef === '18.6'
  )
}
