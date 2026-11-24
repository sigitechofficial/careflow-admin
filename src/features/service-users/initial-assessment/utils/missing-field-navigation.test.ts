import { describe, expect, it } from 'vitest'
import type {
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import {
  dedupeIssuesByQuestion,
  fieldIssueInlineLabel,
  issuePanelSelectorForMessage,
  questionIdForValidationMessage,
  validationMessageForDisplay,
} from '@/features/service-users/initial-assessment/utils/missing-field-navigation'

function q(id: string, text: string, metadata?: Record<string, unknown>): InitialAssessmentQuestion {
  return {
    id,
    questionText: text,
    questionType: 'YES_NO',
    isRequired: true,
    sortOrder: 1,
    riskFlag: false,
    carePlanTrigger: false,
    metadata,
  }
}

const sections: InitialAssessmentSection[] = [
  {
    id: 's2',
    sectionNumber: 2,
    title: 'Consent',
    sortOrder: 2,
    questions: [
      q('consent', 'Does the service user consent to this Initial Assessment being carried out?', {
        displayLabel: 'I give my consent for this initial assessment to be carried out',
      }),
    ],
  },
  {
    id: 's13',
    sectionNumber: 13,
    title: 'Safeguarding',
    sortOrder: 13,
    questions: [q('emergency', 'Emergency contact 1 recorded?', { specRef: '13.3' })],
  },
  {
    id: 's14',
    sectionNumber: 14,
    title: 'Sign-off',
    sortOrder: 14,
    questions: [
      q('assessor', 'Assessor name', { fieldKey: 'assessorName', displayLabel: 'Assessor Name' }),
      q('review', 'Next review date', { fieldKey: 'nextReviewDate' }),
    ],
  },
]

describe('missing-field-navigation', () => {
  it('finds the question from the stored text (server) or the on-screen label (browser check)', () => {
    expect(
      questionIdForValidationMessage(
        'Required: Does the service user consent to this Initial Assessment being carried out?',
        sections,
      ),
    ).toBe('consent')
    expect(
      questionIdForValidationMessage('Required: I give my consent for this initial assessment to be carried out', sections),
    ).toBe('consent')
    expect(questionIdForValidationMessage('Assessor sign-off required: Assessor Name', sections)).toBe('assessor')
  })

  it('maps question-specific issues that do not quote the question', () => {
    expect(questionIdForValidationMessage('Emergency contact 1 not recorded (section 13)', sections)).toBe('emergency')
    expect(questionIdForValidationMessage('Next review date is required (section 14)', sections)).toBe('review')
    expect(questionIdForValidationMessage('ADL dependency scores incomplete — score all activities', sections)).toBeNull()
  })

  it('shows field issues with the form wording and leaves other messages alone', () => {
    expect(
      validationMessageForDisplay(
        'Required: Does the service user consent to this Initial Assessment being carried out?',
        sections,
      ),
    ).toBe('Required: I give my consent for this initial assessment to be carried out')
    expect(validationMessageForDisplay('Emergency contact 1 not recorded (section 13)', sections)).toBe(
      'Emergency contact 1 not recorded (section 13)',
    )
  })

  it('labels inline errors', () => {
    expect(fieldIssueInlineLabel('Assessor sign-off required: Assessor Name')).toBe('Sign-off required')
    expect(fieldIssueInlineLabel('Required: Assessor name')).toBe('Required')
  })

  it('points worksheet issues at their panel', () => {
    expect(issuePanelSelectorForMessage('ADL dependency scores incomplete — score all')).toBe(
      '[data-testid="ia-adl-worksheet"]',
    )
    expect(issuePanelSelectorForMessage('Agreed goals: add at least one goal agreed with the person')).toBe(
      '[data-testid="ia-agreed-goals"]',
    )
    expect(issuePanelSelectorForMessage('Required: Assessor name')).toBeNull()
  })

  it('keeps one entry per question, preferring a must-fix one', () => {
    const issues = [
      { message: 'Emergency contact 1 not recorded (section 13)', mustFix: false },
      { message: 'Assessor sign-off required: Assessor Name', mustFix: false },
      { message: 'Required: Assessor name', mustFix: false },
      { message: 'Required: Emergency contact 1 recorded?', mustFix: true },
      { message: 'ADL dependency scores incomplete', mustFix: false },
    ]
    const result = dedupeIssuesByQuestion(issues, sections, (i) => i.mustFix)
    expect(result.map((i) => i.message)).toEqual([
      'Required: Emergency contact 1 recorded?',
      'Assessor sign-off required: Assessor Name',
      'ADL dependency scores incomplete',
    ])
  })
})
