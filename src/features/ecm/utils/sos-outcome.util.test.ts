import { canSubmitSosClose, SOS_ACTION_CODES, SOS_OUTCOME_CODES } from './sos-outcome.util'

describe('sos-outcome.util', () => {
  it('keeps action and outcome catalogs separate', () => {
    expect(SOS_ACTION_CODES.map(row => row.code)).toContain('SOS_ACTION_CALLED_CARER')
    expect(SOS_OUTCOME_CODES.map(row => row.code)).toContain('SOS_FALSE_ALARM')
    expect(SOS_OUTCOME_CODES.map(row => row.code)).not.toContain('SOS_ACTION_CALLED_CARER')
  })

  it('requires both chips and a note for both action and outcome', () => {
    expect(canSubmitSosClose(null, 'SOS_FALSE_ALARM', 'did x', 'all safe')).toBe(false)
    expect(canSubmitSosClose('SOS_ACTION_CALLED_CARER', null, 'did x', 'all safe')).toBe(false)
    // Both chips picked but notes missing → still blocked (notes always required).
    expect(canSubmitSosClose('SOS_ACTION_CALLED_CARER', 'SOS_FALSE_ALARM', '', '')).toBe(false)
    expect(canSubmitSosClose('SOS_ACTION_CALLED_CARER', 'SOS_FALSE_ALARM', 'did x', '')).toBe(false)
    expect(canSubmitSosClose('SOS_ACTION_CALLED_CARER', 'SOS_FALSE_ALARM', '', 'all safe')).toBe(
      false,
    )
    expect(
      canSubmitSosClose('SOS_ACTION_CALLED_CARER', 'SOS_FALSE_ALARM', 'did x', 'all safe'),
    ).toBe(true)
    expect(canSubmitSosClose('SOS_ACTION_OTHER', 'SOS_OTHER', 'pocket dial', 'all safe')).toBe(true)
  })
})
