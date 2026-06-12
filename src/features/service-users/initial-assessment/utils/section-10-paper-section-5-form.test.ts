import { describe, expect, it } from 'vitest'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import {
  collectPaperSection5CognitiveQuestions,
  isPaperSection5Question,
  paperSection5GroupOrderIndex,
} from '@/features/service-users/initial-assessment/utils/section-10-paper-section-5-form'

const SORT_BY_TEXT: Record<string, number> = {
  'Cognitive impairment level': 20,
  'AMT completed?': 31,
  'Mental Capacity Assessment required?': 34,
  'GP referral for cognition made?': 36,
}

function q(text: string, specRef: string): InitialAssessmentQuestion {
  return {
    id: text,
    questionText: text,
    questionType: 'TEXT',
    isRequired: false,
    sortOrder: SORT_BY_TEXT[text] ?? 1,
    riskFlag: false,
    carePlanTrigger: false,
    metadata: { specRef },
  }
}

describe('section 10 paper section 5 form', () => {
  it('orders paper subsection groups emotional → cognitive → sleeping', () => {
    expect(paperSection5GroupOrderIndex('10.2')).toBeLessThan(paperSection5GroupOrderIndex('10.6'))
    expect(paperSection5GroupOrderIndex('10.6')).toBeLessThan(paperSection5GroupOrderIndex('10.4'))
  })

  it('allows only paper section 5 questions', () => {
    expect(isPaperSection5Question(q('Sleeping pattern', '10.4'))).toBe(true)
    expect(isPaperSection5Question(q('Diagnosed dementia?', '10.6a'))).toBe(false)
    expect(isPaperSection5Question(q('No concerns identified in this section', '10.0'))).toBe(false)
  })

  it('merges 10.7 and 10.8 yes/no fields into paper §5b without AMT score panels', () => {
    const merged = collectPaperSection5CognitiveQuestions([
      {
        specRef: '10.6',
        label: 'b',
        questions: [
          q('Cognitive impairment level', '10.6'),
          q('GP referral for cognition made?', '10.6'),
        ],
      },
      {
        specRef: '10.7',
        label: '10.7',
        questions: [q('AMT completed?', '10.7'), q('AMT score', '10.7')],
      },
      {
        specRef: '10.8',
        label: '10.8',
        questions: [q('Mental Capacity Assessment required?', '10.8')],
      },
    ])

    expect(merged.map((x) => x.questionText)).toEqual([
      'Cognitive impairment level',
      'AMT completed?',
      'Mental Capacity Assessment required?',
      'GP referral for cognition made?',
    ])
  })
})
