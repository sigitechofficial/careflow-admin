import { describe, expect, it } from 'vitest'
import { getSubmitValidationIssues } from '@/features/service-users/initial-assessment/utils/submit-validation'
import { DEFAULT_INITIAL_ASSESSMENT_AGENCY_SETTINGS } from '@/features/service-users/initial-assessment/utils/agency-settings-defaults'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

/**
 * Characterisation: QA demo generation must not weaken real submit rules.
 * These assertions encode the current blocking behaviour — do not relax them
 * to make demo data pass.
 */
function q(
  id: string,
  text: string,
  extra: Partial<InitialAssessmentQuestion> & { specRef?: string; fieldKey?: string } = {},
): InitialAssessmentQuestion {
  const { specRef, fieldKey, ...rest } = extra
  return {
    id,
    questionText: text,
    questionType: rest.questionType ?? 'YES_NO',
    isRequired: rest.isRequired ?? true,
    sortOrder: rest.sortOrder ?? 1,
    riskFlag: false,
    carePlanTrigger: false,
    metadata: { specRef, fieldKey },
  }
}

const sections: InitialAssessmentSection[] = [
  {
    id: 's1',
    sectionNumber: 1,
    title: 'S1',
    sortOrder: 1,
    questions: [
      q('assessor-s1', 'Assessor name', {
        questionType: 'TEXT',
        specRef: '1.1',
        fieldKey: 'assessorName',
      }),
    ],
  },
  {
    id: 's3',
    sectionNumber: 3,
    title: 'S3',
    sortOrder: 3,
    questions: [
      q('access', 'Access instructions for staff', {
        questionType: 'TEXTAREA',
        specRef: '3.5',
        fieldKey: 'accessInstructions',
      }),
    ],
  },
  {
    id: 's11',
    sectionNumber: 11,
    title: 'S11',
    sortOrder: 11,
    questions: [
      q('wounds', 'Currently has ulcers or wounds?', { specRef: '11.1', fieldKey: 'hasWounds', isRequired: false }),
      q('wound-assessment', 'Has wound assessment been completed?', { specRef: '11.1' }),
    ],
  },
  {
    id: 's13',
    sectionNumber: 13,
    title: 'S13',
    sortOrder: 13,
    questions: [q('emergency', 'Emergency contact 1 recorded?', { specRef: '13.3' })],
  },
  {
    id: 's14',
    sectionNumber: 14,
    title: 'S14',
    sortOrder: 14,
    questions: [
      q('next-review', 'Next review date', {
        questionType: 'DATE',
        specRef: '14.1',
        fieldKey: 'nextReviewDate',
      }),
      q('assessor-s14', 'Assessor name', {
        questionType: 'TEXT',
        specRef: '14.8',
        fieldKey: 'assessorName',
      }),
    ],
  },
]

function issues(draft: Record<string, InitialAssessmentAnswerInput>, adl?: Parameters<typeof getSubmitValidationIssues>[0]['adl']) {
  return getSubmitValidationIssues({
    sections,
    draftAnswers: draft,
    status: 'DRAFT',
    agencySettings: DEFAULT_INITIAL_ASSESSMENT_AGENCY_SETTINGS,
    adl: adl ?? {
      rows: [],
      fallsAssessmentCompleted: false,
      mobilityAidsRequired: false,
    },
  })
}

describe('submit validation remains unchanged (QA demo must satisfy these rules)', () => {
  it('still blocks wounds = Yes without wound assessment', () => {
    const { blocks } = issues({
      wounds: { questionId: 'wounds', checked: true, booleanValue: true },
    })
    expect(blocks.some((b) => b.message.includes('Active wounds recorded but wound assessment not completed'))).toBe(
      true,
    )
  })

  it('still blocks missing emergency contact', () => {
    const { blocks } = issues({})
    expect(blocks.some((b) => b.message.includes('Emergency contact 1 not recorded'))).toBe(true)
  })

  it('still blocks missing next review date', () => {
    const { blocks } = issues({})
    expect(blocks.some((b) => b.message.includes('Next review date is required'))).toBe(true)
  })

  it('still looks up the first assessorName (section 1) for sign-off', () => {
    const { blocks } = issues({
      'assessor-s14': { questionId: 'assessor-s14', textValue: 'Sarah Thompson' },
    })
    expect(blocks.some((b) => b.message.includes('Assessor sign-off required') && b.sectionNumber === 1)).toBe(true)
  })

  it('still requires access instructions when that question is shown and empty', () => {
    const { blocks } = issues({})
    expect(blocks.some((b) => b.message === 'Required: Access instructions for staff')).toBe(true)
  })
})
