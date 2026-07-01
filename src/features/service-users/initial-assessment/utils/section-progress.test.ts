import { describe, expect, it } from 'vitest'
import {
  formatSectionNavMeta,
  overallAssessmentProgress,
  sectionProgress,
} from '@/features/service-users/initial-assessment/utils/section-progress'
import { textAnswerHasVisibleContent } from '@/features/service-users/initial-assessment/utils/secure-field'
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

function textQ(id: string, text: string): InitialAssessmentQuestion {
  return {
    id,
    questionText: text,
    questionType: 'TEXT',
    isRequired: false,
    sortOrder: 1,
    riskFlag: false,
    carePlanTrigger: false,
    metadata: {},
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

  it('does not count empty Summernote HTML as answered', () => {
    const q = textQ('q1', 'Notes')
    const sec = sectionWithQuestions(5, [q])
    const prog = sectionProgress(sec, { q1: { questionId: 'q1', textValue: '<p><br></p>' } }, [sec])
    expect(prog.answered).toBe(0)
    expect(prog.percent).toBe(0)
  })

  it('counts rich text with visible content as answered', () => {
    const q = textQ('q1', 'Notes')
    const sec = sectionWithQuestions(5, [q])
    const prog = sectionProgress(sec, { q1: { questionId: 'q1', textValue: '<p>Hello</p>' } }, [sec])
    expect(prog.answered).toBe(1)
    expect(prog.percent).toBe(100)
  })

  it('overall progress averages enterprise section percents', () => {
    const secA = sectionWithQuestions(1, [yesNoQ('a', 'A')])
    const secB = sectionWithQuestions(2, [yesNoQ('b', 'B')])
    const answers = {
      a: { questionId: 'a', checked: true, booleanValue: true },
    }
    expect(overallAssessmentProgress([secA, secB], answers, {})).toBe(50)
  })

  it('textAnswerHasVisibleContent ignores empty HTML', () => {
    expect(textAnswerHasVisibleContent('<p><br></p>')).toBe(false)
    expect(textAnswerHasVisibleContent('<p>Notes</p>')).toBe(true)
  })
})
