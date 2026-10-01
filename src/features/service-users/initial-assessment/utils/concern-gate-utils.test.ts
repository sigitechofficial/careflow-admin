import { describe, expect, it } from 'vitest'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import {
  isHiddenDerivedConcernGate,
  syncDerivedConcernGates,
} from '@/features/service-users/initial-assessment/utils/concern-gate-utils'

function q(
  id: string,
  questionText: string,
  questionType: InitialAssessmentQuestion['questionType'],
  fieldKey?: string,
): InitialAssessmentQuestion {
  return {
    id,
    questionText,
    questionType,
    isRequired: false,
    riskFlag: false,
    carePlanTrigger: false,
    sortOrder: 0,
    metadata: fieldKey ? { specRef: '7.4', fieldKey } : { specRef: '7.4' },
  }
}

const bladder = q('bladder', 'Bladder continence options', 'MULTI_SELECT', 'bladderContinenceOptions')
const bowel = q('bowel', 'Bowel continence options', 'MULTI_SELECT', 'bowelContinenceOptions')
const doubly = q('doubly', 'Doubly incontinent?', 'YES_NO')

const sections: InitialAssessmentSection[] = [
  { id: 's7', sectionNumber: 7, title: 'Continence', sortOrder: 7, questions: [bladder, bowel, doubly] },
]

function derivedDoubly(bladderValues: string[], bowelValues: string[]): boolean | null | undefined {
  const answers: Record<string, InitialAssessmentAnswerInput> = {
    bladder: { questionId: 'bladder', selectedOptions: bladderValues },
    bowel: { questionId: 'bowel', selectedOptions: bowelValues },
  }
  return syncDerivedConcernGates(sections, answers).answers.doubly?.booleanValue
}

describe('Doubly incontinent (derived §7.4 gate)', () => {
  it('is hidden because bladder + bowel options drive it', () => {
    expect(isHiddenDerivedConcernGate(doubly, sections)).toBe(true)
  })

  it('is Yes only when both bladder and bowel show true incontinence', () => {
    expect(derivedDoubly(['incontinence'], ['incontinence'])).toBe(true)
    expect(derivedDoubly(['stress'], ['nocturnal'])).toBe(true)
    expect(derivedDoubly(['incontinence'], ['no_concern'])).toBe(false)
  })

  it('treats catheter, urostomy / stoma and pads alone as not incontinent (Waterlow: catheterised = continent)', () => {
    expect(derivedDoubly(['catheter'], ['stoma'])).toBe(false)
    expect(derivedDoubly(['urostomy'], ['incontinence'])).toBe(false)
    expect(derivedDoubly(['products'], ['products'])).toBe(false)
  })
})
