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

  it('orders LPOA fields after assessment completed date', () => {
    const sorted = sortPersonalDetailsQuestions([
      q('LPA name', 2),
      q('LPA appointed?', 1),
      q('LPA contact details', 5),
      q('Assessment completed date and time', 6),
      q('LPA designation', 7),
    ])

    expect(sorted.map((x) => x.questionText)).toEqual([
      'Assessment completed date and time',
      'LPA appointed?',
      'LPA designation',
      'LPA name',
      'LPA contact details',
    ])
  })
})
