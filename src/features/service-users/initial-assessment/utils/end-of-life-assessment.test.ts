import { describe, expect, it } from 'vitest'
import {
  END_OF_LIFE_ASSESSMENT_QUESTIONS,
  endOfLifeAnswerKey,
  endOfLifeNotesKey,
  endOfLifeTriAnswerKey,
  isEndOfLifeAssessmentComplete,
  normalizeEndOfLifeAssessmentMetadata,
  type EndOfLifeAssessmentMetadata,
} from '@/features/service-users/initial-assessment/utils/end-of-life-assessment'

function filledEol(): EndOfLifeAssessmentMetadata {
  const out: EndOfLifeAssessmentMetadata = {}
  for (const q of END_OF_LIFE_ASSESSMENT_QUESTIONS) {
    if (q.kind === 'yesNo') out[endOfLifeAnswerKey(q.id)] = false
    if (q.kind === 'yesNoUnknown') out[endOfLifeTriAnswerKey(q.id)] = 'no'
    out[endOfLifeNotesKey(q.id)] = `Recorded note for ${q.id}.`
  }
  return out
}

describe('End of Life Assessment worksheet completeness', () => {
  it('defines 19 worksheet questions and always shows notes (no hidden follow-ups)', () => {
    expect(END_OF_LIFE_ASSESSMENT_QUESTIONS).toHaveLength(19)
    expect(END_OF_LIFE_ASSESSMENT_QUESTIONS.filter((q) => q.kind === 'notesOnly').map((q) => q.id)).toEqual([
      'significantBeliefs',
      'consentMethod',
    ])
    expect(END_OF_LIFE_ASSESSMENT_QUESTIONS.filter((q) => q.kind === 'yesNoUnknown').map((q) => q.id)).toEqual([
      'medicalAidRecovery',
      'lastWill',
    ])
  })

  it('is complete when every yes/no and tri-state question is answered', () => {
    expect(isEndOfLifeAssessmentComplete(filledEol())).toBe(true)
  })

  it('is incomplete when a visible yes/no answer is missing', () => {
    const partial = filledEol()
    delete partial.endOfLifeCarePlanAnswer
    expect(isEndOfLifeAssessmentComplete(partial)).toBe(false)
  })

  it('reload via normalize keeps structured answers and notes', () => {
    const saved = filledEol()
    saved.endOfLifeCarePlanAnswer = true
    saved.endOfLifeCarePlanNotes = 'An end of life care plan is in place.'
    saved.medicalAidRecoveryTriAnswer = 'unknown'
    const reloaded = normalizeEndOfLifeAssessmentMetadata(JSON.parse(JSON.stringify(saved)))
    expect(reloaded.endOfLifeCarePlanAnswer).toBe(true)
    expect(reloaded.endOfLifeCarePlanNotes).toContain('end of life care plan')
    expect(reloaded.medicalAidRecoveryTriAnswer).toBe('unknown')
    expect(isEndOfLifeAssessmentComplete(reloaded)).toBe(true)
  })
})
