import { describe, expect, it } from 'vitest'
import type { InitialAssessmentSection } from '@/features/service-users/initial-assessment/types'
import {
  movingHandlingUsesHoist,
  syncHoistFromMovingHandling,
} from '@/features/service-users/initial-assessment/utils/sync-hoist-from-moving-handling'

const sections = [
  {
    id: 's12',
    sectionNumber: 12,
    title: 'Mobility',
    questions: [
      {
        id: 'hoist-q',
        questionText: 'Uses hoist or sling?',
        questionType: 'YES_NO',
        sortOrder: 1,
        isRequired: false,
        metadata: { specRef: '12.5a', fieldKey: 'usesHoistOrSling' },
      },
    ],
  },
] as unknown as InitialAssessmentSection[]

describe('movingHandlingUsesHoist', () => {
  it('is undefined until a task is recorded', () => {
    expect(movingHandlingUsesHoist(undefined)).toBeUndefined()
    expect(movingHandlingUsesHoist({ tasks: {} })).toBeUndefined()
  })

  it('reports hoist use from recorded tasks', () => {
    expect(movingHandlingUsesHoist({ tasks: { walking: { capability: 'independent' } } })).toBe(false)
    expect(movingHandlingUsesHoist({ tasks: { moveUpBed: { methods: ['hoist'] } } })).toBe(true)
  })
})

describe('syncHoistFromMovingHandling', () => {
  it('never overwrites a legacy answer before the worksheet is started', () => {
    const answers = { 'hoist-q': { questionId: 'hoist-q', checked: true, booleanValue: true } }
    expect(syncHoistFromMovingHandling(sections, answers, {})).toBe(answers)
  })

  it('derives the answer once tasks exist', () => {
    const next = syncHoistFromMovingHandling(sections, {}, { tasks: { toileting: { methods: ['hoist'] } } })
    expect(next['hoist-q']?.booleanValue).toBe(true)
  })
})

describe('movingHandlingNeedsTransferSupport', () => {
  it('is undefined until transfers are recorded', async () => {
    const { movingHandlingNeedsTransferSupport } = await import(
      '@/features/service-users/initial-assessment/utils/sync-hoist-from-moving-handling'
    )
    expect(movingHandlingNeedsTransferSupport({ tasks: { walking: { capability: 'assistance' } } })).toBeUndefined()
    expect(movingHandlingNeedsTransferSupport({ tasks: { toileting: { capability: 'assistance' } } })).toBe(true)
    expect(movingHandlingNeedsTransferSupport({ riskFilter: { totallyIndependentLowRisk: true } })).toBe(false)
  })
})
