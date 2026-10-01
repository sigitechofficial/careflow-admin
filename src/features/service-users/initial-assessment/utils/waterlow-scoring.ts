/**
 * Waterlow Pressure Ulcer Risk Assessment — scoring aligned to the paper tool (§11.4).
 * Assessors select predefined options; {@link computeWaterlowScore} sums their scores.
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
  /** Selected option id for single-select sections (e.g. `gender` → `male`). */
  singleOptionIds?: Partial<Record<string, string>>
  /** Selected weight-loss band id (`0.5-5`, `unsure`, etc.). */
  weightLossOptionId?: string
  /** @deprecated Manual score entry keyed as `{sectionId}:{optionId}`. */
  enteredScores?: Record<string, number>
  /** @deprecated Legacy multi-select ids — used when {@link enteredScores} is empty. */
  skinTypes?: string[]
  /** @deprecated Legacy multi-select ids — used when {@link enteredScores} is empty. */
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
  { id: 'average', label: 'Average BMI = 20–24.9', score: 0 },
  { id: 'above', label: 'Above average BMI = 25–29.9', score: 1 },
  { id: 'obese', label: 'Obese BMI > 30', score: 2 },
  { id: 'below', label: 'Below average BMI < 20', score: 3 },
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
  { id: 'fully', label: 'Fully', score: 0 },
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
  { id: 'mild', label: 'Diabetes / MS / CVA', score: 4 },
  { id: 'moderate', label: 'Motor / sensory', score: 5 },
  { id: 'severe', label: 'Paraplegia', score: 6 },
]

export const WATERLOW_SURGERY_OPTIONS: WaterlowSelectOption[] = [
  { id: 'none', label: 'None / recovering normally (> 48 hours)', score: 0 },
  { id: 'ortho', label: 'Orthopaedic / spinal', score: 5 },
  { id: 'table_2h', label: 'On table > 2 hours', score: 5 },
  { id: 'table_6h', label: 'On table > 6 hours', score: 8 },
]

export const WATERLOW_MEDICATION_OPTIONS: WaterlowSelectOption[] = [
  { id: 'none', label: 'None', score: 0 },
  {
    id: 'high_risk',
    label: 'Cytotoxics, high dose steroids, anti-inflammatory',
    score: 4,
  },
]

export const WATERLOW_WEIGHT_LOSS_OPTIONS: WaterlowSelectOption[] = [
  { id: 'none', label: 'None', score: 0 },
  { id: '0.5-5', label: '0.5–5 kg', score: 1 },
  { id: '5-10', label: '5–10 kg', score: 2 },
  { id: '10-15', label: '10–15 kg', score: 3 },
  { id: '15+', label: '> 15 kg', score: 4 },
  { id: 'unsure', label: 'Unsure', score: 2 },
]

/** Paper form risk band legend shown below total score. */
export const WATERLOW_RISK_THRESHOLDS: ReadonlyArray<{ minScore: number; label: string }> = [
  { minScore: 10, label: 'At risk' },
  { minScore: 15, label: 'High risk' },
  { minScore: 20, label: 'Very high risk' },
]

/** Paper form section order for the Waterlow assessment table. */
export type WaterlowSingleField = keyof Pick<
  WaterlowMetadata,
  | 'gender'
  | 'age'
  | 'build'
  | 'appetite'
  | 'mobility'
  | 'continence'
  | 'neurological'
  | 'surgery'
  | 'medication'
  | 'weightLoss'
>

export type WaterlowMultiField = 'skinTypes' | 'tissueMalnutrition'

export type WaterlowTableSection =
  | {
      id: string
      category: string
      hint?: string
      kind: 'single'
      field: WaterlowSingleField
      options: WaterlowSelectOption[]
    }
  | {
      id: string
      category: string
      hint?: string
      kind: 'multi'
      field: WaterlowMultiField
      options: WaterlowSelectOption[]
    }

export const WATERLOW_USE_INSTRUCTIONS = [
  'Score on first assessment and update monthly and if significant change in client’s condition.',
  'If total score is 10+ initiate standardised care plans: At Risk of Pressure Damage / Pressure Ulcer Formation.',
] as const

export const WATERLOW_TABLE_SECTIONS: WaterlowTableSection[] = [
  {
    id: 'gender',
    category: 'Gender',
    hint: 'Select one option only',
    kind: 'single',
    field: 'gender',
    options: WATERLOW_GENDER_OPTIONS,
  },
  {
    id: 'age',
    category: 'Age',
    hint: 'Select one option only',
    kind: 'single',
    field: 'age',
    options: WATERLOW_AGE_OPTIONS,
  },
  {
    id: 'build',
    category: 'Build weight',
    hint: 'Select one option only',
    kind: 'single',
    field: 'build',
    options: WATERLOW_BUILD_OPTIONS,
  },
  {
    id: 'appetite',
    category: 'Appetite',
    hint: 'Select one option only',
    kind: 'single',
    field: 'appetite',
    options: WATERLOW_APPETITE_OPTIONS,
  },
  {
    id: 'skin',
    category: 'Skin type — visual risk areas',
    hint: 'May select one or more options',
    kind: 'multi',
    field: 'skinTypes',
    options: WATERLOW_SKIN_OPTIONS,
  },
  {
    id: 'mobility',
    category: 'Mobility',
    hint: 'Select one option only',
    kind: 'single',
    field: 'mobility',
    options: WATERLOW_MOBILITY_OPTIONS,
  },
  {
    id: 'continence',
    category: 'Continence',
    hint: 'Select one option only',
    kind: 'single',
    field: 'continence',
    options: WATERLOW_CONTINENCE_OPTIONS,
  },
  {
    id: 'tissue',
    category: 'Tissue malnutrition',
    hint: 'May select one or more options',
    kind: 'multi',
    field: 'tissueMalnutrition',
    options: WATERLOW_TISSUE_OPTIONS,
  },
  {
    id: 'neurological',
    category: 'Neurological deficit',
    hint: 'Select one option only (score depends on severity)',
    kind: 'single',
    field: 'neurological',
    options: WATERLOW_NEUROLOGICAL_OPTIONS,
  },
  {
    id: 'surgery',
    category: 'Major surgery trauma',
    hint: 'Select one option only. Up to 48 hours post surgery; discount after 48 hrs if recovering normally.',
    kind: 'single',
    field: 'surgery',
    options: WATERLOW_SURGERY_OPTIONS,
  },
  {
    id: 'medication',
    category: 'Medication',
    hint: 'Select one option only',
    kind: 'single',
    field: 'medication',
    options: WATERLOW_MEDICATION_OPTIONS,
  },
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

export function waterlowEnteredScoreKey(sectionId: string, optionId: string): string {
  return `${sectionId}:${optionId}`
}

export function parseWaterlowScoreInput(raw: string): number | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) return undefined
  return Math.floor(n)
}

export function hasWaterlowEnteredScores(meta: WaterlowMetadata | null | undefined): boolean {
  return Object.keys(meta?.enteredScores ?? {}).length > 0
}

export function sumWaterlowEnteredScores(scores: Record<string, number>): number {
  return Object.values(scores).reduce((sum, value) => {
    const n = Number(value)
    return sum + (Number.isFinite(n) && n > 0 ? n : 0)
  }, 0)
}

function enteredScoresForSection(
  scores: Record<string, number>,
  sectionId: string,
): number {
  const prefix = `${sectionId}:`
  return Object.entries(scores)
    .filter(([key]) => key.startsWith(prefix))
    .reduce((sum, [, value]) => {
      const n = Number(value)
      return sum + (Number.isFinite(n) && n > 0 ? n : 0)
    }, 0)
}

export function computeWaterlowScoreFromEnteredScores(scores: Record<string, number>): number {
  let total = 0
  for (const section of WATERLOW_TABLE_SECTIONS) {
    total += enteredScoresForSection(scores, section.id)
  }
  total += enteredScoresForSection(scores, 'weightLoss')
  return total
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
    Object.keys(meta.singleOptionIds ?? {}).length > 0 ||
    meta.gender != null ||
    meta.age != null ||
    meta.build != null ||
    meta.mobility != null ||
    meta.weightLossOptionId != null ||
    (meta.skinTypes != null && meta.skinTypes.length > 0) ||
    (meta.tissueMalnutrition != null && meta.tissueMalnutrition.length > 0)
  )
}

function stripEnteredScoresForSection(
  scores: Record<string, number> | undefined,
  sectionId: string,
): Record<string, number> | undefined {
  if (!scores) return undefined
  const next = { ...scores }
  const prefix = `${sectionId}:`
  for (const key of Object.keys(next)) {
    if (key.startsWith(prefix)) delete next[key]
  }
  return Object.keys(next).length > 0 ? next : undefined
}

export function resolveWaterlowSingleOptionId(
  meta: WaterlowMetadata,
  section: Extract<WaterlowTableSection, { kind: 'single' }>,
): string | undefined {
  const selected = meta.singleOptionIds?.[section.id]
  if (selected) return selected
  const score = meta[section.field]
  if (score == null) return undefined
  return section.options.find((option) => option.score === score)?.id
}

export function resolveWaterlowWeightLossOptionId(meta: WaterlowMetadata): string | undefined {
  if (meta.weightLossOptionId) return meta.weightLossOptionId
  if (meta.weightLoss == null) return undefined
  return WATERLOW_WEIGHT_LOSS_OPTIONS.find((option) => option.score === meta.weightLoss)?.id
}

export function isWaterlowMultiOptionSelected(
  meta: WaterlowMetadata,
  field: WaterlowMultiField,
  optionId: string,
): boolean {
  return meta[field]?.includes(optionId) ?? false
}

export function selectWaterlowSingleOption(
  meta: WaterlowMetadata,
  section: Extract<WaterlowTableSection, { kind: 'single' }>,
  optionId: string,
): WaterlowMetadata {
  const option = section.options.find((row) => row.id === optionId)
  if (!option) return meta
  return enrichWaterlowMetadata({
    ...meta,
    enteredScores: stripEnteredScoresForSection(meta.enteredScores, section.id),
    singleOptionIds: { ...(meta.singleOptionIds ?? {}), [section.id]: optionId },
    [section.field]: option.score,
  })
}

export function toggleWaterlowMultiOption(
  meta: WaterlowMetadata,
  section: Extract<WaterlowTableSection, { kind: 'multi' }>,
  optionId: string,
  checked: boolean,
): WaterlowMetadata {
  const current = new Set(meta[section.field] ?? [])
  if (checked) current.add(optionId)
  else current.delete(optionId)
  const enteredScores = stripEnteredScoresForSection(meta.enteredScores, section.id)
  if (enteredScores && checked) {
    delete enteredScores[waterlowEnteredScoreKey(section.id, optionId)]
  }
  return enrichWaterlowMetadata({
    ...meta,
    enteredScores: enteredScores && Object.keys(enteredScores).length > 0 ? enteredScores : undefined,
    [section.field]: [...current],
  })
}

export function selectWaterlowWeightLossOption(
  meta: WaterlowMetadata,
  optionId: string,
): WaterlowMetadata {
  const option = WATERLOW_WEIGHT_LOSS_OPTIONS.find((row) => row.id === optionId)
  if (!option) return meta
  return enrichWaterlowMetadata({
    ...meta,
    enteredScores: stripEnteredScoresForSection(meta.enteredScores, 'weightLoss'),
    weightLossOptionId: optionId,
    weightLoss: option.score,
  })
}

export function computeWaterlowScoreFromSelections(meta: WaterlowMetadata): number {
  let total = 0
  for (const section of WATERLOW_TABLE_SECTIONS) {
    if (section.kind === 'single') {
      const optionId = resolveWaterlowSingleOptionId(meta, section)
      total += scoreForOptionId(section.options, optionId) ?? 0
      continue
    }
    total += sumMultiSelect(meta[section.field], section.options)
  }
  const weightLossId = resolveWaterlowWeightLossOptionId(meta)
  total += scoreForOptionId(WATERLOW_WEIGHT_LOSS_OPTIONS, weightLossId) ?? 0
  return total
}

export type WaterlowBreakdownItem = { sectionId: string; category: string; label: string; score: number }

/** The chosen option(s) per category with their points (display only; the score itself is unchanged). */
export function waterlowSelectionBreakdown(meta: WaterlowMetadata): WaterlowBreakdownItem[] {
  const items: WaterlowBreakdownItem[] = []
  for (const section of WATERLOW_TABLE_SECTIONS) {
    const chosen =
      section.kind === 'single'
        ? section.options.filter((o) => o.id === resolveWaterlowSingleOptionId(meta, section))
        : section.options.filter((o) => meta[section.field]?.includes(o.id))
    for (const o of chosen) items.push({ sectionId: section.id, category: section.category, label: o.label, score: o.score })
  }
  const weightLoss = WATERLOW_WEIGHT_LOSS_OPTIONS.find((o) => o.id === resolveWaterlowWeightLossOptionId(meta))
  if (weightLoss) {
    items.push({ sectionId: 'weightLoss', category: 'Recent weight loss', label: weightLoss.label, score: weightLoss.score })
  }
  return items
}

export function computeWaterlowScore(meta: WaterlowMetadata | null | undefined): number {
  if (!meta) return 0
  if (hasWaterlowEnteredScores(meta)) {
    return computeWaterlowScoreFromEnteredScores(meta.enteredScores!)
  }
  if (!hasNewFormat(meta) && meta.factors) {
    return legacyScore(meta.factors)
  }

  return computeWaterlowScoreFromSelections(meta)
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

/**
 * Waterlow reassessment interval: monthly — the form's own instruction ("update monthly"), and e.g. a
 * Nourish provider policy (Kingsley Healthcare 03-18a): Waterlow reviewed "no less than every 1 month".
 */
export const WATERLOW_REVIEW_INTERVAL_MONTHS = 1
export const WATERLOW_REVIEW_SOURCE = 'Waterlow form instruction and Kingsley Healthcare (Nourish) review policy'

function addMonthsIso(isoDate: string, months: number): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate)
  if (!m) return null
  const y = Number(m[1])
  const monthIndex = Number(m[2]) - 1 + months
  const targetYear = y + Math.floor(monthIndex / 12)
  const targetMonth = ((monthIndex % 12) + 12) % 12
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  const day = Math.min(Number(m[3]), lastDay)
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const isBlank = (v: string | null | undefined) => !v || !v.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()

/**
 * Fill-empty defaults for the Waterlow follow-up fields once the score is complete: recommendation from
 * the risk band, assessor, assessment date and the next review date. Returns null when nothing to fill.
 */
export function waterlowFollowUpPrefill(
  meta: WaterlowMetadata,
  ctx: { assessorName?: string | null; assessmentDate: string },
): Partial<WaterlowMetadata> | null {
  const score = computeWaterlowScore(meta)
  if (score <= 0) return null
  const patch: Partial<WaterlowMetadata> = {}
  if (isBlank(meta.recommendation)) {
    patch.recommendation = `${waterlowBand(score).label}: ${waterlowEquipmentGuidance(score)}.`
  }
  if (isBlank(meta.recommendationBy) && ctx.assessorName?.trim()) patch.recommendationBy = ctx.assessorName.trim()
  const date = ctx.assessmentDate.slice(0, 10)
  if (isBlank(meta.recommendationDate) && /^\d{4}-\d{2}-\d{2}$/.test(date)) patch.recommendationDate = date
  if (isBlank(meta.nextReviewDate)) {
    const next = addMonthsIso(date, WATERLOW_REVIEW_INTERVAL_MONTHS)
    if (next) patch.nextReviewDate = next
  }
  return Object.keys(patch).length ? patch : null
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
    singleOptionIds: {},
    skinTypes: [],
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

/** Sections a complete Waterlow records (mirrors careflow-api `isWaterlowScoringComplete`). */
const WATERLOW_COMPLETE_SECTIONS = [
  'gender',
  'age',
  'build',
  'appetite',
  'mobility',
  'continence',
  'neurological',
  'surgery',
  'medication',
] as const

/** Every Waterlow section answered — the same rule the server uses to promote the assessment. */
export function isWaterlowAllSectionsComplete(meta: WaterlowMetadata | null | undefined): boolean {
  if (!meta) return false
  if (hasWaterlowEnteredScores(meta)) {
    const keys = Object.keys(meta.enteredScores ?? {})
    return [...WATERLOW_COMPLETE_SECTIONS, 'weightLoss'].every((id) => keys.some((k) => k.startsWith(`${id}:`)))
  }
  const singles = meta.singleOptionIds ?? {}
  const record = meta as Record<string, unknown>
  const sectionsDone = WATERLOW_COMPLETE_SECTIONS.every((id) => singles[id] != null || record[id] != null)
  return sectionsDone && (meta.weightLossOptionId != null || record.weightLoss != null)
}
