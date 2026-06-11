import type { InitialAssessmentQuestion, InitialAssessmentSection } from '@/features/service-users/initial-assessment/types'
import { findQuestionByFieldKey, findQuestionByTextIncludes } from '@/features/service-users/initial-assessment/utils/question-lookup'

export const SECTION_31_FIRE_FIELD_KEYS = [
  'fireSafetyRisks',
  'londonFireBrigadeInformed',
  'londonFireBrigadeDetails',
  'manageHomeEnvironmentSafely',
  'homeEnvironmentSafetyMeasures',
] as const

export type Section31FireQuestions = {
  fireRisks?: InitialAssessmentQuestion
  lfbInformed?: InitialAssessmentQuestion
  lfbDetails?: InitialAssessmentQuestion
  manageHomeSafely?: InitialAssessmentQuestion
  safetyMeasures?: InitialAssessmentQuestion
}

export function findSection31FireQuestions(sections: InitialAssessmentSection[]): Section31FireQuestions {
  return {
    fireRisks:
      findQuestionByFieldKey(sections, 'fireSafetyRisks') ??
      findQuestionByTextIncludes(sections, 'fire safety risks identified'),
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

export function isSection31FireQuestion(q: InitialAssessmentQuestion): boolean {
  const fieldKey = q.metadata?.fieldKey
  if (typeof fieldKey === 'string' && (SECTION_31_FIRE_FIELD_KEYS as readonly string[]).includes(fieldKey)) {
    return true
  }
  const specRef = q.metadata?.specRef
  return specRef === '3.1' || specRef === '3.2' || specRef === '3.3' || specRef === '3.4'
}
