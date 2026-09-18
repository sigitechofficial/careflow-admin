import { describe, expect, it } from 'vitest'
import { canSubmitManualReject, MANUAL_REJECT_REASONS } from './manual-reject-reason.util'

describe('canSubmitManualReject', () => {
  it('requires a chip first', () => {
    expect(canSubmitManualReject(null, 'note')).toBe(false)
  })

  it('requires a note for Other', () => {
    const other = MANUAL_REJECT_REASONS.find(row => row.code === 'OTHER') ?? null
    expect(canSubmitManualReject(other, '')).toBe(false)
    expect(canSubmitManualReject(other, 'Wait at the gate')).toBe(true)
  })

  it('does not require a note for a fixed chip', () => {
    const gps = MANUAL_REJECT_REASONS.find(row => row.code === 'USE_GPS') ?? null
    expect(canSubmitManualReject(gps, '')).toBe(true)
  })
})
