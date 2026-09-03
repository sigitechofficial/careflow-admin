import { describe, expect, it } from 'vitest'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import {
  iaAssessorNameDesignation,
  nrsScoreForSection53,
  painOrDistressIdentified,
  recommendedPainScale,
  stampPainAssessmentCompletion,
  syncPainAssessmentAnswers,
} from '@/features/service-users/initial-assessment/utils/pain-questions'
import { isPainAssessmentComplete } from '@/features/service-users/initial-assessment/utils/pain-assessment-scoring'

function q(
  id: string,
  questionText: string,
  extras: Partial<InitialAssessmentQuestion> = {},
): InitialAssessmentQuestion {
  return {
    id,
    questionText,
    questionType: extras.questionType ?? 'YES_NO',
    isRequired: false,
    sortOrder: 1,
    riskFlag: false,
    carePlanTrigger: false,
    metadata: extras.metadata ?? { specRef: '5.3' },
    ...extras,
  }
}

function section(questions: InitialAssessmentQuestion[]): InitialAssessmentSection[] {
  return [{ id: 's', sectionNumber: 1, title: 'Test', sortOrder: 1, questions }]
}

const abbey11 = {
  vocalisation: 2 as const,
  facialExpression: 2 as const,
  bodyLanguage: 2 as const,
  behaviouralChange: 2 as const,
  physiologicalChange: 2 as const,
  physicalChanges: 1 as const,
}

describe('pain §5.3 sync and completeness', () => {
  it('NRS 4 → §5.3 Pain score (0-10) = 4', () => {
    const sections = section([q('score', 'Pain score (0-10)', { questionType: 'NUMBER' })])
    const patches: Record<string, InitialAssessmentAnswerInput> = {}
    syncPainAssessmentAnswers(sections, { nrsScore: 4 }, (id, patch) => {
      patches[id] = patch
    })
    expect(patches.score.numberValue).toBe(4)
  })

  it('NRS 0 → §5.3 Pain score (0-10) = 0; Abbey still does not fill NRS', () => {
    const sections = section([q('score', 'Pain score (0-10)', { questionType: 'NUMBER' })])
    const patches: Record<string, InitialAssessmentAnswerInput> = {}
    syncPainAssessmentAnswers(sections, { nrsScore: 0 }, (id, patch) => {
      patches[id] = patch
    })
    expect(patches.score.numberValue).toBe(0)
    expect(nrsScoreForSection53({ nrsScore: 0 })).toBe(0)
    expect(nrsScoreForSection53({ abbey: abbey11 })).toBeUndefined()
  })

  it('Abbey 11 MUST NOT populate NRS 0–10', () => {
    const sections = section([q('score', 'Pain score (0-10)', { questionType: 'NUMBER' })])
    const patches: Record<string, InitialAssessmentAnswerInput> = {}
    syncPainAssessmentAnswers(sections, { abbey: abbey11 }, (id, patch) => {
      patches[id] = patch
    })
    expect(patches.score).toBeUndefined()
    expect(nrsScoreForSection53({ abbey: abbey11 })).toBeUndefined()
  })

  it('Abbey complete → pain assessment completed = Yes', () => {
    const sections = section([q('done', 'Pain assessment completed?')])
    const patches: Record<string, InitialAssessmentAnswerInput> = {}
    syncPainAssessmentAnswers(sections, { abbey: abbey11 }, (id, patch) => {
      patches[id] = patch
    })
    expect(patches.done.booleanValue).toBe(true)
    expect(isPainAssessmentComplete({ abbey: abbey11 })).toBe(true)
  })

  it('Abbey moderate/severe → pain identified = Yes', () => {
    const sections = section([q('id', 'Pain or distress identified?')])
    const patches: Record<string, InitialAssessmentAnswerInput> = {}
    syncPainAssessmentAnswers(sections, { abbey: abbey11 }, (id, patch) => {
      patches[id] = patch
    })
    expect(patches.id.booleanValue).toBe(true)
    expect(painOrDistressIdentified({ abbey: abbey11 })).toBe(true)
  })

  it('all-zero Abbey is complete and is not identified pain', () => {
    const zero = {
      vocalisation: 0 as const,
      facialExpression: 0 as const,
      bodyLanguage: 0 as const,
      behaviouralChange: 0 as const,
      physiologicalChange: 0 as const,
      physicalChanges: 0 as const,
    }
    expect(isPainAssessmentComplete({ abbey: zero })).toBe(true)
    expect(painOrDistressIdentified({ abbey: zero })).toBe(false)
  })
})

describe('scale recommendation from existing IA answers', () => {
  it('prefers Abbey when cognitive impairment is not none', () => {
    const sections = section([
      q('cog', 'Cognitive impairment level', {
        questionType: 'SINGLE_SELECT',
        metadata: { specRef: '10.6', fieldKey: 'cognitiveImpairment' },
      }),
    ])
    expect(recommendedPainScale(sections, { cog: { selectedOptions: 'moderate' } })).toBe('abbey')
    expect(recommendedPainScale(sections, { cog: { selectedOptions: 'none' } })).toBe('nrs')
  })

  it('prefers Abbey when diagnosed dementia is Yes', () => {
    const sections = section([q('dem', 'Diagnosed dementia?', { metadata: { specRef: '10.6a' } })])
    expect(recommendedPainScale(sections, { dem: { booleanValue: true, checked: true } })).toBe(
      'abbey',
    )
  })

  it('prefers Abbey when speech impairment is Yes', () => {
    const sections = section([
      q('sp', 'Speech impairment or concern?', { metadata: { specRef: '8.1' } }),
    ])
    expect(recommendedPainScale(sections, { sp: { booleanValue: true, checked: true } })).toBe(
      'abbey',
    )
  })

  it('prefers NRS otherwise', () => {
    expect(recommendedPainScale(section([]), {})).toBe('nrs')
  })
})

describe('date and assessor stamping', () => {
  it('does not stamp Abbey date/assessor from NRS-only completion', () => {
    const stamped = stampPainAssessmentCompletion(
      { nrsScore: 4 },
      { dateCompleted: '2026-09-02', assessorNameDesignation: 'Jane — RM' },
    )
    expect(stamped.abbey?.dateCompleted).toBeUndefined()
    expect(stamped.abbey?.assessorNameDesignation).toBeUndefined()
  })

  it('stamps from IA context when Abbey is complete and does not overwrite existing values', () => {
    const stamped = stampPainAssessmentCompletion(
      { abbey: abbey11 },
      { dateCompleted: '2026-09-02', assessorNameDesignation: 'Jane — RM' },
    )
    expect(stamped.abbey?.dateCompleted).toBe('2026-09-02')
    expect(stamped.abbey?.assessorNameDesignation).toBe('Jane — RM')

    const kept = stampPainAssessmentCompletion(
      {
        nrsScore: 4,
        abbey: { ...abbey11, dateCompleted: '2026-01-01', assessorNameDesignation: 'Existing — RN' },
      },
      { dateCompleted: '2026-09-02', assessorNameDesignation: 'Jane — RM' },
    )
    expect(kept.abbey?.dateCompleted).toBe('2026-01-01')
    expect(kept.abbey?.assessorNameDesignation).toBe('Existing — RN')
  })

  it('reads assessor name and designation from existing IA questions', () => {
    const sections = section([
      q('n', 'Assessor name', {
        questionType: 'TEXT',
        metadata: { specRef: '1.1', fieldKey: 'assessorName' },
      }),
      q('d', 'Assessor designation', {
        questionType: 'TEXT',
        metadata: { specRef: '1.1', fieldKey: 'assessorDesignation' },
      }),
    ])
    expect(
      iaAssessorNameDesignation(sections, {
        n: { textValue: 'Sarah Thompson' },
        d: { textValue: 'Registered Manager' },
      }),
    ).toBe('Sarah Thompson — Registered Manager')
  })
})
