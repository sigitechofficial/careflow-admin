import { describe, expect, it } from 'vitest'
import { mergeSpecRefGroups, type SpecRefGroup } from '@/features/service-users/initial-assessment/utils/spec-ref-groups'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

function q(id: string, specRef: string, sortOrder: number): InitialAssessmentQuestion {
  return {
    id,
    questionText: id,
    questionType: 'YES_NO',
    isRequired: false,
    sortOrder,
    riskFlag: false,
    carePlanTrigger: false,
    metadata: { specRef },
  }
}

describe('mergeSpecRefGroups', () => {
  it('merges non-adjacent groups with the same specRef', () => {
    const groups: SpecRefGroup[] = [
      { specRef: '12.5a', label: '12.5a', questions: [q('a1', '12.5a', 1)] },
      { specRef: '12.5b', label: '12.5b', questions: [q('b1', '12.5b', 2)] },
      { specRef: '12.5a', label: '12.5a', questions: [q('a2', '12.5a', 3)] },
    ]
    const merged = mergeSpecRefGroups(groups)
    expect(merged).toHaveLength(2)
    expect(merged[0]!.specRef).toBe('12.5a')
    expect(merged[0]!.questions.map((x) => x.id)).toEqual(['a1', 'a2'])
  })
})
