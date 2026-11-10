/**
 * Expiry pre-fill for compliance, certification and skill forms: the start date plus the type's
 * validity period in calendar months (month-end clamped, e.g. 31 Aug + 6 → 28 Feb). The period
 * comes from the API (ComplianceType / CertificationType `defaultValidityMonths`, SkillType
 * `defaultRefreshMonths`); the API applies the same default when a client sends no expiry.
 */
export function expiryFromValidityIso(startIso: string, months: number | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startIso.trim())
  if (!m || !months || months < 1) return null
  const monthIndex = Number(m[2]) - 1 + months
  const year = Number(m[1]) + Math.floor(monthIndex / 12)
  const month = ((monthIndex % 12) + 12) % 12
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const day = Math.min(Number(m[3]), lastDay)
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** "Defaults to 3 years after the start date" style hint. */
export function validityHint(months: number | null | undefined, from: string): string | null {
  if (!months) return null
  const period =
    months % 12 === 0 ? `${months / 12} year${months === 12 ? '' : 's'}` : `${months} month${months === 1 ? '' : 's'}`
  return `Defaults to ${period} after ${from}.`
}

/**
 * Next expiry value when the start date changes: refilled while the expiry is empty or still the
 * value we filled last time; a date the user typed themselves is kept.
 */
export function nextPrefilledExpiry(params: {
  startIso: string
  currentExpiry: string
  lastAutoExpiry: string | null
  months: number | null | undefined
}): { expiry: string; autoExpiry: string | null } {
  const { startIso, currentExpiry, lastAutoExpiry, months } = params
  const userTyped = currentExpiry.trim() !== '' && currentExpiry !== lastAutoExpiry
  if (userTyped) return { expiry: currentExpiry, autoExpiry: lastAutoExpiry }
  const filled = expiryFromValidityIso(startIso, months)
  if (filled) return { expiry: filled, autoExpiry: filled }
  // Start date cleared: clear the value we filled, keep nothing stale.
  return { expiry: lastAutoExpiry === currentExpiry ? '' : currentExpiry, autoExpiry: null }
}
