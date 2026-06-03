import { describe, expect, it } from 'vitest'
import {
  formatSectionNavMeta,
  sectionProgress,
} from '@/features/service-users/initial-assessment/utils/section-progress'
import type {
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

function yesNoQ(id: string, text: string, required = false): InitialAssessmentQuestion {
  return {
    id,
    questionText: text,
    questionType: 'YES_NO',
    isRequired: required,
    sortOrder: 1,
    riskFlag: false,
    carePlanTrigger: false,
    metadata: { specRef: '5.1' },
  }
}

function sectionWithQuestions(n: number, questions: InitialAssessmentQuestion[]): InitialAssessmentSection {
  return {
    id: `sec-${n}`,
    sectionNumber: n,
    title: `Section ${n}`,
    sortOrder: n,
    questions,
  }
}

describe('section-progress', () => {
  it('counts explicit No as answered', () => {
    const q = yesNoQ('q1', 'Asthma present?')
    const sec = sectionWithQuestions(5, [q])
    const prog = sectionProgress(
      sec,
      { q1: { questionId: 'q1', checked: false, booleanValue: false } },
      [sec],
    )
    expect(prog.answered).toBe(1)
    expect(prog.total).toBe(1)
    expect(prog.percent).toBe(100)
  })

  it('formatSectionNavMeta shows fields not misleading percent', () => {
    expect(formatSectionNavMeta({ answered: 3, total: 8, requiredAnswered: 1, requiredTotal: 2, percent: 38 })).toBe(
      '3/8 fields · 1 required',
    )
  })
})
