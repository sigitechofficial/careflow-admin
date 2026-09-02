import { describe, expect, it } from 'vitest'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import { sortPersonalDetailsQuestions } from '@/features/service-users/initial-assessment/utils/section-1-personal-details-order'

function q(questionText: string, sortOrder: number): InitialAssessmentQuestion {
  return {
    id: questionText,
    questionText,
    questionType: 'TEXT',
    isRequired: false,
    sortOrder,
    riskFlag: false,
    carePlanTrigger: false,
    metadata: { specRef: '1.1' },
  }
}

describe('sortPersonalDetailsQuestions', () => {
  it('orders basic identity fields before administrative fields', () => {
    const sorted = sortPersonalDetailsQuestions([
      q('Funding type', 5),
      q('First name', 76),
      q('Preferred name', 1),
      q('Referral source', 6),
      q('NI number', 79),
      q('Gender', 3),
      q('Ethnicity', 82),
    ])

    expect(sorted.map((x) => x.questionText)).toEqual([
      'First name',
      'Preferred name',
      'Gender',
      'NI number',
      'Ethnicity',
      'Funding type',
      'Referral source',
    ])
  })

  it('places address before GP contact without key-safe fields', () => {
    const sorted = sortPersonalDetailsQuestions([
      q('GP contact details', 4),
      q('Address and contact details', 1),
    ])

    expect(sorted.map((x) => x.questionText)).toEqual([
      'Address and contact details',
      'GP contact details',
    ])
  })

  it('interleaves LPOA and assessor fields per paper form', () => {
    const sorted = sortPersonalDetailsQuestions([
      q('Assessor designation', 3),
      q('LPOA name', 2),
      q('LPOA appointed?', 1),
      q('Assessor name', 4),
      q('LPOA contact details', 5),
      q('Assessment completed date and time', 6),
      q('LPOA designation', 7),
    ])

    expect(sorted.map((x) => x.questionText)).toEqual([
      'Assessment completed date and time',
      'LPOA appointed?',
      'LPOA designation',
      'LPOA name',
      'Assessor name',
      'Assessor designation',
      'LPOA contact details',
    ])
  })
})
