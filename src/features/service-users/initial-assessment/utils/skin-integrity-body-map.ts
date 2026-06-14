import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import { fieldKeyOf, isYesAnswer } from '@/features/service-users/initial-assessment/utils/question-lookup'

/** Yes/No gates that should offer body map observation recording. */
export const SKIN_INTEGRITY_BODY_MAP_FIELD_KEYS = new Set([
  'skinCondition',
  'hasWounds',
  'pressureUlcerRiskAssessmentCompleted',
])

const PRESSURE_ULCER_RISK_TEXT = 'pressure ulcer risk assessment completed'

export function isSkinIntegrityBodyMapGateQuestion(question: InitialAssessmentQuestion): boolean {
  if (question.metadata?.bodyMapModule === true) return true
  const fieldKey = fieldKeyOf(question)
  if (fieldKey && SKIN_INTEGRITY_BODY_MAP_FIELD_KEYS.has(fieldKey)) return true
  return question.questionText.trim().toLowerCase().includes(PRESSURE_ULCER_RISK_TEXT)
}

export function skinIntegrityBodyMapGateAnsweredYes(
  sections: InitialAssessmentSection[],
  draftAnswers: Record<string, InitialAssessmentAnswerInput>,
): boolean {
  for (const section of sections) {
    if (section.sectionNumber !== 11) continue
    for (const question of section.questions) {
      if (!isSkinIntegrityBodyMapGateQuestion(question)) continue
      if (isYesAnswer(draftAnswers[question.id])) return true
    }
  }
  return false
}

export function skinIntegrityBodyMapGateForQuestion(
  question: InitialAssessmentQuestion,
  draftAnswers: Record<string, InitialAssessmentAnswerInput>,
): boolean {
  return isSkinIntegrityBodyMapGateQuestion(question) && isYesAnswer(draftAnswers[question.id])
}
