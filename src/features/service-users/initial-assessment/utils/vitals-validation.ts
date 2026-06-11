import {
  fieldKeyOf,
  findQuestionByFieldKey,
  isExplicitNo,
  isYesAnswer,
} from '@/features/service-users/initial-assessment/utils/question-lookup'
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
}

export const VITALS_CONTEXT_FIELD_KEY = 'vitalsContext'

export const DEFAULT_VITAL_FIELD_RULES: VitalRule[] = [
  { fieldKey: 'temperature', label: 'Temperature', unit: '°C', min: 30, max: 45, decimal: true },
  { fieldKey: 'pulse', label: 'Pulse', unit: 'bpm', min: 30, max: 250 },
  { fieldKey: 'respirations', label: 'Respirations', unit: '/min', min: 5, max: 60 },
  { fieldKey: 'bpSystolic', label: 'Systolic BP', unit: 'mmHg', min: 50, max: 250 },
  { fieldKey: 'bpDiastolic', label: 'Diastolic BP', unit: 'mmHg', min: 30, max: 150 },
  { fieldKey: 'spo2', label: 'SpO₂', unit: '%', min: 50, max: 100 },
  { fieldKey: 'bloodGlucose', label: 'Blood glucose', unit: 'mmol/L', min: 1, max: 40, decimal: true },
]

/** @deprecated Use {@link resolveVitalFieldRules} for persisted per-assessment ranges. */
export const VITAL_FIELD_RULES = DEFAULT_VITAL_FIELD_RULES

export function defaultVitalAcceptedRanges(): VitalAcceptedRangesMetadata {
  return Object.fromEntries(
    DEFAULT_VITAL_FIELD_RULES.map((rule) => [rule.fieldKey, { min: rule.min, max: rule.max }]),
  ) as VitalAcceptedRangesMetadata
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
  for (const rule of DEFAULT_VITAL_FIELD_RULES) {
    const entry = source[rule.fieldKey]
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const row = entry as Record<string, unknown>
    const min = parseRangeValue(row.min)
    const max = parseRangeValue(row.max)
    if (min != null && max != null && min < max) {
      out[rule.fieldKey] = { min, max }
    }
  }
  return out
}

export function resolveVitalFieldRules(
  ranges?: VitalAcceptedRangesMetadata | null,
): VitalRule[] {
  const normalized = ranges ?? defaultVitalAcceptedRanges()
  return DEFAULT_VITAL_FIELD_RULES.map((rule) => ({
    ...rule,
    min: normalized[rule.fieldKey]?.min ?? rule.min,
    max: normalized[rule.fieldKey]?.max ?? rule.max,
  }))
}

const VITAL_FIELD_KEYS = new Set<string>(DEFAULT_VITAL_FIELD_RULES.map((r) => r.fieldKey))

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

export function validateVitalValue(
  fieldKey: VitalFieldKey,
  value: number | null | undefined,
  ranges?: VitalAcceptedRangesMetadata | null,
): string | null {
  if (value == null || Number.isNaN(value)) return null
  const rule = resolveVitalFieldRules(ranges).find((r) => r.fieldKey === fieldKey)
  if (!rule) return null
  if (value < rule.min || value > rule.max) {
    return `${rule.label} must be between ${rule.min} and ${rule.max} ${rule.unit}`
  }
  if (!rule.decimal && !Number.isInteger(value)) {
    return `${rule.label} must be a whole number`
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

  const rules = resolveVitalFieldRules(ranges)
  for (const rule of rules) {
    const q = findQuestionByFieldKey(sections, rule.fieldKey)
    if (!q) continue
    const answer = draftAnswers[q.id]
    const err = validateVitalValue(rule.fieldKey, answer?.numberValue ?? null, ranges)
    if (err) errors.set(q.id, err)
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
  for (const rule of DEFAULT_VITAL_FIELD_RULES) {
    const q = findQuestionByFieldKey(sections, rule.fieldKey)
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
