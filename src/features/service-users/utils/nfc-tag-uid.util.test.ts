import {
  NFC_UID_EXAMPLE,
  formatNfcUidTyping,
  nfcUidMaskRemainder,
  normalizeNfcUidInput,
  nfcUidCaretAfterHex,
} from '@/features/service-users/utils/nfc-tag-uid.util'

describe('formatNfcUidTyping', () => {
  it('adds a colon after every byte as you type', () => {
    expect(formatNfcUidTyping('0')).toBe('0')
    expect(formatNfcUidTyping('04')).toBe('04')
    expect(formatNfcUidTyping('04a')).toBe('04:A')
    expect(formatNfcUidTyping('04a23b1c5d8000')).toBe('04:A2:3B:1C:5D:80:00')
  })

  it('cleans pasted values and ignores non-hex characters', () => {
    expect(formatNfcUidTyping('04 a2-3b:1c')).toBe('04:A2:3B:1C')
    expect(formatNfcUidTyping('04:G2')).toBe('04:2')
  })

  it('caps at 10 bytes', () => {
    expect(formatNfcUidTyping('0102030405060708090A0B')).toBe('01:02:03:04:05:06:07:08:09:0A')
  })

  it('stays valid for the backend', () => {
    expect(normalizeNfcUidInput(formatNfcUidTyping('04a23b1c5d8000'))).toBe('04A23B1C5D8000')
  })
})

describe('nfcUidCaretAfterHex', () => {
  it('places the caret after the same number of hex characters', () => {
    expect(nfcUidCaretAfterHex('04:A2:3B', 0)).toBe(0)
    expect(nfcUidCaretAfterHex('04:A2:3B', 2)).toBe(2)
    expect(nfcUidCaretAfterHex('04:A2:3B', 3)).toBe(4)
    expect(nfcUidCaretAfterHex('04:A2:3B', 6)).toBe(8)
  })
})

describe('nfcUidMaskRemainder', () => {
  it('shows the example UID while the box is empty', () => {
    expect(nfcUidMaskRemainder('')).toBe(NFC_UID_EXAMPLE)
  })

  it('shows the slots still to fill for a 7-byte tag', () => {
    expect(nfcUidMaskRemainder('04:A')).toBe('_:__:__:__:__:__')
    expect(nfcUidMaskRemainder('04:A2:3B')).toBe(':__:__:__:__')
    expect(nfcUidMaskRemainder('04:A2:3B:1C:5D:80:00')).toBe('')
  })

  it('grows to 10 bytes once more than 7 are typed', () => {
    expect(nfcUidMaskRemainder('04:A2:3B:1C:5D:80:00:1')).toBe('_:__:__')
  })
})
