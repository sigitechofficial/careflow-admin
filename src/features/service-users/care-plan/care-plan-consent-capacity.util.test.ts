import { describe, expect, it } from 'vitest'
import type { InitialAssessmentAnswer } from '@/features/service-users/initial-assessment/types'
import {
  applyManualConsentRecords,
  draftConsentMetaDoesNotContainIaIds,
  manualConsentRecordsFromDraft,
  mapIaConsentCapacityForCarePlan,
} from '@/features/service-users/care-plan/care-plan-consent-capacity.util'
import {
  parseConsentRecords,
  type CarePlanConsentRecord,
} from '@/features/service-users/care-plan/care-plan-consent-meta'

function iaAnswer(
  partial: Partial<InitialAssessmentAnswer> &
    Pick<InitialAssessmentAnswer, 'id' | 'questionId'> & {
      questionText: string
      questionType?: string
      specRef?: string
      fieldKey?: string
    },
): InitialAssessmentAnswer {
  const {
    questionText,
    questionType = 'YES_NO',
    specRef,
    fieldKey,
    ...rest
  } = partial
  return {
    checked: null,
    booleanValue: null,
    textValue: null,
    numberValue: null,
    dateValue: null,
    timeValue: null,
    selectedOptions: null,
    notes: null,
    riskFlag: false,
    carePlanTrigger: false,
    question: {
      id: rest.questionId,
      questionText,
      questionType: questionType as 'YES_NO',
      riskFlag: false,
      carePlanTrigger: false,
      metadata: {
        ...(specRef ? { specRef } : {}),
        ...(fieldKey ? { fieldKey } : {}),
      },
    },
    ...rest,
  }
}

describe('mapIaConsentCapacityForCarePlan', () => {
  it('displays consent status, capacity outcome, relevant info, and source line', () => {
    const answers = [
      iaAnswer({
        id: 'a-consent-assess',
        questionId: 'q-2.1',
        questionText: 'Has the Service User consented to this assessment?',
        specRef: '2.1',
        booleanValue: true,
      }),
      iaAnswer({
        id: 'a-consent-care',
        questionId: 'q-2.2',
        questionText: 'Has the Service User consented to receive care and support?',
        specRef: '2.2',
        booleanValue: true,
      }),
      iaAnswer({
        id: 'a-given-by',
        questionId: 'q-given',
        questionText: 'Consent given by',
        questionType: 'SINGLE_SELECT',
        specRef: '2.1',
        fieldKey: 'consentGivenBy',
        selectedOptions: ['service_user'],
      }),
      iaAnswer({
        id: 'a-capacity',
        questionId: 'q-2.4',
        questionText: 'Capacity to consent to assessment appears intact?',
        specRef: '2.4',
        booleanValue: true,
      }),
      iaAnswer({
        id: 'a-share-gp',
        questionId: 'q-gp',
        questionText: 'Consent to share with GP',
        specRef: '2.8',
        booleanValue: true,
      }),
      iaAnswer({
        id: 'a-mca-outcome',
        questionId: 'q-mca-out',
        questionText: 'Outcome of the mental capacity screening tool',
        questionType: 'SINGLE_SELECT',
        fieldKey: 'mcaScreeningOutcome',
        selectedOptions: ['has_capacity'],
      }),
    ]

    const display = mapIaConsentCapacityForCarePlan(answers, {
      submittedAt: '2026-08-20T10:00:00.000Z',
      submissionMetadata: {
        mentalCapacityChecklist: {
          assessmentType: 'preliminary',
          impairmentAnswer: false,
          unableKeyDecisionAnswer: false,
          assessorName: 'A. Nurse',
          assessorDate: '2026-08-19',
        },
      },
    })

    expect(display.hasContent).toBe(true)
    expect(display.consentStatus).toBe('Consented to assessment and care')
    expect(display.mentalCapacityOutcome).toMatch(/has capacity/i)
    expect(display.mcaSummary).toMatch(/preliminary/i)
    expect(display.relevantInformation.some((i) => i.label === 'Consent given by' && i.value === 'Service User')).toBe(true)
    expect(display.relevantInformation.some((i) => i.label === 'Consent to share with GP')).toBe(
      true,
    )
    expect(display.assessmentDateLabel).toBeTruthy()
    expect(display.source).toBe('initial_assessment')
    expect(display.sourceLabel).toMatch(/^Source: Initial Assessment/)
  })

  it('returns empty-ish display when IA has no consent answers', () => {
    const display = mapIaConsentCapacityForCarePlan([], { submittedAt: null })
    expect(display.hasContent).toBe(false)
    expect(display.consentStatus).toBeNull()
    expect(display.mentalCapacityOutcome).toBeNull()
    expect(display.relevantInformation).toEqual([])
  })

  it('uses checklist when screening outcome is absent', () => {
    const display = mapIaConsentCapacityForCarePlan([], {
      submissionMetadata: {
        mentalCapacityChecklist: {
          assessmentType: 'review',
          impairmentAnswer: true,
          unableKeyDecisionAnswer: true,
        },
      },
    })
    expect(display.mentalCapacityOutcome).toMatch(/further mental capacity assessment/i)
    expect(display.mcaSummary).toMatch(/detailed assessment indicated/i)
    expect(display.hasContent).toBe(true)
  })
})

describe('manual consent records + IA isolation', () => {
  it('saves manual consent records into __meta.consentRecords without IA ids', () => {
    const iaIds = new Set(['a-consent-assess', 'a-capacity', 'q-2.1'])
    const manual: CarePlanConsentRecord[] = [
      {
        id: 'manual-consent-1',
        categoryId: '1',
        reason: 'Day-to-day personal care',
        dateCreated: '25/08/2026 10:00',
        status: 'Open',
        outcome: 'Agreed',
        recordedBy: 'Staff',
      },
    ]

    const draft = applyManualConsentRecords({}, manual)
    expect(parseConsentRecords(draft)).toEqual(manual)
    expect(manualConsentRecordsFromDraft(draft)).toHaveLength(1)
    expect(draftConsentMetaDoesNotContainIaIds(draft, iaIds)).toBe(true)

    // Mapping IA does not mutate draft
    const before = JSON.stringify(draft)
    mapIaConsentCapacityForCarePlan([
      iaAnswer({
        id: 'a-consent-assess',
        questionId: 'q-2.1',
        questionText: 'Has the Service User consented to this assessment?',
        specRef: '2.1',
        booleanValue: true,
      }),
    ])
    expect(JSON.stringify(draft)).toBe(before)
  })

  it('detects when an IA id was incorrectly written into consentRecords', () => {
    const draft = applyManualConsentRecords({}, [
      {
        id: 'a-consent-assess',
        categoryId: '1',
        reason: 'Wrongly copied from IA',
        dateCreated: '25/08/2026 10:00',
        status: 'Open',
        outcome: '',
        recordedBy: 'Staff',
      },
    ])
    expect(draftConsentMetaDoesNotContainIaIds(draft, new Set(['a-consent-assess']))).toBe(false)
  })
})
