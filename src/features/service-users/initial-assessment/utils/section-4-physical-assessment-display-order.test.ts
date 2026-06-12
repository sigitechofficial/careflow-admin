import { describe, expect, it } from 'vitest'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import { sortSpecRefGroups } from '@/features/service-users/initial-assessment/utils/spec-ref-groups'
import {
  isPaperSection4EnterpriseSection,
  isPaperSection4MainSlice,
  isPaperSection4TailSlice,
  sortSection4GlucoseQuestions,
  sortVitalsMeasurementQuestions,
} from '@/features/service-users/initial-assessment/utils/section-4-physical-assessment-display-order'

function q(
  partial: Partial<InitialAssessmentQuestion> & Pick<InitialAssessmentQuestion, 'questionText'>,
): InitialAssessmentQuestion {
  return {
    id: partial.questionText,
    questionType: 'TEXT',
    isRequired: false,
    sortOrder: partial.sortOrder ?? 1,
    riskFlag: false,
    carePlanTrigger: false,
    metadata: partial.metadata ?? {},
    ...partial,
  }
}

describe('section 4 physical assessment display order', () => {
  it('treats enterprise sections 4–9 as paper section 4', () => {
    expect(isPaperSection4EnterpriseSection(4)).toBe(true)
    expect(isPaperSection4EnterpriseSection(9)).toBe(true)
    expect(isPaperSection4EnterpriseSection(10)).toBe(false)
  })

  it('splits tab 1 paper section 4 into main, emotional, and tail slices', () => {
    expect(isPaperSection4MainSlice(9)).toBe(true)
    expect(isPaperSection4MainSlice(10)).toBe(false)
    expect(isPaperSection4TailSlice({ sectionNumber: 11 })).toBe(true)
    expect(isPaperSection4TailSlice({ sectionNumber: 4, specRefs: ['4.7'] })).toBe(true)
    expect(isPaperSection4TailSlice({ sectionNumber: 4, specRefs: ['4.10'] })).toBe(true)
    expect(isPaperSection4TailSlice({ sectionNumber: 6, specRefs: ['6.5'] })).toBe(false)
  })

  it('sorts vitals measurements in paper grid order', () => {
    const sorted = sortVitalsMeasurementQuestions([
      q({ questionText: 'Oxygen saturation (SpO2 %)', metadata: { fieldKey: 'spo2' }, sortOrder: 5 }),
      q({ questionText: 'Temperature (°C)', metadata: { fieldKey: 'temperature' }, sortOrder: 1 }),
      q({ questionText: 'Pulse (bpm)', metadata: { fieldKey: 'pulse' }, sortOrder: 2 }),
    ])

    expect(sorted.map((x) => x.metadata?.fieldKey)).toEqual(['temperature', 'pulse', 'spo2'])
  })

  it('places diabetic yes/no and type before blood glucose', () => {
    const sorted = sortSection4GlucoseQuestions([
      q({ questionText: 'Blood glucose (mmol/L)', sortOrder: 3 }),
      q({ questionText: 'Type of diabetes', sortOrder: 2 }),
      q({ questionText: 'Service User is diabetic?', sortOrder: 1 }),
    ])

    expect(sorted.map((x) => x.questionText)).toEqual([
      'Service User is diabetic?',
      'Type of diabetes',
      'Blood glucose (mmol/L)',
    ])
  })

  it('orders section 5 subsections b–d before the no-concern gate', () => {
    const sorted = sortSpecRefGroups(
      [
        { specRef: '5.0', label: 'gate', questions: [] },
        { specRef: '5.3', label: 'c', questions: [] },
        { specRef: '5.1', label: 'b', questions: [] },
        { specRef: '5.4', label: 'd', questions: [] },
        { specRef: '5.2', label: 'plan', questions: [] },
      ],
      5,
    )

    expect(sorted.map((g) => g.specRef)).toEqual(['5.1', '5.2', '5.3', '5.4', '5.0'])
  })
})
