import { describe, expect, it } from 'vitest'
import { HOLISTIC_ASSESSMENT_TABS } from '@/features/service-users/initial-assessment/utils/holistic-assessment-tabs'
import { demoFillQuestionsForDocumentTab } from '@/features/service-users/initial-assessment/utils/demo-fill-tab-questions'
import type {
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

function q(
  id: string,
  text: string,
  specRef: string,
  extra: Partial<InitialAssessmentQuestion> = {},
): InitialAssessmentQuestion {
  return {
    id,
    questionText: text,
    questionType: extra.questionType ?? 'YES_NO',
    isRequired: extra.isRequired ?? true,
    sortOrder: extra.sortOrder ?? 1,
    riskFlag: false,
    carePlanTrigger: false,
    metadata: { specRef, ...(extra.metadata ?? {}) },
  }
}

const section1: InitialAssessmentSection = {
  id: 's1',
  sectionNumber: 1,
  title: 'Section 1',
  sortOrder: 1,
  questions: [
    q('assessor-s1', 'Assessor name', '1.1', {
      questionType: 'TEXT',
      metadata: { specRef: '1.1', fieldKey: 'assessorName' },
    }),
    q('rep', 'Representative involved in assessment?', '1.2'),
  ],
}

const section2: InitialAssessmentSection = {
  id: 's2',
  sectionNumber: 2,
  title: 'Section 2',
  sortOrder: 2,
  questions: [
    q('consent', 'Has the Service User consented to this assessment?', '2.1'),
    q('mca-tool', 'Does the person have an impairment or disturbance in the functioning of the mind or brain?', '2.mca'),
  ],
}

const section3: InitialAssessmentSection = {
  id: 's3',
  sectionNumber: 3,
  title: 'Section 3',
  sortOrder: 3,
  questions: [
    q('manage', 'Can client manage home environment safely?', '3.3', {
      metadata: { specRef: '3.3', fieldKey: 'manageHomeEnvironmentSafely' },
    }),
    q('lone', 'Lone worker risk identified?', '3.9'),
    q('access', 'Access instructions for staff', '3.5', {
      questionType: 'TEXTAREA',
      metadata: { specRef: '3.5', fieldKey: 'accessInstructions', prefillKey: 'accessInstruction' },
    }),
  ],
}

const section4: InitialAssessmentSection = {
  id: 's4',
  sectionNumber: 4,
  title: 'Section 4',
  sortOrder: 4,
  questions: [
    q('diabetic', 'Service User is diabetic?', '4.4'),
    q('diabetes-type', 'Type of diabetes', '4.4', { questionType: 'SINGLE_SELECT' }),
  ],
}

const section13: InitialAssessmentSection = {
  id: 's13',
  sectionNumber: 13,
  title: 'Section 13',
  sortOrder: 13,
  questions: [
    q('sg', 'Any safeguarding concerns identified?', '13.1', {
      metadata: { specRef: '13.1', fieldKey: 'safeguardingConcern' },
    }),
    q('emergency', 'Emergency contact 1 recorded?', '13.3'),
  ],
}

const section14: InitialAssessmentSection = {
  id: 's14',
  sectionNumber: 14,
  title: 'Section 14',
  sortOrder: 14,
  questions: [
    q('next-review', 'Next review date', '14.1', {
      questionType: 'DATE',
      metadata: { specRef: '14.1', fieldKey: 'nextReviewDate' },
    }),
    q('assessor-s14', 'Assessor name', '14.8', {
      questionType: 'TEXT',
      metadata: { specRef: '14.8', fieldKey: 'assessorName' },
    }),
  ],
}

const sections = [section1, section2, section3, section4, section13, section14]

describe('demoFillQuestionsForDocumentTab', () => {
  it('tab 1 includes manage-home, §1 assessorName, and same-tab diabetes follow-up', () => {
    const tab = HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === 1)!
    const ids = new Set(demoFillQuestionsForDocumentTab(tab, sections).map((x) => x.id))
    expect(ids.has('manage')).toBe(true)
    expect(ids.has('assessor-s1')).toBe(true)
    expect(ids.has('diabetes-type')).toBe(true)
    expect(ids.has('sg')).toBe(false)
    expect(ids.has('emergency')).toBe(false)
    expect(ids.has('lone')).toBe(false)
  })

  it('tab 3 includes §2.1–2.8 consent as well as the MCA tool', () => {
    const tab = HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === 3)!
    const ids = new Set(demoFillQuestionsForDocumentTab(tab, sections).map((x) => x.id))
    expect(ids.has('consent')).toBe(true)
    expect(ids.has('mca-tool')).toBe(true)
    expect(ids.has('sg')).toBe(false)
  })

  it('tab 12 owns remaining §3 template questions including lone worker (not fire)', () => {
    const tab = HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === 12)!
    const ids = new Set(demoFillQuestionsForDocumentTab(tab, sections).map((x) => x.id))
    expect(ids.has('lone')).toBe(true)
    expect(ids.has('access')).toBe(true)
    expect(ids.has('manage')).toBe(false)
  })

  it('tab 13 owns safeguarding / emergency contact', () => {
    const tab = HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === 13)!
    const ids = new Set(demoFillQuestionsForDocumentTab(tab, sections).map((x) => x.id))
    expect(ids.has('sg')).toBe(true)
    expect(ids.has('emergency')).toBe(true)
    expect(ids.has('next-review')).toBe(false)
  })

  it('tab 16 includes §14.1 next review and §14.8 assessor name', () => {
    const tab = HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === 16)!
    const ids = new Set(demoFillQuestionsForDocumentTab(tab, sections).map((x) => x.id))
    expect(ids.has('next-review')).toBe(true)
    expect(ids.has('assessor-s14')).toBe(true)
    expect(ids.has('assessor-s1')).toBe(false)
  })
})
