import { describe, expect, it } from 'vitest'
import type {
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import {
  MENTAL_CAPACITY_CHECKLIST_ROWS,
  MENTAL_CAPACITY_DETAILED_QUESTION_IDS,
  syncMentalCapacityChecklistFromScreening,
  type MentalCapacityChecklistMetadata,
} from '@/features/service-users/initial-assessment/utils/mental-capacity-checklist'

function mcaQ(id: string, fieldKey: string): InitialAssessmentQuestion {
  return {
    id,
    questionText: fieldKey,
    questionType: 'YES_NO',
    isRequired: true,
    riskFlag: false,
    carePlanTrigger: false,
    sortOrder: 1,
    metadata: { specRef: '2.mca', fieldKey },
  }
}

const sections: InitialAssessmentSection[] = [
  {
    id: 's2',
    sectionNumber: 2,
    title: 'Consent',
    sortOrder: 2,
    questions: [
      mcaQ('q1', 'mcaStage1Impairment'),
      mcaQ('q2', 'mcaStage2UnableToDecide'),
      mcaQ('q3', 'mcaFunctionalUnderstand'),
      mcaQ('q4', 'mcaFunctionalRetain'),
      mcaQ('q5', 'mcaFunctionalWeigh'),
      mcaQ('q6', 'mcaFunctionalCommunicate'),
    ],
  },
]

describe('MCA checklist (Tab 17) ← MCA screening (Tab 3) sync', () => {
  it('mirrors the six screening answers with the same Yes/No meaning', () => {
    const next = syncMentalCapacityChecklistFromScreening({ assessmentType: 'preliminary' }, sections, {
      q1: { questionId: 'q1', booleanValue: true },
      q2: { questionId: 'q2', booleanValue: true },
      q3: { questionId: 'q3', booleanValue: false },
      q4: { questionId: 'q4', checked: true },
      q5: { questionId: 'q5', booleanValue: false },
      q6: { questionId: 'q6', booleanValue: true },
    })
    expect(next).toEqual({
      assessmentType: 'preliminary',
      impairmentAnswer: true,
      unableKeyDecisionAnswer: true,
      understandDecisionAnswer: false,
      retainInformationAnswer: true,
      useInformationAnswer: false,
      communicateDecisionAnswer: true,
    })
  })

  it('overrides a stale checklist value but leaves rows alone when screening is unanswered', () => {
    const stale: MentalCapacityChecklistMetadata = { impairmentAnswer: false, retainInformationAnswer: false }
    const next = syncMentalCapacityChecklistFromScreening(stale, sections, {
      q1: { questionId: 'q1', booleanValue: true },
    })
    expect(next.impairmentAnswer).toBe(true)
    expect(next.retainInformationAnswer).toBe(false)
  })

  it('returns the same object when nothing changes (no re-render / re-save loop)', () => {
    const meta: MentalCapacityChecklistMetadata = { impairmentAnswer: true }
    expect(
      syncMentalCapacityChecklistFromScreening(meta, sections, { q1: { questionId: 'q1', booleanValue: true } }),
    ).toBe(meta)
  })

  it('no longer asks the combined "oral care and grooming" duplicate', () => {
    const labels = MENTAL_CAPACITY_CHECKLIST_ROWS.flatMap((r) => (r.kind === 'question' ? [r.label] : []))
    expect(labels.some((l) => l.includes('oral care and grooming'))).toBe(false)
    expect(MENTAL_CAPACITY_DETAILED_QUESTION_IDS).not.toContain('oralCareGrooming')
    const numbers = MENTAL_CAPACITY_CHECKLIST_ROWS.flatMap((r) => (r.kind === 'question' ? [r.number] : []))
    expect(numbers).toEqual(numbers.map((_, i) => i + 1))
  })
})
