/** Mirrors the backend: hex only, 4 / 7 / 10 byte UIDs; separators ignored. */
export function normalizeNfcUidInput(raw: string): string | null {
  const hex = raw.replace(/[\s:-]/g, '').toUpperCase()
  if (!/^[0-9A-F]+$/.test(hex)) return null
  return [8, 14, 20].includes(hex.length) ? hex : null
}

/** Longest UID we accept: 10 bytes = 20 hex characters. */
const MAX_UID_HEX = 20

/**
 * Formats what the user typed/pasted as `04:A2:3B:…` while they type:
 * keeps hex characters only (upper-cased), max 10 bytes, colon after every byte.
 * No trailing colon, so Backspace behaves normally.
 */
export function formatNfcUidTyping(raw: string): string {
  const hex = raw.replace(/[^0-9a-f]/gi, '').toUpperCase().slice(0, MAX_UID_HEX)
  return hex.match(/.{1,2}/g)?.join(':') ?? ''
}

/** Caret position in the formatted value after [hexBefore] hex characters. */
export function nfcUidCaretAfterHex(formatted: string, hexBefore: number): number {
  if (hexBefore <= 0) return 0
  let seen = 0
  for (let i = 0; i < formatted.length; i++) {
    if (formatted[i] !== ':') seen++
    if (seen === hexBefore) return i + 1
  }
  return formatted.length
}

/** Example shown in the empty UID box (a typical 7-byte NTAG UID). */
export const NFC_UID_EXAMPLE = '04:A2:3B:1C:5D:80:00'

/**
 * Faded hint drawn behind the UID box. Empty → the example UID. Once typing
 * starts → the slots still to fill, e.g. `04:A2` → `:__:__:__:__:__`.
 * Assumes a 7-byte tag; grows to 10 bytes once more than 7 have been typed.
 */
export function nfcUidMaskRemainder(formatted: string): string {
  if (!formatted) return NFC_UID_EXAMPLE
  const hexLen = formatted.replace(/:/g, '').length
  const bytes = hexLen > 14 ? 10 : 7
  const full = Array.from({ length: bytes }, () => '__').join(':')
  return full.slice(formatted.length)
}
