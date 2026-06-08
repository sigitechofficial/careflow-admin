/** Malnutrition Universal Screening Tool (MUST) — BAPEN-aligned worksheet (§6.9). */

export type MustRiskLevel = 'low' | 'medium' | 'high'

export type MustStepId = 'bmi' | 'weightLoss'

export type MustSelectOption = { id: string; label: string; score: number }

export type MustMetadata = {
  /** Selected BMI band id (`gt20`, `18_5to20`, `lt18_5`). */
  bmiOptionId?: string
  /** Selected weight-loss band id (`lt5`, `5to10`, `gt10`). */
  weightLossOptionId?: string
  /** Selected acute disease effect id (`no`, `yes`). */
  acuteDiseaseOptionId?: string
  /** @deprecated Manual score entry keyed `bmi:gt20`, etc. */
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

export const MUST_STEP_1_BMI_CRITERIA: readonly MustSelectOption[] = [
  { id: 'gt20', label: 'BMI kg/m² > 20 (> 30 obese)', score: 0 },
  { id: '18_5to20', label: 'BMI kg/m² 18.5–20', score: 1 },
  { id: 'lt18_5', label: 'BMI kg/m² < 18.5', score: 2 },
] as const

export const MUST_STEP_2_WEIGHT_LOSS_CRITERIA: readonly MustSelectOption[] = [
  { id: 'lt5', label: 'Weight loss < 5%', score: 0 },
  { id: '5to10', label: 'Weight loss 5–10%', score: 1 },
  { id: 'gt10', label: 'Weight loss > 10%', score: 2 },
] as const

export const MUST_STEP_3_ACUTE_DISEASE_OPTIONS: readonly MustSelectOption[] = [
  {
    id: 'no',
    label: 'No — not acutely ill / nutritional intake expected',
    score: 0,
  },
  {
    id: 'yes',
    label: 'Yes — acutely ill with no (or likely no) nutritional intake for > 5 days',
    score: 2,
  },
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

function scoreFromOptionId(
  options: readonly MustSelectOption[],
  optionId: string | undefined,
): number | undefined {
  if (!optionId) return undefined
  return options.find((option) => option.id === optionId)?.score
}

function resolveOptionIdFromScore(
  options: readonly MustSelectOption[],
  score: number | undefined,
): string | undefined {
  if (score == null) return undefined
  return options.find((option) => option.score === score)?.id
}

function stripEnteredScoresForStep(
  scores: Record<string, number> | undefined,
  stepId: MustStepId,
): Record<string, number> | undefined {
  if (!scores) return undefined
  const next = { ...scores }
  const prefix = `${stepId}:`
  for (const key of Object.keys(next)) {
    if (key.startsWith(prefix)) delete next[key]
  }
  return Object.keys(next).length > 0 ? next : undefined
}

function resolveOptionIdFromEnteredScores(
  meta: MustMetadata,
  stepId: MustStepId,
  options: readonly MustSelectOption[],
): string | undefined {
  if (!meta.enteredScores) return undefined
  const prefix = `${stepId}:`
  for (const [key, value] of Object.entries(meta.enteredScores)) {
    if (!key.startsWith(prefix)) continue
    const rowId = key.slice(prefix.length)
    const guide = options.find((option) => option.id === rowId)
    if (guide && value === guide.score) return rowId
  }
  return undefined
}

export function resolveMustBmiOptionId(meta: MustMetadata): string | undefined {
  if (meta.bmiOptionId) return meta.bmiOptionId
  const fromEntered = resolveOptionIdFromEnteredScores(meta, 'bmi', MUST_STEP_1_BMI_CRITERIA)
  if (fromEntered) return fromEntered
  return resolveOptionIdFromScore(MUST_STEP_1_BMI_CRITERIA, meta.bmiScore)
}

export function resolveMustWeightLossOptionId(meta: MustMetadata): string | undefined {
  if (meta.weightLossOptionId) return meta.weightLossOptionId
  const fromEntered = resolveOptionIdFromEnteredScores(meta, 'weightLoss', MUST_STEP_2_WEIGHT_LOSS_CRITERIA)
  if (fromEntered) return fromEntered
  return resolveOptionIdFromScore(MUST_STEP_2_WEIGHT_LOSS_CRITERIA, meta.weightLossScore)
}

export function resolveMustAcuteDiseaseOptionId(meta: MustMetadata): string | undefined {
  if (meta.acuteDiseaseOptionId) return meta.acuteDiseaseOptionId
  return resolveOptionIdFromScore(MUST_STEP_3_ACUTE_DISEASE_OPTIONS, meta.acuteDiseaseScore)
}

function resolveMustBmiScore(meta: MustMetadata): number | undefined {
  const optionId = resolveMustBmiOptionId(meta)
  const fromOption = scoreFromOptionId(MUST_STEP_1_BMI_CRITERIA, optionId)
  if (fromOption != null) return fromOption
  if (meta.bmiScore != null) return meta.bmiScore
  return undefined
}

function resolveMustWeightLossScore(meta: MustMetadata): number | undefined {
  const optionId = resolveMustWeightLossOptionId(meta)
  const fromOption = scoreFromOptionId(MUST_STEP_2_WEIGHT_LOSS_CRITERIA, optionId)
  if (fromOption != null) return fromOption
  if (meta.weightLossScore != null) return meta.weightLossScore
  return undefined
}

function resolveMustAcuteDiseaseScore(meta: MustMetadata): number | undefined {
  const optionId = resolveMustAcuteDiseaseOptionId(meta)
  const fromOption = scoreFromOptionId(MUST_STEP_3_ACUTE_DISEASE_OPTIONS, optionId)
  if (fromOption != null) return fromOption
  if (meta.acuteDiseaseScore != null) return meta.acuteDiseaseScore
  return undefined
}

export function computeMustScore(meta: MustMetadata | null | undefined): number {
  if (!meta) return 0
  return (
    (resolveMustBmiScore(meta) ?? 0) +
    (resolveMustWeightLossScore(meta) ?? 0) +
    (resolveMustAcuteDiseaseScore(meta) ?? 0)
  )
}

export function mustStepScoresEntered(meta: MustMetadata | null | undefined): boolean {
  if (!meta) return false
  return (
    resolveMustBmiScore(meta) != null &&
    resolveMustWeightLossScore(meta) != null &&
    resolveMustAcuteDiseaseScore(meta) != null
  )
}

export function selectMustBmiOption(meta: MustMetadata, optionId: string): MustMetadata {
  const option = MUST_STEP_1_BMI_CRITERIA.find((row) => row.id === optionId)
  if (!option) return meta
  return enrichMustMetadata({
    ...meta,
    bmiOptionId: optionId,
    enteredScores: stripEnteredScoresForStep(meta.enteredScores, 'bmi'),
  })
}

export function selectMustWeightLossOption(meta: MustMetadata, optionId: string): MustMetadata {
  const option = MUST_STEP_2_WEIGHT_LOSS_CRITERIA.find((row) => row.id === optionId)
  if (!option) return meta
  return enrichMustMetadata({
    ...meta,
    weightLossOptionId: optionId,
    enteredScores: stripEnteredScoresForStep(meta.enteredScores, 'weightLoss'),
  })
}

export function selectMustAcuteDiseaseOption(meta: MustMetadata, optionId: string): MustMetadata {
  const option = MUST_STEP_3_ACUTE_DISEASE_OPTIONS.find((row) => row.id === optionId)
  if (!option) return meta
  return enrichMustMetadata({
    ...meta,
    acuteDiseaseOptionId: optionId,
  })
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
  const bmiScore = resolveMustBmiScore(meta)
  const weightLossScore = resolveMustWeightLossScore(meta)
  const acuteDiseaseScore = resolveMustAcuteDiseaseScore(meta)
  const score = (bmiScore ?? 0) + (weightLossScore ?? 0) + (acuteDiseaseScore ?? 0)
  return {
    ...meta,
    ...(bmiScore != null ? { bmiScore } : {}),
    ...(weightLossScore != null ? { weightLossScore } : {}),
    ...(acuteDiseaseScore != null ? { acuteDiseaseScore } : {}),
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

/** @deprecated Use {@link selectMustBmiOption} / {@link selectMustWeightLossOption}. */
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

/** @deprecated */
export function hasMustEnteredScores(meta: MustMetadata | null | undefined): boolean {
  return Object.keys(meta?.enteredScores ?? {}).length > 0
}
