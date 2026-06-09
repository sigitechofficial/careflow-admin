/** Common dial codes for phone fields (E.164 prefix). */
export const DIAL_CODES: readonly { code: string; label: string }[] = [
  { code: '+44', label: 'United Kingdom (+44)' },
  { code: '+353', label: 'Ireland (+353)' },
  { code: '+1', label: 'United States / Canada (+1)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+64', label: 'New Zealand (+64)' },
  { code: '+91', label: 'India (+91)' },
  { code: '+92', label: 'Pakistan (+92)' },
  { code: '+880', label: 'Bangladesh (+880)' },
  { code: '+234', label: 'Nigeria (+234)' },
  { code: '+27', label: 'South Africa (+27)' },
  { code: '+254', label: 'Kenya (+254)' },
  { code: '+256', label: 'Uganda (+256)' },
  { code: '+255', label: 'Tanzania (+255)' },
  { code: '+48', label: 'Poland (+48)' },
  { code: '+420', label: 'Czech Republic (+420)' },
  { code: '+33', label: 'France (+33)' },
  { code: '+49', label: 'Germany (+49)' },
  { code: '+39', label: 'Italy (+39)' },
  { code: '+34', label: 'Spain (+34)' },
  { code: '+31', label: 'Netherlands (+31)' },
  { code: '+32', label: 'Belgium (+32)' },
  { code: '+351', label: 'Portugal (+351)' },
  { code: '+30', label: 'Greece (+30)' },
  { code: '+40', label: 'Romania (+40)' },
  { code: '+86', label: 'China (+86)' },
  { code: '+852', label: 'Hong Kong (+852)' },
  { code: '+971', label: 'United Arab Emirates (+971)' },
  { code: '+966', label: 'Saudi Arabia (+966)' },
  { code: '+20', label: 'Egypt (+20)' },
  { code: '+63', label: 'Philippines (+63)' },
  { code: '+62', label: 'Indonesia (+62)' },
] as const

/** Keep only digits for local phone number inputs. */
export function sanitizePhoneLocalInput(value: string): string {
  return value.replace(/\D/g, '')
}

/** Strip spaces/dashes from local part and prefix with dial code for API storage. */
export function formatPhoneForApi(dial: string | undefined, local: string | undefined): string | undefined {
  const d = (dial ?? '+44').trim() || '+44'
  const l = (local ?? '').replace(/[\s-]/g, '').trim()
  if (!l) return undefined
  const out = `${d} ${l}`.replace(/\s+/g, ' ').trim()
  return out
}

/** Best-effort split of stored `+44 7700…` into dial + local digits for the form. */
export function splitPhoneForForm(combined: string | null | undefined): { dial: string; local: string } {
  const raw = combined?.trim() ?? ''
  if (!raw) return { dial: '+44', local: '' }
  const dials = [...DIAL_CODES].map(x => x.code).sort((a, b) => b.length - a.length)
  for (const code of dials) {
    if (raw.startsWith(code)) {
      const local = raw.slice(code.length).trim().replace(/[\s-]/g, '')
      return { dial: code, local }
    }
  }
  const m = raw.match(/^(\+\d{1,4})\s*(.*)$/)
  const dial = m?.[1]
  if (m && dial) {
    return { dial, local: (m[2] ?? '').replace(/[\s-]/g, '').trim() }
  }
  return { dial: '+44', local: raw.replace(/[\s-]/g, '') }
}
