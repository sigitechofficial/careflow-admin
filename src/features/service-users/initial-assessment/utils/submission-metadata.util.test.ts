import { describe, expect, it } from 'vitest'
import { normalizeSectionComments } from '@/features/service-users/initial-assessment/utils/submission-metadata'

describe('normalizeSectionComments', () => {
  it('maps legacy enterprise section keys to the first holistic tab for that section', () => {
    const result = normalizeSectionComments({
      '14': 'Shared legacy outcome summary',
    })
    expect(result['15']?.text).toBe('Shared legacy outcome summary')
    expect(result['16']).toBeUndefined()
  })

  it('keeps holistic tab keys when metadata is tab-keyed', () => {
    const result = normalizeSectionComments({
      '15': 'Outcome summary tab',
      '16': 'Care plan tab',
    })
    expect(result['15']?.text).toBe('Outcome summary tab')
    expect(result['16']?.text).toBe('Care plan tab')
  })
})
