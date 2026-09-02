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
  it('tab 1 includes §1 assessorName and same-tab diabetes follow-up, not fire or environment manage-home', () => {
    const tab = HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === 1)!
    const ids = new Set(demoFillQuestionsForDocumentTab(tab, sections).map((x) => x.id))
    expect(ids.has('manage')).toBe(false)
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

  it('tab 12 owns remaining §3 template questions including manage-home and lone worker', () => {
    const tab = HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === 12)!
    const ids = new Set(demoFillQuestionsForDocumentTab(tab, sections).map((x) => x.id))
    expect(ids.has('lone')).toBe(true)
    expect(ids.has('access')).toBe(true)
    expect(ids.has('manage')).toBe(true)
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

  it('tab 21 owns infection precautions and tab 22 owns fire safety', () => {
    const infection: InitialAssessmentSection = {
      id: 's15',
      sectionNumber: 15,
      title: 'Infection',
      sortOrder: 15,
      questions: [q('infection', 'Are infection control precautions required?', '15.1', {
        metadata: { specRef: '15.1', fieldKey: 'infectionPrecautionsRequired' },
      })],
    }
    const fire: InitialAssessmentSection = {
      id: 's18',
      sectionNumber: 18,
      title: 'Fire Safety',
      sortOrder: 18,
      questions: [q('fire', 'Any fire safety risks identified?', '18.1', {
        metadata: { specRef: '18.1', fieldKey: 'fireSafetyRisksIdentified' },
      })],
    }
    const withPhase1 = [...sections, infection, fire]
    const tab21 = HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === 21)!
    const tab22 = HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === 22)!
    expect(demoFillQuestionsForDocumentTab(tab21, withPhase1).map((x) => x.id)).toContain('infection')
    expect(demoFillQuestionsForDocumentTab(tab22, withPhase1).map((x) => x.id)).toContain('fire')
    expect(demoFillQuestionsForDocumentTab(tab21, withPhase1).map((x) => x.id)).not.toContain('fire')
  })

  it('tab 19 owns PEEP and tab 20 owns Bed Rails', () => {
    const peep: InitialAssessmentSection = {
      id: 's16',
      sectionNumber: 16,
      title: 'PEEP',
      sortOrder: 16,
      questions: [
        q('self-evac', 'Can the person self-evacuate in an emergency?', '16.1', {
          metadata: { specRef: '16.1', fieldKey: 'canSelfEvacuate' },
        }),
      ],
    }
    const rails: InitialAssessmentSection = {
      id: 's17',
      sectionNumber: 17,
      title: 'Bed Rails',
      sortOrder: 17,
      questions: [
        q('rails', 'Are bed rails in use or being considered?', '17.1', {
          metadata: { specRef: '17.1', fieldKey: 'bedRailsInUseOrConsidered' },
        }),
      ],
    }
    const withPhase2 = [...sections, peep, rails]
    const tab19 = HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === 19)!
    const tab20 = HOLISTIC_ASSESSMENT_TABS.find((t) => t.id === 20)!
    expect(demoFillQuestionsForDocumentTab(tab19, withPhase2).map((x) => x.id)).toContain('self-evac')
    expect(demoFillQuestionsForDocumentTab(tab20, withPhase2).map((x) => x.id)).toContain('rails')
    expect(demoFillQuestionsForDocumentTab(tab19, withPhase2).map((x) => x.id)).not.toContain('rails')
  })
})
