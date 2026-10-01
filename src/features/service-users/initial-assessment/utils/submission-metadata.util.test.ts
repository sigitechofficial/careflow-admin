import { describe, expect, it } from 'vitest'
import { normalizeSectionComments } from '@/features/service-users/initial-assessment/utils/submission-metadata'

describe('normalizeSectionComments', () => {
  it('maps legacy enterprise section keys to the tab that now holds that section', () => {
    const result = normalizeSectionComments({
      '14': 'Shared legacy review / sign-off note',
    })
    // §14 review & sign-off lives on the final tab (id 16).
    expect(result['16']?.text).toBe('Shared legacy review / sign-off note')
    expect(result['15']).toBeUndefined()
  })

  it('shows a retired Photography Consent (18) comment on the Consent tab (23)', () => {
    const result = normalizeSectionComments({ '18': 'Photo consent note' })
    expect(result['23']?.text).toBe('Photo consent note')
    expect(result['18']).toBeUndefined()
  })

  it('prefers a comment saved on the Consent tab over the retired alias', () => {
    const result = normalizeSectionComments({ '18': 'Old photo note', '23': 'New consent note' })
    expect(result['23']?.text).toBe('New consent note')
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
