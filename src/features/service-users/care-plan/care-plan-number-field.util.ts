/** Display string for a Care Plan NUMBER input. Empty stays empty; 0 stays 0. */
export function formatCarePlanNumberInputValue(
  value: string | boolean | number | null | undefined,
): string {
  if (value == null || value === '' || typeof value === 'boolean') return ''
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  return String(value).trim()
}

/** Placeholder "0" looks like a saved value; use a neutral prompt instead. */
export function carePlanNumberPlaceholder(placeholder: string | null | undefined): string {
  const raw = placeholder?.trim() ?? ''
  if (!raw || raw === '0') return 'Enter number'
  return raw
}
