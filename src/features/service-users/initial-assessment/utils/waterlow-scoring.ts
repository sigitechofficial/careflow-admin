/**
 * Waterlow Pressure Ulcer Risk Assessment — scoring aligned to the paper tool (§11.4).
 * Single-select categories store the option score; multi-select categories sum selected option scores.
 */

export type WaterlowSelectOption = { id: string; label: string; score: number }

export type WaterlowMetadata = {
  gender?: number
  age?: number
  build?: number
  appetite?: number
  mobility?: number
  continence?: number
  neurological?: number
  surgery?: number
  medication?: number
  weightLoss?: number
  skinTypes?: string[]
  tissueMalnutrition?: string[]
  score?: number
  carePlanRequired?: boolean
  managerReviewSuggested?: boolean
  nextReviewDate?: string | null
  comments?: string
  recommendation?: string
  recommendationBy?: string
  recommendationTo?: string
  recommendationDate?: string | null
  actionTaken?: string
  /** @deprecated Legacy 8-factor grid — migrated on read */
  factors?: LegacyWaterlowFactors
}

/** @deprecated */
export type LegacyWaterlowFactors = {
  build?: number
  skin?: number
  sex?: number
  age?: number
  continence?: number
  mobility?: number
  appetite?: number
  special?: number
}

export const WATERLOW_GENDER_OPTIONS: WaterlowSelectOption[] = [
  { id: 'male', label: 'Male', score: 1 },
  { id: 'female', label: 'Female', score: 2 },
]

export const WATERLOW_AGE_OPTIONS: WaterlowSelectOption[] = [
  { id: '14-49', label: '14–49 years', score: 1 },
  { id: '50-64', label: '50–64 years', score: 2 },
  { id: '65-74', label: '65–74 years', score: 3 },
  { id: '75-80', label: '75–80 years', score: 4 },
  { id: '81+', label: '81+ years', score: 5 },
]

export const WATERLOW_BUILD_OPTIONS: WaterlowSelectOption[] = [
  { id: 'average', label: 'Average (BMI 20–24.9)', score: 0 },
  { id: 'above', label: 'Above average (BMI 25–29.9)', score: 1 },
  { id: 'obese', label: 'Obese (BMI > 30)', score: 2 },
  { id: 'below', label: 'Below average (BMI < 20)', score: 3 },
]

export const WATERLOW_APPETITE_OPTIONS: WaterlowSelectOption[] = [
  { id: 'none', label: 'No concerns', score: 0 },
  { id: 'poor', label: 'Poor / lack of appetite', score: 1 },
]

export const WATERLOW_SKIN_OPTIONS: WaterlowSelectOption[] = [
  { id: 'healthy', label: 'Healthy', score: 0 },
  { id: 'thin', label: 'Thin / fragile / tissue paper', score: 1 },
  { id: 'dry', label: 'Dry', score: 1 },
  { id: 'oedematous', label: 'Oedematous', score: 1 },
  { id: 'clammy', label: 'Clammy / pyrexia', score: 1 },
  { id: 'previous_ulcer', label: 'Previous pressure ulcer or scarring', score: 2 },
  { id: 'discoloured', label: 'Discoloured / Grade 1', score: 2 },
  { id: 'broken', label: 'Broken / Grade 2–4', score: 3 },
]

export const WATERLOW_MOBILITY_OPTIONS: WaterlowSelectOption[] = [
  { id: 'fully', label: 'Fully mobile', score: 0 },
  { id: 'restless', label: 'Restless / fidgety', score: 1 },
  { id: 'apathetic', label: 'Apathetic', score: 2 },
  { id: 'restricted', label: 'Restricted', score: 3 },
  { id: 'bedbound', label: 'Bedbound (e.g. traction)', score: 4 },
  { id: 'chair', label: 'Chair bound (e.g. wheelchair)', score: 5 },
]

export const WATERLOW_CONTINENCE_OPTIONS: WaterlowSelectOption[] = [
  { id: 'continent', label: 'Continent / catheterised', score: 0 },
  { id: 'urine', label: 'Incontinent of urine', score: 1 },
  { id: 'faeces', label: 'Incontinent of faeces', score: 2 },
  { id: 'double', label: 'Doubly incontinent', score: 3 },
]

export const WATERLOW_TISSUE_OPTIONS: WaterlowSelectOption[] = [
  { id: 'smoking', label: 'Smoking', score: 1 },
  { id: 'anaemia', label: 'Anaemia', score: 2 },
  { id: 'pvd', label: 'Peripheral vascular disease', score: 5 },
  { id: 'single_organ', label: 'Single organ failure (respiratory / renal / cardiac)', score: 5 },
  { id: 'multi_organ', label: 'Multiple organ failure', score: 8 },
  { id: 'cachexia', label: 'Terminal cachexia', score: 8 },
]

export const WATERLOW_NEUROLOGICAL_OPTIONS: WaterlowSelectOption[] = [
  { id: 'none', label: 'None', score: 0 },
  { id: 'mild', label: 'Diabetes / MS / CVA — mild', score: 4 },
  { id: 'moderate', label: 'Motor / sensory deficit — moderate', score: 5 },
  { id: 'severe', label: 'Paraplegia / severe deficit', score: 6 },
]

export const WATERLOW_SURGERY_OPTIONS: WaterlowSelectOption[] = [
  { id: 'none', label: 'None / more than 48 hours ago (recovering)', score: 0 },
  { id: 'ortho', label: 'Orthopaedic / spinal (≤ 48 hours)', score: 5 },
  { id: 'table_2h', label: 'On table > 2 hours', score: 5 },
  { id: 'table_6h', label: 'On table > 6 hours', score: 8 },
]

export const WATERLOW_MEDICATION_OPTIONS: WaterlowSelectOption[] = [
  { id: 'none', label: 'None of the below', score: 0 },
  { id: 'high_risk', label: 'Cytotoxics, high-dose steroids, anti-inflammatory', score: 4 },
]

export const WATERLOW_WEIGHT_LOSS_OPTIONS: WaterlowSelectOption[] = [
  { id: 'none', label: 'None', score: 0 },
  { id: '0.5-5', label: '0.5–5 kg unplanned loss', score: 1 },
  { id: '5-10', label: '5–10 kg unplanned loss', score: 2 },
  { id: 'unsure', label: 'Unsure / not known', score: 2 },
  { id: '10+', label: '> 10 kg unplanned loss', score: 3 },
]

export type WaterlowEquipmentCatalogRow = {
  riskLevel: string
  scoreRange: string
  products: string[]
}

/** Paper page 16 — equipment selection guide by risk band. */
export const WATERLOW_EQUIPMENT_CATALOG: WaterlowEquipmentCatalogRow[] = [
  {
    riskLevel: 'Minimal risk',
    scoreRange: '0–9',
    products: ['Standard mattress', 'Follow local agency policy'],
  },
  {
    riskLevel: 'At risk',
    scoreRange: '10–14',
    products: [
      'High-risk foam cushion',
      'High-risk foam mattress overlay',
      'Alternating pressure overlay',
    ],
  },
  {
    riskLevel: 'High risk',
    scoreRange: '15–19',
    products: [
      'Alternating replacement mattress',
      'Full replacement foam mattress',
      'Heel boots / fleece heel protectors',
      'Sliding sheet',
      'Pressure-relieving cushion',
    ],
  },
  {
    riskLevel: 'Very high risk',
    scoreRange: '20+',
    products: [
      'Alternating replacement mattress',
      'Full replacement foam mattress',
      'Profiling / hospital bed',
      'Heel boots / fleece heel protectors',
      'Sliding sheet',
      'Pressure-relieving cushion',
    ],
  },
]

export const WATERLOW_EQUIPMENT_GUIDANCE: { maxScore: number; label: string; equipment: string }[] = [
  { maxScore: 9, label: 'Minimal risk (< 10)', equipment: 'Follow agency policy' },
  { maxScore: 14, label: 'At risk (10–14)', equipment: 'High-risk foam mattress / alternating overlay' },
  { maxScore: 19, label: 'High risk (15–19)', equipment: 'Full replacement mattress' },
  { maxScore: 999, label: 'Very high risk (20+)', equipment: 'Full replacement mattress' },
]

function sumMultiSelect(ids: string[] | undefined, options: WaterlowSelectOption[]): number {
  if (!ids?.length) return 0
  const byId = new Map(options.map((o) => [o.id, o.score]))
  return ids.reduce((sum, id) => sum + (byId.get(id) ?? 0), 0)
}

function legacyScore(factors: LegacyWaterlowFactors | undefined): number {
  if (!factors) return 0
  return (
    (factors.build ?? 0) +
    (factors.skin ?? 0) +
    (factors.sex ?? 0) +
    (factors.age ?? 0) +
    (factors.continence ?? 0) +
    (factors.mobility ?? 0) +
    (factors.appetite ?? 0) +
    (factors.special ?? 0)
  )
}

function hasNewFormat(meta: WaterlowMetadata): boolean {
  return (
    meta.gender != null ||
    meta.age != null ||
    meta.build != null ||
    meta.mobility != null ||
    (meta.skinTypes != null && meta.skinTypes.length > 0) ||
    (meta.tissueMalnutrition != null && meta.tissueMalnutrition.length > 0)
  )
}

export function computeWaterlowScore(meta: WaterlowMetadata | null | undefined): number {
  if (!meta) return 0
  if (!hasNewFormat(meta) && meta.factors) {
    return legacyScore(meta.factors)
  }

  let total = 0
  total += meta.gender ?? 0
  total += meta.age ?? 0
  total += meta.build ?? 0
  total += meta.appetite ?? 0
  total += meta.mobility ?? 0
  total += meta.continence ?? 0
  total += meta.neurological ?? 0
  total += meta.surgery ?? 0
  total += meta.medication ?? 0
  total += meta.weightLoss ?? 0
  total += sumMultiSelect(meta.skinTypes, WATERLOW_SKIN_OPTIONS)
  total += sumMultiSelect(meta.tissueMalnutrition, WATERLOW_TISSUE_OPTIONS)
  return total
}

export function waterlowBand(score: number): { label: string; className: string; level: string } {
  if (score >= 20) {
    return {
      level: 'very_high',
      label: 'Very high risk (20+)',
      className: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200',
    }
  }
  if (score >= 15) {
    return {
      level: 'high',
      label: 'High risk (15–19)',
      className: 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200',
    }
  }
  if (score >= 10) {
    return {
      level: 'at_risk',
      label: 'At risk (10–14)',
      className: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
    }
  }
  return {
    level: 'minimal',
    label: 'Minimal risk (0–9)',
    className: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  }
}

export function waterlowCarePlanRequired(score: number): boolean {
  return score >= 10
}

export function waterlowManagerReviewSuggested(score: number, threshold = 15): boolean {
  return score >= threshold
}

export function waterlowEquipmentGuidance(score: number): string {
  const row = WATERLOW_EQUIPMENT_GUIDANCE.find((g) => score <= g.maxScore)
  return row?.equipment ?? WATERLOW_EQUIPMENT_GUIDANCE[0]!.equipment
}

export function enrichWaterlowMetadata(
  meta: WaterlowMetadata,
  managerReviewThreshold = 15,
): WaterlowMetadata {
  const score = computeWaterlowScore(meta)
  return {
    ...meta,
    score,
    carePlanRequired: waterlowCarePlanRequired(score),
    managerReviewSuggested: waterlowManagerReviewSuggested(score, managerReviewThreshold),
  }
}

export function defaultWaterlowMetadata(): WaterlowMetadata {
  return enrichWaterlowMetadata({
    gender: undefined,
    age: undefined,
    build: 0,
    appetite: 0,
    mobility: 0,
    continence: 0,
    neurological: 0,
    surgery: 0,
    medication: 0,
    weightLoss: 0,
    skinTypes: ['healthy'],
    tissueMalnutrition: [],
  })
}

export function ageBandScoreFromDateOfBirth(dob: string | null | undefined): number | undefined {
  if (!dob) return undefined
  const born = new Date(dob)
  if (Number.isNaN(born.getTime())) return undefined
  const today = new Date()
  let years = today.getFullYear() - born.getFullYear()
  const m = today.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) years -= 1
  if (years <= 49) return 1
  if (years <= 64) return 2
  if (years <= 74) return 3
  if (years <= 80) return 4
  return 5
}

export function genderScoreFromCode(code: string | null | undefined, name?: string | null): number | undefined {
  const c = (code ?? name ?? '').toLowerCase()
  if (c.includes('male') && !c.includes('female')) return 1
  if (c.includes('female') || c === 'f') return 2
  return undefined
}

export function scoreForOptionId(
  options: WaterlowSelectOption[],
  id: string | undefined,
): number | undefined {
  if (!id) return undefined
  return options.find((o) => o.id === id)?.score
}

export function idForScore(options: WaterlowSelectOption[], score: number | undefined): string | undefined {
  if (score == null) return undefined
  return options.find((o) => o.score === score)?.id
}
