import { describe, expect, it } from 'vitest'
import {
  prefillAcpFromIdentityAnswers,
  syncFallsToMovingHandling,
  syncWaterlowScoreToEquipment,
} from '@/features/service-users/initial-assessment/utils/semantic-cross-tab-sync'
import type { InitialAssessmentSection } from '@/features/service-users/initial-assessment/types'

describe('semantic-cross-tab-sync', () => {
  it('syncs falls Q1 into moving-handling history when empty', () => {
    const next = syncFallsToMovingHandling(
      { consentToSixQuestions: true, q1FallsNeedInvestigating: true },
      { riskFilter: {} },
    )
    expect(next.riskFilter?.historyOfFalls).toBe(true)
  })

  it('does not overwrite existing moving-handling fall history', () => {
    const next = syncFallsToMovingHandling(
      { consentToSixQuestions: true, q1FallsNeedInvestigating: true },
      { riskFilter: { historyOfFalls: false } },
    )
    expect(next.riskFilter?.historyOfFalls).toBe(false)
  })

  it('prefills ACP identity from Tab 1 answers when empty', () => {
    const sections: InitialAssessmentSection[] = [
      {
        id: 's1',
        sectionNumber: 1,
        title: 'Personal',
        description: null,
        sortOrder: 1,
        questions: [
          {
            id: 'fn',
            questionText: 'First name',
            questionType: 'TEXT',
            isRequired: false,
            sortOrder: 1,
            riskFlag: false,
            carePlanTrigger: false,
            metadata: { fieldKey: 'firstName' },
          },
          {
            id: 'ln',
            questionText: 'Last name',
            questionType: 'TEXT',
            isRequired: false,
            sortOrder: 2,
            riskFlag: false,
            carePlanTrigger: false,
            metadata: { fieldKey: 'lastName' },
          },
        ],
      },
    ]
    const next = prefillAcpFromIdentityAnswers(
      sections,
      {
        fn: { questionId: 'fn', textValue: 'Margaret' },
        ln: { questionId: 'ln', textValue: 'Whitfield' },
      },
      {},
    )
    expect(next.patientName).toBe('Margaret Whitfield')
  })

  it('writes waterlow score onto equipment selection when score > 0', () => {
    const next = syncWaterlowScoreToEquipment(
      { gender: 2, age: 4, build: 1, appetite: 1, mobility: 1, continence: 1 },
      {},
    )
    expect(next.waterlowScore).toBeTruthy()
    expect(Number(next.waterlowScore)).toBeGreaterThan(0)
  })

  it('leaves existing equipment score when waterlow has no score', () => {
    expect(syncWaterlowScoreToEquipment(undefined, { waterlowScore: '12' }).waterlowScore).toBe('12')
  })
})
