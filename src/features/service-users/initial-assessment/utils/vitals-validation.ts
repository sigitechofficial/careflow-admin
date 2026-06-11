import {
  fieldKeyOf,
  findQuestionByFieldKey,
  isExplicitNo,
  isYesAnswer,
} from '@/features/service-users/initial-assessment/utils/question-lookup'
import {
  VITAL_ACCEPTED_RANGE_LOOKUP,
  vitalAcceptedRangesFromLookup,
} from '@/features/service-users/initial-assessment/utils/vital-accepted-ranges.lookup'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

export type VitalFieldKey =
  | 'temperature'
  | 'pulse'
  | 'respirations'
  | 'bpSystolic'
  | 'bpDiastolic'
  | 'spo2'
  | 'bloodGlucose'

export type VitalAcceptedRange = {
  min: number
  max: number
}

export type VitalAcceptedRangesMetadata = Record<VitalFieldKey, VitalAcceptedRange>

export type VitalRule = {
  fieldKey: VitalFieldKey
  label: string
  unit: string
  min: number
  max: number
  decimal?: boolean
  /** UK clinical reference note (NEWS2 / NHS / CQC). */
  referenceNote?: string
}

type VitalFieldDefinition = {
  fieldKey: VitalFieldKey
  label: string
  unit: string
  decimal?: boolean
  referenceNote: string
  /** Per-assessment acceptable range — UK NEWS2 / NHS defaults (editable in the banner). */
  acceptedDefault: VitalAcceptedRange
  /** Hard limits for impossible readings / typos — allows recording abnormal but plausible values. */
  plausibility: VitalAcceptedRange
}

/**
 * UK reference defaults for domiciliary / care-home style observations.
 * Sources: NEWS2 (RCP 2017), RESTORE2, CQC GP mythbuster 102 (pulse/BP), NICE diabetes (glucose).
 * Individual baselines may differ — ranges are saved per assessment and should be adjusted when known.
 */
export const VITAL_FIELD_DEFINITIONS: VitalFieldDefinition[] = [
  {
    fieldKey: 'temperature',
    label: 'Temperature',
    unit: '°C',
    decimal: true,
    referenceNote: 'NEWS2 score 0: 36.1–38.0°C',
    acceptedDefault: { min: 36.0, max: 38.5 },
    plausibility: { min: 32, max: 42 },
  },
  {
    fieldKey: 'pulse',
    label: 'Pulse',
    unit: 'bpm',
    referenceNote: 'CQC/NHS adult: 60–100 bpm; NEWS2 score 0: 51–90',
    acceptedDefault: { min: 50, max: 100 },
    plausibility: { min: 30, max: 200 },
  },
  {
    fieldKey: 'respirations',
    label: 'Respirations',
    unit: '/min',
    referenceNote: 'NEWS2 score 0: 12–20 breaths/min',
    acceptedDefault: { min: 10, max: 24 },
    plausibility: { min: 4, max: 50 },
  },
  {
    fieldKey: 'bpSystolic',
    label: 'Systolic BP',
    unit: 'mmHg',
    referenceNote: 'NHS ideal from 90 mmHg; hypertension concern ≥140 (CQC)',
    acceptedDefault: { min: 90, max: 160 },
    plausibility: { min: 50, max: 250 },
  },
  {
    fieldKey: 'bpDiastolic',
    label: 'Diastolic BP',
    unit: 'mmHg',
    referenceNote: 'NHS ideal 60–80 mmHg (paired with systolic)',
    acceptedDefault: { min: 50, max: 100 },
    plausibility: { min: 30, max: 150 },
  },
  {
    fieldKey: 'spo2',
    label: 'SpO₂',
    unit: '%',
    referenceNote: 'NEWS2 SpO₂ Scale 1 on air score 0: ≥96% (Scale 2: 88–92% if prescribed)',
    acceptedDefault: { min: 94, max: 100 },
    plausibility: { min: 50, max: 100 },
  },
  {
    fieldKey: 'bloodGlucose',
    label: 'Blood glucose',
    unit: 'mmol/L',
    decimal: true,
    referenceNote: 'NICE: review if <4.0 (hypo) or >11.0 mmol/L',
    acceptedDefault: { min: 3.5, max: 15.0 },
    plausibility: { min: 1.0, max: 35 },
  },
]

/** Legacy wide defaults (pre-UK reference) — migrated on load. */
const LEGACY_ACCEPTED_DEFAULTS: VitalAcceptedRangesMetadata = {
  temperature: { min: 30, max: 45 },
  pulse: { min: 30, max: 250 },
  respirations: { min: 5, max: 60 },
  bpSystolic: { min: 50, max: 250 },
  bpDiastolic: { min: 30, max: 150 },
  spo2: { min: 50, max: 100 },
  bloodGlucose: { min: 1, max: 40 },
}

export const VITALS_CONTEXT_FIELD_KEY = 'vitalsContext'

/** @deprecated Use {@link resolveVitalFieldRules} for persisted per-assessment ranges. */
export const DEFAULT_VITAL_FIELD_RULES: VitalRule[] = VITAL_FIELD_DEFINITIONS.map((def) => ({
  fieldKey: def.fieldKey,
  label: def.label,
  unit: def.unit,
  decimal: def.decimal,
  referenceNote: def.referenceNote,
  min: def.acceptedDefault.min,
  max: def.acceptedDefault.max,
}))

/** @deprecated Use {@link resolveVitalFieldRules} for persisted per-assessment ranges. */
export const VITAL_FIELD_RULES = DEFAULT_VITAL_FIELD_RULES

export function defaultVitalAcceptedRanges(): VitalAcceptedRangesMetadata {
  return vitalAcceptedRangesFromLookup(VITAL_ACCEPTED_RANGE_LOOKUP)
}

function rangesEqual(a: VitalAcceptedRange, b: VitalAcceptedRange): boolean {
  return a.min === b.min && a.max === b.max
}

function isLegacyAcceptedRange(fieldKey: VitalFieldKey, range: VitalAcceptedRange): boolean {
  const legacy = LEGACY_ACCEPTED_DEFAULTS[fieldKey]
  return legacy != null && rangesEqual(range, legacy)
}

function parseRangeValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export function normalizeVitalAcceptedRanges(raw: unknown): VitalAcceptedRangesMetadata {
  const defaults = defaultVitalAcceptedRanges()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults
  const source = raw as Record<string, unknown>
  const out = { ...defaults }
  for (const def of VITAL_FIELD_DEFINITIONS) {
    const entry = source[def.fieldKey]
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const row = entry as Record<string, unknown>
    const min = parseRangeValue(row.min)
    const max = parseRangeValue(row.max)
    if (min != null && max != null && min < max) {
      const parsed = { min, max }
      out[def.fieldKey] = isLegacyAcceptedRange(def.fieldKey, parsed)
        ? { ...def.acceptedDefault }
        : parsed
    }
  }
  return out
}

export function resolveVitalFieldRules(
  ranges?: VitalAcceptedRangesMetadata | null,
): VitalRule[] {
  const normalized = ranges ?? defaultVitalAcceptedRanges()
  return VITAL_FIELD_DEFINITIONS.map((def) => ({
    fieldKey: def.fieldKey,
    label: def.label,
    unit: def.unit,
    decimal: def.decimal,
    referenceNote: def.referenceNote,
    min: normalized[def.fieldKey]?.min ?? def.acceptedDefault.min,
    max: normalized[def.fieldKey]?.max ?? def.acceptedDefault.max,
  }))
}

function resolvePlausibilityRule(fieldKey: VitalFieldKey): VitalFieldDefinition | undefined {
  return VITAL_FIELD_DEFINITIONS.find((def) => def.fieldKey === fieldKey)
}

const VITAL_FIELD_KEYS = new Set<string>(VITAL_FIELD_DEFINITIONS.map((r) => r.fieldKey))

export function isVitalSignQuestion(q: InitialAssessmentQuestion): boolean {
  const key = fieldKeyOf(q)
  return key != null && VITAL_FIELD_KEYS.has(key)
}

/** Numeric observation fields (vitals + lying/sitting/standing BP) — no per-field assessor notes. */
export function isClinicalMeasurementField(q: InitialAssessmentQuestion): boolean {
  if (q.questionType !== 'NUMBER') return false
  const key = fieldKeyOf(q)
  if (!key) return false
  if (VITAL_FIELD_KEYS.has(key)) return true
  return key.startsWith('bp')
}

export function isVitalsContextQuestion(q: InitialAssessmentQuestion): boolean {
  return fieldKeyOf(q) === VITALS_CONTEXT_FIELD_KEY
}

export function partitionVitalsSignsQuestions(questions: InitialAssessmentQuestion[]): {
  measurementQuestions: InitialAssessmentQuestion[]
  contextQuestion?: InitialAssessmentQuestion
} {
  const contextQuestion = questions.find(isVitalsContextQuestion)
  const measurementQuestions = questions.filter((q) => !isVitalsContextQuestion(q))
  return { measurementQuestions, contextQuestion }
}

export function clinicalMeasurementUnit(
  q: InitialAssessmentQuestion,
  ranges?: VitalAcceptedRangesMetadata | null,
): string {
  const key = fieldKeyOf(q)
  const rule = resolveVitalFieldRules(ranges).find((r) => r.fieldKey === key)
  if (rule) return rule.unit
  if (key?.includes('Systolic') || key?.includes('Diastolic')) return 'mmHg'
  const fromLabel = q.questionText.match(/\(([^)]+)\)\s*$/)
  return fromLabel?.[1] ?? ''
}

export function competentToRecordVitals(
  sections: InitialAssessmentSection[],
  draftAnswers: Record<string, InitialAssessmentAnswerInput>,
): boolean | null {
  const competentQ = sections
    .flatMap((s) => s.questions)
    .find((q) => specRefIs(q, '4.1') && q.questionText.toLowerCase().includes('competent'))
  if (!competentQ) return null
  const answer = draftAnswers[competentQ.id]
  if (isYesAnswer(answer)) return true
  if (isExplicitNo(answer)) return false
  return null
}

function specRefIs(q: InitialAssessmentQuestion, ref: string): boolean {
  const meta = q.metadata
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return false
  return (meta as { specRef?: string }).specRef === ref
}

export function vitalsClinicalFieldsLocked(
  sections: InitialAssessmentSection[],
  draftAnswers: Record<string, InitialAssessmentAnswerInput>,
): boolean {
  const competent = competentToRecordVitals(sections, draftAnswers)
  return competent === false
}

/** Hard validation — rejects impossible / mistyped values only. */
export function validateVitalValue(
  fieldKey: VitalFieldKey,
  value: number | null | undefined,
  _ranges?: VitalAcceptedRangesMetadata | null,
): string | null {
  if (value == null || Number.isNaN(value)) return null
  const def = resolvePlausibilityRule(fieldKey)
  if (!def) return null
  const { min, max } = def.plausibility
  if (value < min || value > max) {
    return `${def.label} must be between ${min} and ${max} ${def.unit}`
  }
  if (!def.decimal && !Number.isInteger(value)) {
    return `${def.label} must be a whole number`
  }
  return null
}

/** Soft warning when a plausible value sits outside the assessment's accepted (clinical) range. */
export function vitalAcceptedRangeWarning(
  fieldKey: VitalFieldKey,
  value: number | null | undefined,
  ranges?: VitalAcceptedRangesMetadata | null,
): string | null {
  if (value == null || Number.isNaN(value)) return null
  const rule = resolveVitalFieldRules(ranges).find((r) => r.fieldKey === fieldKey)
  if (!rule) return null
  if (value < rule.min || value > rule.max) {
    return `${rule.label} is outside the accepted range (${rule.min}–${rule.max} ${rule.unit}) for this assessment`
  }
  return null
}

export function buildVitalsValidationErrors(
  sections: InitialAssessmentSection[],
  draftAnswers: Record<string, InitialAssessmentAnswerInput>,
  ranges?: VitalAcceptedRangesMetadata | null,
): Map<string, string> {
  const errors = new Map<string, string>()
  const sec4 = sections.find((s) => s.sectionNumber === 4)
  if (!sec4) return errors

  for (const def of VITAL_FIELD_DEFINITIONS) {
    const q = findQuestionByFieldKey(sections, def.fieldKey)
    if (!q) continue
    const answer = draftAnswers[q.id]
    const value = answer?.numberValue ?? null
    const err = validateVitalValue(def.fieldKey, value, ranges)
    if (err) {
      errors.set(q.id, err)
      continue
    }
    const warn = vitalAcceptedRangeWarning(def.fieldKey, value, ranges)
    if (warn) errors.set(q.id, warn)
  }

  const systolicQ = findQuestionByFieldKey(sections, 'bpSystolic')
  const diastolicQ = findQuestionByFieldKey(sections, 'bpDiastolic')
  if (systolicQ && diastolicQ) {
    const sys = draftAnswers[systolicQ.id]?.numberValue
    const dia = draftAnswers[diastolicQ.id]?.numberValue
    if (sys != null && dia != null && !Number.isNaN(sys) && !Number.isNaN(dia) && sys <= dia) {
      errors.set(diastolicQ.id, 'Diastolic must be lower than systolic')
    }
  }

  return errors
}

export function hasAnyVitalSignEntered(
  sections: InitialAssessmentSection[],
  draftAnswers: Record<string, InitialAssessmentAnswerInput>,
): boolean {
  for (const def of VITAL_FIELD_DEFINITIONS) {
    const q = findQuestionByFieldKey(sections, def.fieldKey)
    if (!q) continue
    const v = draftAnswers[q.id]?.numberValue
    if (v != null && !Number.isNaN(v)) return true
  }
  return false
}

export function vitalsCompetencyWarning(
  sections: InitialAssessmentSection[],
  draftAnswers: Record<string, InitialAssessmentAnswerInput>,
): string | null {
  if (!hasAnyVitalSignEntered(sections, draftAnswers)) return null
  const competent = competentToRecordVitals(sections, draftAnswers)
  if (competent === false) {
    return 'Clinical vital signs were entered but assessor is not marked competent — clear vitals or confirm competency.'
  }
  if (competent === null) {
    return 'Confirm assessor competency before recording vital signs.'
  }
  return null
}

/** Gate specRef 4.2+ numeric fields when not competent. */
export function shouldLockVitalQuestion(
  q: InitialAssessmentQuestion,
  sections: InitialAssessmentSection[],
  draftAnswers: Record<string, InitialAssessmentAnswerInput>,
): boolean {
  if (!isVitalSignQuestion(q)) return false
  return vitalsClinicalFieldsLocked(sections, draftAnswers)
}
