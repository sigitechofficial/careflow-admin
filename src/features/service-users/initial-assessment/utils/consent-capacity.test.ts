import { describe, expect, it } from 'vitest'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import {
  consentGiver,
  consentRefusalRoute,
  hasLegalDecisionMaker,
  isCapacityInDoubt,
  understandingInDoubt,
} from '@/features/service-users/initial-assessment/utils/consent-capacity'

function q(
  id: string,
  questionType: InitialAssessmentQuestion['questionType'],
  metadata: Record<string, unknown>,
): InitialAssessmentQuestion {
  return {
    id,
    questionText: id,
    questionType,
    isRequired: true,
    sortOrder: 1,
    riskFlag: false,
    carePlanTrigger: false,
    metadata,
  }
}

const section = (questions: InitialAssessmentQuestion[]): InitialAssessmentSection[] => [
  { id: 's2', sectionNumber: 2, title: 'Consent', description: null, sortOrder: 2, questions },
]

const current = section([
  q('doubt', 'YES_NO', { specRef: '2.4', fieldKey: 'capacityDoubt' }),
  q('legal', 'SINGLE_SELECT', { specRef: '2.4', fieldKey: 'legalAuthority' }),
  q('understands', 'SINGLE_SELECT', { specRef: '2.3', fieldKey: 'understandsAssessmentInfo' }),
])

const withMca = section([
  q('doubt', 'YES_NO', { specRef: '2.4', fieldKey: 'capacityDoubt' }),
  q('legal', 'SINGLE_SELECT', { specRef: '2.4', fieldKey: 'legalAuthority' }),
  q('consent', 'YES_NO', { specRef: '2.1', fieldKey: 'consentToAssessment' }),
  q('outcome', 'SINGLE_SELECT', { specRef: '2.mca', fieldKey: 'mcaScreeningOutcome' }),
  q('bi', 'YES_NO', { specRef: '2.6', fieldKey: 'bestInterestDecisionRequired' }),
  q('biDetails', 'TEXTAREA', { specRef: '2.6', fieldKey: 'bestInterestDecisionDetails' }),
])

const yn = (id: string, value: boolean): InitialAssessmentAnswerInput => ({ questionId: id, checked: value, booleanValue: value })
const sel = (id: string, value: string): InitialAssessmentAnswerInput => ({ questionId: id, selectedOptions: [value] })

describe('isCapacityInDoubt', () => {
  it('Yes on "reason to doubt capacity?" means doubt', () => {
    expect(isCapacityInDoubt(current, { doubt: yn('doubt', true) })).toBe(true)
    expect(isCapacityInDoubt(current, { doubt: yn('doubt', false) })).toBe(false)
    expect(isCapacityInDoubt(current, {})).toBe(false)
  })

  it('reads the older "capacity appears intact?" question the other way round', () => {
    const legacy = section([q('intact', 'YES_NO', { specRef: '2.4' })])
    expect(isCapacityInDoubt(legacy, { intact: yn('intact', false) })).toBe(true)
    expect(isCapacityInDoubt(legacy, { intact: yn('intact', true) })).toBe(false)
  })
})

describe('consentGiver', () => {
  it('is the service user when there is no reason to doubt capacity (even with an LPA)', () => {
    expect(consentGiver(current, { doubt: yn('doubt', false), legal: sel('legal', 'hw_lpa') })).toBe('service_user')
  })

  it('waits for the capacity assessment when capacity is only in doubt', () => {
    expect(consentGiver(withMca, { doubt: yn('doubt', true), legal: sel('legal', 'hw_lpa') })).toBe(
      'capacity_to_be_assessed',
    )
  })

  it('stays with the person when the assessment finds capacity', () => {
    expect(
      consentGiver(withMca, {
        doubt: yn('doubt', true),
        legal: sel('legal', 'hw_lpa'),
        outcome: sel('outcome', 'has_capacity'),
      }),
    ).toBe('service_user')
  })

  it.each([
    ['hw_lpa', 'lpa'],
    ['deputy', 'deputy'],
    ['court_order_other', 'court_order'],
    ['no', 'best_interest'],
    ['unsure', 'best_interest'],
  ])('lacks capacity + %s → %s', (authority, expected) => {
    expect(
      consentGiver(withMca, {
        doubt: yn('doubt', true),
        legal: sel('legal', authority),
        outcome: sel('outcome', 'lacks_capacity'),
      }),
    ).toBe(expected)
  })
})

describe('consentRefusalRoute', () => {
  const refused = { consent: yn('consent', false) }
  it('a refusal with capacity stands', () => {
    expect(consentRefusalRoute(withMca, { ...refused, doubt: yn('doubt', false) }, true)).toBe('refusal_stands')
  })

  it('capacity in doubt is not enough — the assessment and best interests are needed', () => {
    expect(consentRefusalRoute(withMca, { ...refused, doubt: yn('doubt', true) }, true)).toBe(
      'needs_capacity_and_best_interests',
    )
    expect(
      consentRefusalRoute(
        withMca,
        { ...refused, doubt: yn('doubt', true), outcome: sel('outcome', 'lacks_capacity') },
        true,
      ),
    ).toBe('needs_capacity_and_best_interests')
  })

  it('goes on to manager review only with a best-interests record (wishes / objection) or an authority', () => {
    const base = { ...refused, doubt: yn('doubt', true), outcome: sel('outcome', 'lacks_capacity') }
    expect(
      consentRefusalRoute(
        withMca,
        { ...base, bi: yn('bi', true), biDetails: { questionId: 'biDetails', textValue: 'Objects to visits; weighed…' } },
        true,
      ),
    ).toBe('proceed_with_manager_review')
    expect(consentRefusalRoute(withMca, { ...base, legal: sel('legal', 'hw_lpa') }, true)).toBe(
      'proceed_with_manager_review',
    )
  })

  it('a decision-specific record for the refused decision replaces the global screening', () => {
    const doubt = { ...refused, doubt: yn('doubt', true) }
    const record = {
      id: 'r1',
      decision: 'consent_to_assessment' as const,
      outcome: 'has_capacity' as const,
    }
    // Has capacity for this decision → the refusal stands, even though capacity was in doubt.
    expect(consentRefusalRoute(withMca, doubt, true, record)).toBe('refusal_stands')
    // Lacks capacity, no best-interests decision yet → still blocked (never "refusal ignored").
    expect(
      consentRefusalRoute(withMca, doubt, true, { ...record, outcome: 'lacks_capacity', authorityCovers: 'no' }),
    ).toBe('needs_capacity_and_best_interests')
    expect(
      consentRefusalRoute(withMca, doubt, true, {
        ...record,
        outcome: 'lacks_capacity',
        authorityCovers: 'no',
        bestInterestsOutcome: 'Assessment with daughter present; stop if distressed',
      }),
    ).toBe('proceed_with_manager_review')
  })
})

describe('flags', () => {
  it('understanding No / Unsure is flagged, Yes is not', () => {
    expect(understandingInDoubt(current, { understands: sel('understands', 'no') })).toBe(true)
    expect(understandingInDoubt(current, { understands: sel('understands', 'unsure') })).toBe(true)
    expect(understandingInDoubt(current, { understands: sel('understands', 'yes') })).toBe(false)
  })

  it('a named LPA / deputy / court order counts as a decision maker; No / Unsure do not', () => {
    expect(hasLegalDecisionMaker(current, { legal: sel('legal', 'deputy') })).toBe(true)
    expect(hasLegalDecisionMaker(current, { legal: sel('legal', 'unsure') })).toBe(false)
  })
})
