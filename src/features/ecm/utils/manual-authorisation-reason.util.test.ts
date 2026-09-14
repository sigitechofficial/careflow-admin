import {
  canSubmitManualAuthorisation,
  sortManualAuthorisationReasons,
} from './manual-authorisation-reason.util'

describe('manual-authorisation-reason.util', () => {
  it('requires a selected reason', () => {
    expect(canSubmitManualAuthorisation(null, 'anything')).toBe(false)
  })

  it('allows a predefined reason without extra text', () => {
    expect(canSubmitManualAuthorisation({ requiresNotes: false }, '')).toBe(true)
  })

  it('requires typed text for Other reason', () => {
    expect(canSubmitManualAuthorisation({ requiresNotes: true }, '  ')).toBe(false)
    expect(canSubmitManualAuthorisation({ requiresNotes: true }, 'Wait at the gate')).toBe(
      true,
    )
  })

  it('keeps Other last among chips', () => {
    const sorted = sortManualAuthorisationReasons([
      { code: 'OTHER', sortOrder: 99, label: 'Other reason' },
      { code: 'GPS', sortOrder: 10, label: 'GPS not working' },
    ])
    expect(sorted.map(r => r.code)).toEqual(['GPS', 'OTHER'])
  })
})
