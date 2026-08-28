/** Same Sleep fields as the carer app (quality + optional reasons). */

export const SLEEP_QUALITY_OPTIONS = [
  { value: 'SETTLED', label: 'Settled' },
  { value: 'RESTLESS', label: 'Restless' },
  { value: 'DISTURBED', label: 'Disturbed' },
  { value: 'DID_NOT_SLEEP', label: 'Did not sleep' },
] as const

export const SLEEP_REASON_OPTIONS = [
  { value: 'PAIN', label: 'Pain' },
  { value: 'TOILET', label: 'Toilet' },
  { value: 'NOISE', label: 'Noise' },
  { value: 'ANXIETY', label: 'Anxiety' },
  { value: 'UNKNOWN', label: 'Unknown' },
] as const

export type SleepQualityCode = (typeof SLEEP_QUALITY_OPTIONS)[number]['value']
export type SleepReasonCode = (typeof SLEEP_REASON_OPTIONS)[number]['value']

export function sleepQualityNeedsReasons(quality: string): boolean {
  return quality === 'RESTLESS' || quality === 'DISTURBED' || quality === 'DID_NOT_SLEEP'
}

export function sleepOptionLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  code: string | null | undefined,
): string {
  if (!code?.trim()) return '—'
  return options.find(o => o.value === code)?.label ?? code.replace(/_/g, ' ')
}

export function parseSleepReasonCodes(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

export function joinSleepReasonCodes(codes: string[]): string {
  return codes.join(',')
}
