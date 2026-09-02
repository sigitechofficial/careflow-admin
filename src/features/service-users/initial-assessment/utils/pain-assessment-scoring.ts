export type AbbeyScore = 0 | 1 | 2 | 3

export type PainSeverityBand = 'none' | 'mild' | 'moderate' | 'severe'

export type PainType = 'chronic' | 'acute' | 'acute_on_chronic'

export type PainScaleUsed = 'nrs' | 'abbey' | 'both'

export type AbbeyPainScores = {
  vocalisation?: AbbeyScore
  facialExpression?: AbbeyScore
  bodyLanguage?: AbbeyScore
  behaviouralChange?: AbbeyScore
  physiologicalChange?: AbbeyScore
  physicalChanges?: AbbeyScore
}

export const ABBEY_DOMAIN_KEYS: (keyof AbbeyPainScores)[] = [
  'vocalisation',
  'facialExpression',
  'bodyLanguage',
  'behaviouralChange',
  'physiologicalChange',
  'physicalChanges',
]

export type TherapyAideMemoireItem = {
  checked?: boolean
  details?: string
}

export type TherapyAideMemoireMetadata = {
  choking?: TherapyAideMemoireItem
  chestInfections?: TherapyAideMemoireItem
  speechConcern?: TherapyAideMemoireItem
  mobilityChange?: TherapyAideMemoireItem
  selfCareChange?: TherapyAideMemoireItem
  carePackageConcern?: TherapyAideMemoireItem
  furtherReferralRequired?: boolean | null
  referralCompleted?: boolean | null
  referralDate?: string
  additionalComments?: string
}

export type AbbeyAssessmentMetadata = AbbeyPainScores & {
  /** Calculated 0–18 total. Always derived from the six domain scores. */
  total?: number
  /** Always derived from `total` via `abbeySeverityFromTotal`. Never independently set. */
  severityBand?: PainSeverityBand
  painType?: PainType
  dateCompleted?: string
  assessorNameDesignation?: string
}

export type PainAssessmentMetadata = {
  nrsScore?: number
  /** Which scale(s) the assessor is using. Assessor-controlled; recommendation is advisory. */
  scaleUsed?: PainScaleUsed
  abbey?: AbbeyAssessmentMetadata
  therapyAideMemoire?: TherapyAideMemoireMetadata
}

export const NRS_VERBAL_LABELS: Record<number, string> = {
  0: 'No Pain',
  1: 'No Pain',
  2: 'Mild Pain',
  3: 'Mild Pain',
  4: 'Moderate Pain',
  5: 'Moderate Pain',
  6: 'Severe Pain',
  7: 'Severe Pain',
  8: 'Very Severe Pain',
  9: 'Very Severe Pain',
  10: 'Worst Pain Possible',
}

/** Anchor labels shown on the paper NRS/VRS scale. */
export const NRS_SCALE_ANCHORS: { score: number; label: string }[] = [
  { score: 0, label: 'No Pain' },
  { score: 2, label: 'Mild Pain' },
  { score: 4, label: 'Moderate Pain' },
  { score: 6, label: 'Severe Pain' },
  { score: 8, label: 'Very Severe Pain' },
  { score: 10, label: 'Worst Pain Possible' },
]

export const ABBEY_SCORING_LEGEND =
  'Absent — 0, Mild — 1, Moderate — 2, Severe — 3'

export const ABBEY_ITEMS: { key: keyof AbbeyPainScores; label: string; description: string }[] = [
  {
    key: 'vocalisation',
    label: 'Vocalisation',
    description: 'whimpering, groaning, crying',
  },
  {
    key: 'facialExpression',
    label: 'Facial expression',
    description: 'looking tense, frowning, grimacing, looking frightened',
  },
  {
    key: 'bodyLanguage',
    label: 'Change in body language',
    description: 'fidgeting, rocking, guarding part of body, withdrawn',
  },
  {
    key: 'behaviouralChange',
    label: 'Behavioural change',
    description: 'increased confusion, refusing to eat, alteration in usual patterns',
  },
  {
    key: 'physiologicalChange',
    label: 'Physiological change',
    description:
      'temperature, pulse or blood pressure outside normal limits, perspiring, flushing or pallor',
  },
  {
    key: 'physicalChanges',
    label: 'Physical changes',
    description: 'skin tears, pressure areas, arthritis, contractures, previous injuries',
  },
]

export const ABBEY_FOOTER_CITATION =
  'Abbey, J; De Bellis, A; Piller, N; Esterman, A; Giles, L; Parker, D and Lowcay, B. Funded by the JH & JD Gunn Medical Research Foundation 1998 – 2002'

export function parseAbbeyScoreInput(raw: string): AbbeyScore | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0 || n > 3) return undefined
  return Math.floor(n) as AbbeyScore
}

export const ABBEY_SCORE_OPTIONS: { value: AbbeyScore; label: string }[] = [
  { value: 0, label: 'Absent' },
  { value: 1, label: 'Mild' },
  { value: 2, label: 'Moderate' },
  { value: 3, label: 'Severe' },
]

export const ABBEY_SEVERITY_BANDS: { id: PainSeverityBand; label: string; range: string }[] = [
  { id: 'none', label: 'No pain', range: '0–2' },
  { id: 'mild', label: 'Mild', range: '3–7' },
  { id: 'moderate', label: 'Moderate', range: '8–13' },
  { id: 'severe', label: 'Severe', range: '14+' },
]

export const PAIN_TYPE_OPTIONS: { value: PainType; label: string }[] = [
  { value: 'chronic', label: 'Chronic' },
  { value: 'acute', label: 'Acute' },
  { value: 'acute_on_chronic', label: 'Acute on chronic' },
]

export const PAIN_SCALE_OPTIONS: { value: PainScaleUsed; label: string }[] = [
  { value: 'nrs', label: 'Numeric Rating Scale (NRS)' },
  { value: 'abbey', label: 'Abbey Pain Scale' },
  { value: 'both', label: 'Both scales' },
]

export function isValidAbbeyScore(value: unknown): value is AbbeyScore {
  return value === 0 || value === 1 || value === 2 || value === 3
}

/** Single source of truth for Abbey total (0–18). Missing domains count as 0. */
export function computeAbbeyTotal(abbey: AbbeyPainScores | undefined): number {
  if (!abbey) return 0
  return ABBEY_DOMAIN_KEYS.reduce((sum, key) => sum + (abbey[key] ?? 0), 0)
}

/** Single source of truth: 0–2 none, 3–7 mild, 8–13 moderate, 14+ severe. */
export function abbeySeverityFromTotal(total: number): PainSeverityBand {
  if (total <= 2) return 'none'
  if (total <= 7) return 'mild'
  if (total <= 13) return 'moderate'
  return 'severe'
}

/** Abbey is complete only when all six domains have a valid 0|1|2|3. All-zero is valid. */
export function isAbbeyAssessmentComplete(
  abbey: AbbeyPainScores | AbbeyAssessmentMetadata | undefined,
): boolean {
  if (!abbey) return false
  return ABBEY_DOMAIN_KEYS.every((key) => isValidAbbeyScore(abbey[key]))
}

/** NRS is complete when a score is present in 0–10 inclusive. 0 is a valid score. */
export function isNrsAssessmentComplete(nrsScore: unknown): boolean {
  return typeof nrsScore === 'number' && Number.isFinite(nrsScore) && nrsScore >= 0 && nrsScore <= 10
}

/** Pain-tool complete if valid NRS OR complete Abbey. Both are not required. */
export function isPainAssessmentComplete(pain: PainAssessmentMetadata | undefined): boolean {
  if (!pain) return false
  return isNrsAssessmentComplete(pain.nrsScore) || isAbbeyAssessmentComplete(pain.abbey)
}

/**
 * Persist calculated total and derived severity band. Call whenever any Abbey item changes.
 * `severityBand` is always overwritten from total — the UI must not set it independently.
 */
export function enrichAbbeyMetadata(
  abbey: AbbeyAssessmentMetadata | undefined,
): AbbeyAssessmentMetadata | undefined {
  if (!abbey) return undefined
  const total = computeAbbeyTotal(abbey)
  return {
    ...abbey,
    total,
    severityBand: abbeySeverityFromTotal(total),
  }
}

export function enrichPainAssessmentMetadata(
  pain: PainAssessmentMetadata,
): PainAssessmentMetadata {
  if (!pain.abbey) return pain
  return { ...pain, abbey: enrichAbbeyMetadata(pain.abbey) }
}

export function formatPainTypeLabel(painType: PainType | undefined): string | undefined {
  if (!painType) return undefined
  return PAIN_TYPE_OPTIONS.find((opt) => opt.value === painType)?.label.toLowerCase()
}

/**
 * History snapshot summary, e.g. "NRS 4/10", "Abbey 11/18 (moderate), acute on chronic",
 * or "NRS 0/10 · Abbey 0/18 (none) · 2 Sep 2026".
 */
export function formatPainAssessmentHistorySummary(
  pain: PainAssessmentMetadata | undefined,
): string | null {
  if (!pain) return null
  const parts: string[] = []
  if (isNrsAssessmentComplete(pain.nrsScore)) {
    parts.push(`NRS ${pain.nrsScore}/10`)
  }
  if (isAbbeyAssessmentComplete(pain.abbey)) {
    const total = pain.abbey.total ?? computeAbbeyTotal(pain.abbey)
    const band = abbeySeverityFromTotal(total)
    const typeLabel = formatPainTypeLabel(pain.abbey.painType)
    parts.push(
      typeLabel ? `Abbey ${total}/18 (${band}), ${typeLabel}` : `Abbey ${total}/18 (${band})`,
    )
  }
  const completed = pain.abbey?.dateCompleted?.trim()
  if (completed && parts.length > 0) {
    const formatted = formatHistoryDate(completed)
    if (formatted) parts.push(formatted)
  }
  if (parts.length === 0) return null
  return parts.join(' · ')
}

function formatHistoryDate(iso: string): string | undefined {
  const day = iso.slice(0, 10)
  const d = new Date(`${day}T00:00:00`)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Care Plan suggestion copy. Suggestion-only — never written as NRS 0–10. */
export function formatAbbeyCarePlanSuggestion(
  pain: PainAssessmentMetadata | undefined,
): string | null {
  if (!isAbbeyAssessmentComplete(pain?.abbey)) return null
  const abbey = pain!.abbey!
  const total = abbey.total ?? computeAbbeyTotal(abbey)
  const band = abbeySeverityFromTotal(total)
  const typeLabel = formatPainTypeLabel(abbey.painType)
  const typePart = typeLabel ? `; ${typeLabel}` : ''
  return `Abbey ${total}/18 — ${band}${typePart} (IA Pain Assessment Tool)`
}

/** Elevated pain review: Abbey total ≥ 8 or NRS ≥ 4. */
export function isPainElevatedReview(pain: PainAssessmentMetadata | undefined): boolean {
  if (!pain) return false
  if (isNrsAssessmentComplete(pain.nrsScore) && pain.nrsScore! >= 4) return true
  if (!isAbbeyAssessmentComplete(pain.abbey)) return false
  const total = pain.abbey.total ?? computeAbbeyTotal(pain.abbey)
  return total >= 8
}

export function nrsScoreColor(score: number): string {
  if (score <= 1) return 'bg-emerald-600'
  if (score <= 3) return 'bg-lime-500'
  if (score <= 4) return 'bg-yellow-400'
  if (score <= 6) return 'bg-orange-500'
  if (score <= 8) return 'bg-orange-700'
  return 'bg-red-600'
}

export function defaultPainAssessmentMetadata(): PainAssessmentMetadata {
  return {}
}
