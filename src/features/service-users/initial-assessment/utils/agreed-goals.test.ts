import { describe, expect, it } from 'vitest'
import {
  AGREED_GOALS_MAX,
  hasAgreedGoal,
  normalizeAgreedGoalsMetadata,
  prefillFirstGoalFromSupportGoals,
} from '@/features/service-users/initial-assessment/utils/agreed-goals'
import { getSubmitValidationIssues } from '@/features/service-users/initial-assessment/utils/submit-validation'

describe('agreed goals', () => {
  it('needs at least one written goal', () => {
    expect(hasAgreedGoal({ goals: [] })).toBe(false)
    expect(hasAgreedGoal({ goals: [{ goal: '  ' }] })).toBe(false)
    expect(hasAgreedGoal({ goals: [{ goal: 'Wash and dress myself' }] })).toBe(true)
  })

  it('normalises stored data and caps the list', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ goal: `g${i}`, outcomeArea: 1 }))
    const out = normalizeAgreedGoalsMetadata({ goals: many })
    expect(out.goals).toHaveLength(AGREED_GOALS_MAX)
    expect(out.goals?.[0]).toEqual({ id: 'goal-1', goal: 'g0', outcomeArea: undefined, measure: undefined, targetDate: undefined })
    expect(normalizeAgreedGoalsMetadata(null)).toEqual({ goals: [] })
  })

  it('starts goal #1 from the §1.3 support goals text (HTML stripped), only when empty', () => {
    expect(prefillFirstGoalFromSupportGoals({ goals: [] }, '<p>Stay at home &amp; see Sarah</p>')).toEqual({
      goals: [{ id: 'goal-1', goal: 'Stay at home & see Sarah' }],
    })
    const existing = { goals: [{ goal: 'Mine' }] }
    expect(prefillFirstGoalFromSupportGoals(existing, 'other')).toBe(existing)
    const empty = { goals: [] }
    expect(prefillFirstGoalFromSupportGoals(empty, '   ')).toBe(empty)
  })

  it('adds a skippable submit block until a goal is agreed', () => {
    const noGoal = getSubmitValidationIssues({
      sections: [],
      draftAnswers: {},
      status: 'IN_PROGRESS',
      agreedGoals: { goals: [] },
    })
    const block = noGoal.blocks.find((b) => b.message.startsWith('Agreed goals:'))
    expect(block?.sectionNumber).toBe(14)
    const withGoal = getSubmitValidationIssues({
      sections: [],
      draftAnswers: {},
      status: 'IN_PROGRESS',
      agreedGoals: { goals: [{ goal: 'Walk to the shop' }] },
    })
    expect(withGoal.blocks.some((b) => b.message.startsWith('Agreed goals:'))).toBe(false)
  })
})
