/** Normalise stored time strings to HH:mm for `<input type="time">` (24-hour). */
export function normalizeBillingTimeInput(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return ''
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return trimmed
  const hours = Number(match[1])
  const minutes = match[2]
  if (hours < 0 || hours > 23) return trimmed
  return `${String(hours).padStart(2, '0')}:${minutes}`
}
