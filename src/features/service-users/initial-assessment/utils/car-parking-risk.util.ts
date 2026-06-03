import type { InitialAssessmentAnswerInput } from '@/features/service-users/initial-assessment/types'

/** Maps 5-level paper options to a 1–3 matrix axis (Possible × Major = 9). */
const LIKELIHOOD_MATRIX_SCORE: Record<string, number> = {
  rare: 1,
  unlikely: 2,
  possible: 3,
  likely: 3,
  almost_certain: 3,
}

const SEVERITY_MATRIX_SCORE: Record<string, number> = {
  negligible: 1,
  minor: 2,
  moderate: 2,
  major: 3,
  catastrophic: 3,
}

export const CAR_PARKING_FIELD_KEYS = {
  arrangements: 'carParkingArrangements',
  roadsideAvailable: 'roadsideParkingAvailable',
  likelihood: 'carParkingHarmLikelihood',
  severity: 'carParkingHarmSeverity',
  controlMeasures: 'carParkingControlMeasures',
  otherRisks: 'carParkingOtherRisks',
} as const

export function isCarParkingSpecRef(specRef: string | undefined): boolean {
  return specRef === '3.12'
}

export function singleSelectOptionValue(
  value: InitialAssessmentAnswerInput | undefined,
): string | undefined {
  const sel = value?.selectedOptions
  if (Array.isArray(sel) && sel.length > 0) return String(sel[0])
  if (typeof sel === 'string' && sel.trim()) return sel.trim()
  return undefined
}

export function carParkingMatrixScore(likelihoodValue: string, severityValue: string): number | null {
  const l = LIKELIHOOD_MATRIX_SCORE[likelihoodValue]
  const s = SEVERITY_MATRIX_SCORE[severityValue]
  if (l == null || s == null) return null
  return l * s
}

export function carParkingRiskRatingLabel(score: number): string {
  if (score <= 2) return 'Low'
  if (score <= 4) return 'Moderate'
  return 'Significant'
}

export function carParkingRiskSummary(
  likelihoodValue: string | undefined,
  severityValue: string | undefined,
): { score: number; ratingLabel: string } | null {
  if (!likelihoodValue || !severityValue) return null
  const score = carParkingMatrixScore(likelihoodValue, severityValue)
  if (score == null) return null
  return { score, ratingLabel: carParkingRiskRatingLabel(score) }
}
