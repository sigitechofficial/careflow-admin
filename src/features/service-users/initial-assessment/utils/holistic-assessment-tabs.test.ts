import { describe, expect, it } from 'vitest'
import { HOLISTIC_ASSESSMENT_TABS, questionsForDocumentTab } from '@/features/service-users/initial-assessment/utils/holistic-assessment-tabs'
import type {
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

function yesNoQ(id: string, text: string, specRef: string, fieldKey?: string): InitialAssessmentQuestion {
  return {
    id,
    questionText: text,
    questionType: 'YES_NO',
    isRequired: true,
    sortOrder: 1,
    riskFlag: false,
    carePlanTrigger: false,
    metadata: { specRef, ...(fieldKey ? { fieldKey } : {}) },
  }
}

describe('questionsForDocumentTab', () => {
  it('includes §3.1 fire safety fields on holistic tab 1 save scope', () => {
    const fireYes = yesNoQ('fire-yes', 'Any fire safety risks identified?', '3.1', 'fireSafetyRisksIdentified')
    const lfb = yesNoQ('lfb', 'London Fire Brigade informed?', '3.2', 'londonFireBrigadeInformed')
    const manage = yesNoQ('manage', 'Can client manage home environment safely?', '3.3', 'manageHomeEnvironmentSafely')

    const section1: InitialAssessmentSection = {
      id: 's1',
      sectionNumber: 1,
      title: 'Section 1',
      sortOrder: 1,
      questions: [yesNoQ('rep', 'Representative involved in assessment?', '1.2')],
    }
    const section3: InitialAssessmentSection = {
      id: 's3',
      sectionNumber: 3,
      title: 'Section 3',
      sortOrder: 3,
      questions: [fireYes, lfb, manage],
    }

    const tab = HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === 1)!
    const visible = new Map<number, InitialAssessmentQuestion[]>([
      [1, section1.questions],
      [3, []],
    ])

    const tabQuestions = questionsForDocumentTab(tab, [section1, section3], visible)
    const ids = new Set(tabQuestions.map((q) => q.id))

    expect(ids.has('fire-yes')).toBe(true)
    expect(ids.has('lfb')).toBe(true)
    expect(ids.has('manage')).toBe(true)
  })
})
