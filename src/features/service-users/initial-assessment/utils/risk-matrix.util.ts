import type { InitialAssessmentRiskLevel } from '@/features/service-users/initial-assessment/types'

const LEVEL_SCORE: Record<InitialAssessmentRiskLevel, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
}

export function calculateRiskLevel(
  likelihood: InitialAssessmentRiskLevel,
  severity: InitialAssessmentRiskLevel,
): InitialAssessmentRiskLevel {
  const score = LEVEL_SCORE[likelihood] * LEVEL_SCORE[severity]
  if (score >= 6) return 'HIGH'
  if (score >= 3) return 'MEDIUM'
  return 'LOW'
}

export const RISK_MATRIX_LEVELS: InitialAssessmentRiskLevel[] = ['LOW', 'MEDIUM', 'HIGH']

export function matrixCellKey(likelihood: InitialAssessmentRiskLevel, severity: InitialAssessmentRiskLevel): string {
  return `${likelihood}:${severity}`
}
