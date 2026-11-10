/**
 * Labelled-scale (LIKERT) questions. A question stores its own scale labels in `options`
 * (e.g. Always … Never); with none it uses the built-in agreement scale. Same wording as the
 * API's DEFAULT_LIKERT_OPTIONS.
 */

/** Built-in agree ↔ disagree scale (used when a scale question has no labels of its own). */
export const AGREEMENT_SCALE: readonly string[] = [
  'Strongly agree',
  'Agree',
  'Neither agree nor disagree',
  'Disagree',
  'Strongly disagree',
]

export type StandardScaleKey = 'FREQUENCY' | 'RATING' | 'AGREEMENT' | 'SATISFACTION'

/** Standard five-point scales offered when adding or editing a scale question. */
export const STANDARD_SCALES: { key: StandardScaleKey; label: string; options: readonly string[] }[] = [
  { key: 'FREQUENCY', label: 'Frequency', options: ['Always', 'Usually', 'Sometimes', 'Rarely', 'Never'] },
  { key: 'RATING', label: 'Rating', options: ['Very good', 'Good', 'Neither good nor poor', 'Poor', 'Very poor'] },
  { key: 'AGREEMENT', label: 'Agreement', options: AGREEMENT_SCALE },
  {
    key: 'SATISFACTION',
    label: 'Satisfaction',
    options: ['Very satisfied', 'Satisfied', 'Neither satisfied nor dissatisfied', 'Dissatisfied', 'Very dissatisfied'],
  },
]

const sameLabels = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((label, i) => label === b[i])

/** The labels a scale question shows: its own, or the built-in agreement scale. */
export function likertLabels(options: readonly string[] | null | undefined): string[] {
  return options?.length ? [...options] : [...AGREEMENT_SCALE]
}

/** Which standard scale these labels are, if any (no labels = the agreement scale). */
export function standardScaleOf(options: readonly string[] | null | undefined): StandardScaleKey | null {
  const labels = likertLabels(options)
  return STANDARD_SCALES.find(s => sameLabels(s.options, labels))?.key ?? null
}

/** True when the labels are exactly the built-in agreement scale. */
export function isBuiltInAgreementScale(labels: readonly string[]): boolean {
  return sameLabels(labels, AGREEMENT_SCALE)
}

/** Short description from the scale's real labels, e.g. "Scale: Always … Never". */
export function describeLikertScale(options: readonly string[] | null | undefined): string {
  const labels = likertLabels(options)
  return `Scale: ${labels[0]} … ${labels[labels.length - 1]}`
}
