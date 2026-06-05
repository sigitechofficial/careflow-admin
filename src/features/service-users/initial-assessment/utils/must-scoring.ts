/** Malnutrition Universal Screening Tool (MUST) — BAPEN-aligned worksheet (§6.9). */

export type MustRiskLevel = 'low' | 'medium' | 'high'

export type MustStepId = 'bmi' | 'weightLoss'

export type MustMetadata = {
  /** Per-row scores keyed `bmi:gt20`, `weightLoss:lt5`, etc. */
  enteredScores?: Record<string, number>
  /** Derived step totals — kept for template sync and legacy reads. */
  bmiScore?: number
  weightLossScore?: number
  acuteDiseaseScore?: number
  /** Name for food fortification advice (step 5 — medium risk). */
  foodFortificationAdviceName?: string
  score?: number
  riskLevel?: MustRiskLevel
}

export const MUST_STEP_1_BMI_CRITERIA = [
  { id: 'gt20', label: 'BMI kg/m² > 20 (> 30 obese)', score: 0 },
  { id: '18_5to20', label: 'BMI kg/m² 18.5–20', score: 1 },
  { id: 'lt18_5', label: 'BMI kg/m² < 18.5', score: 2 },
] as const

export const MUST_STEP_2_WEIGHT_LOSS_CRITERIA = [
  { id: 'lt5', label: 'Weight loss < 5%', score: 0 },
  { id: '5to10', label: 'Weight loss 5–10%', score: 1 },
  { id: 'gt10', label: 'Weight loss > 10%', score: 2 },
] as const

export function mustEnteredScoreKey(stepId: MustStepId, rowId: string): string {
  return `${stepId}:${rowId}`
}

export const MUST_STEP_3_ACUTE_DISEASE_DESCRIPTION =
  'If client is acutely ill and there has been or is likely to be no nutritional intake for > 5 days, score 2.'

export const MUST_STEP_3_ACUTE_DISEASE_EXAMPLES = [
  'Critically ill clients',
  'Swallowing difficulties',
  'Pressure sores grade 3 or above',
  'Gastrointestinal surgery',
  'NBM (nothing by mouth) for > 3 days',
  'Cancer',
  'Leukaemia',
] as const

export const MUST_RISK_BANDS = [
  { maxScore: 0, level: 'low' as const, label: '0 = Low risk' },
  { maxScore: 1, level: 'medium' as const, label: '1 = Medium risk' },
  { maxScore: 999, level: 'high' as const, label: '2+ = High risk' },
] as const

export const MUST_CARE_PLANS: Record<
  MustRiskLevel,
  { title: string; actions: string[] }
> = {
  low: {
    title: 'Score 0 — Routine clinical care',
    actions: [
      'Re-screen if clinical concern (poor appetite, weight loss, decline in clinical condition).',
    ],
  },
  medium: {
    title: 'Score 1 — Observe',
    actions: [
      'Provide food fortification advice (record name below).',
      'Encourage and support appropriate meal/snack choices.',
      'Re-screen monthly.',
    ],
  },
  high: {
    title: 'Score 2+ — Refer',
    actions: [
      'Refer to dietitian*.',
      'Provide food fortification advice.',
      'Encourage and support appropriate meal/snack choices.',
      'Unless detrimental or no benefit is expected from nutritional support (e.g. imminent death).',
    ],
  },
}

export const MUST_BAPEN_FOOTER =
  'Reproduced with permission from BAPEN (British Association for Parenteral and Enteral Nutrition) and adapted for Sutton Community Health Services. Further information: www.bapen.org.uk'

export function parseMustScoreInput(raw: string): number | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) return undefined
  return Math.floor(n)
}

export function hasMustEnteredScores(meta: MustMetadata | null | undefined): boolean {
  return Object.keys(meta?.enteredScores ?? {}).length > 0
}

export function sumMustStepEnteredScores(
  meta: MustMetadata | null | undefined,
  stepId: MustStepId,
): number {
  if (!meta?.enteredScores) return 0
  const prefix = `${stepId}:`
  return Object.entries(meta.enteredScores).reduce((sum, [key, value]) => {
    if (!key.startsWith(prefix)) return sum
    return sum + value
  }, 0)
}

export function mustStepHasEnteredScores(
  meta: MustMetadata | null | undefined,
  stepId: MustStepId,
): boolean {
  if (!meta?.enteredScores) return false
  const prefix = `${stepId}:`
  return Object.keys(meta.enteredScores).some((key) => key.startsWith(prefix))
}

function resolveMustStepScore(
  meta: MustMetadata,
  stepId: MustStepId,
  legacyField: 'bmiScore' | 'weightLossScore',
): number {
  if (mustStepHasEnteredScores(meta, stepId)) {
    return sumMustStepEnteredScores(meta, stepId)
  }
  return meta[legacyField] ?? 0
}

export function computeMustScore(meta: MustMetadata | null | undefined): number {
  if (!meta) return 0
  const bmiScore = resolveMustStepScore(meta, 'bmi', 'bmiScore')
  const weightLossScore = resolveMustStepScore(meta, 'weightLoss', 'weightLossScore')
  const acuteDiseaseScore = meta.acuteDiseaseScore ?? 0
  return bmiScore + weightLossScore + acuteDiseaseScore
}

export function mustStepScoresEntered(meta: MustMetadata | null | undefined): boolean {
  if (!meta) return false
  const bmiComplete = mustStepHasEnteredScores(meta, 'bmi') || meta.bmiScore != null
  const weightLossComplete =
    mustStepHasEnteredScores(meta, 'weightLoss') || meta.weightLossScore != null
  const acuteComplete = meta.acuteDiseaseScore != null
  return bmiComplete && weightLossComplete && acuteComplete
}

export function patchMustEnteredRowScore(
  enteredScores: Record<string, number> | undefined,
  stepId: MustStepId,
  rowId: string,
  raw: string,
): Record<string, number> {
  const next = { ...(enteredScores ?? {}) }
  const key = mustEnteredScoreKey(stepId, rowId)
  const parsed = parseMustScoreInput(raw)
  if (parsed === undefined) delete next[key]
  else next[key] = parsed
  return next
}

export function mustRiskLevel(score: number): MustRiskLevel {
  if (score <= 0) return 'low'
  if (score === 1) return 'medium'
  return 'high'
}

export function mustRiskLabel(level: MustRiskLevel): string {
  if (level === 'low') return 'Low risk'
  if (level === 'medium') return 'Medium risk'
  return 'High risk'
}

export function enrichMustMetadata(meta: MustMetadata): MustMetadata {
  const bmiScore = resolveMustStepScore(meta, 'bmi', 'bmiScore')
  const weightLossScore = resolveMustStepScore(meta, 'weightLoss', 'weightLossScore')
  const score = bmiScore + weightLossScore + (meta.acuteDiseaseScore ?? 0)
  return {
    ...meta,
    bmiScore,
    weightLossScore,
    score,
    riskLevel: mustRiskLevel(score),
  }
}

export function defaultMustMetadata(): MustMetadata {
  return enrichMustMetadata({})
}

export function isMustScoringComplete(meta: MustMetadata | undefined): boolean {
  return mustStepScoresEntered(meta)
}
