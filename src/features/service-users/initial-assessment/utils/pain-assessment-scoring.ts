export type AbbeyScore = 0 | 1 | 2 | 3

export type PainSeverityBand = 'none' | 'mild' | 'moderate' | 'severe'

export type PainType = 'chronic' | 'acute' | 'acute_on_chronic'

export type AbbeyPainScores = {
  vocalisation?: AbbeyScore
  facialExpression?: AbbeyScore
  bodyLanguage?: AbbeyScore
  behaviouralChange?: AbbeyScore
  physiologicalChange?: AbbeyScore
  physicalChanges?: AbbeyScore
}

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

export type PainAssessmentMetadata = {
  nrsScore?: number
  abbey?: AbbeyPainScores & {
    severityBand?: PainSeverityBand
    painType?: PainType
    dateCompleted?: string
    assessorNameDesignation?: string
  }
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

export function computeAbbeyTotal(abbey: AbbeyPainScores | undefined): number {
  if (!abbey) return 0
  return ABBEY_ITEMS.reduce((sum, item) => sum + (abbey[item.key] ?? 0), 0)
}

export function abbeySeverityFromTotal(total: number): PainSeverityBand {
  if (total <= 2) return 'none'
  if (total <= 7) return 'mild'
  if (total <= 13) return 'moderate'
  return 'severe'
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
