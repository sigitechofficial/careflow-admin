import { canSubmitSosClose, SOS_ACTION_CODES, SOS_OUTCOME_CODES } from './sos-outcome.util'

describe('sos-outcome.util', () => {
  it('keeps action and outcome catalogs separate', () => {
    expect(SOS_ACTION_CODES.map(row => row.code)).toContain('SOS_ACTION_CALLED_CARER')
    expect(SOS_OUTCOME_CODES.map(row => row.code)).toContain('SOS_FALSE_ALARM')
    expect(SOS_OUTCOME_CODES.map(row => row.code)).not.toContain('SOS_ACTION_CALLED_CARER')
  })

  it('requires both chips, and a note only for Other', () => {
    expect(canSubmitSosClose(null, 'SOS_FALSE_ALARM', '', '')).toBe(false)
    expect(canSubmitSosClose('SOS_ACTION_CALLED_CARER', null, '', '')).toBe(false)
    expect(canSubmitSosClose('SOS_ACTION_CALLED_CARER', 'SOS_FALSE_ALARM', '', '')).toBe(true)
    expect(canSubmitSosClose('SOS_ACTION_OTHER', 'SOS_FALSE_ALARM', '', '')).toBe(false)
    expect(canSubmitSosClose('SOS_ACTION_OTHER', 'SOS_FALSE_ALARM', 'pocket dial', '')).toBe(true)
    expect(canSubmitSosClose('SOS_ACTION_OTHER', 'SOS_OTHER', 'pocket dial', '')).toBe(false)
    expect(canSubmitSosClose('SOS_ACTION_OTHER', 'SOS_OTHER', 'pocket dial', 'all safe')).toBe(true)
  })
})
