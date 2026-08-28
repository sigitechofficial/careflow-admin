import type {
  InitialAssessmentRiskLevel,
  InitialAssessmentRiskRecord,
  InitialAssessmentRiskType,
} from '@/features/service-users/initial-assessment/types'
import type { CarePlanRiskItem } from '@/features/service-users/care-plan/care-plan-form-meta'
import {
  CARE_PLAN_META,
  parseRiskItems,
  serializeRiskItems,
} from '@/features/service-users/care-plan/care-plan-form-meta'
import type { CarePlanDraftValues } from '@/features/service-users/care-plan/care-plan-draft-storage'

/** Shared labels — keep in sync with InitialAssessmentRiskRecordsPanel. */
export const CARE_PLAN_RISK_TYPE_LABELS: Record<InitialAssessmentRiskType, string> = {
  FALLS: 'Falls',
  MEDICATION: 'Medication',
  SKIN_INTEGRITY: 'Skin integrity',
  CHOKING: 'Choking',
  NUTRITION: 'Nutrition',
  HYDRATION: 'Hydration',
  FIRE: 'Fire',
  HOME_ENVIRONMENT: 'Home environment',
  MOVING_HANDLING: 'Moving & handling',
  SAFEGUARDING: 'Safeguarding',
  FINANCE: 'Finance',
  LONE_WORKER: 'Lone worker',
  INFECTION_CONTROL: 'Infection control',
  OTHER: 'Other',
}

export type CarePlanIaRiskDisplay = {
  id: string
  name: string
  riskLevel: InitialAssessmentRiskLevel
  reason: string
  status: InitialAssessmentRiskRecord['status']
  source: 'initial_assessment'
  sourceLabel: string
}

function normalizeRiskText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function textsEqualIgnoreCase(a: string, b: string): boolean {
  return normalizeRiskText(a).toLowerCase() === normalizeRiskText(b).toLowerCase()
}

function looksLikeQuestion(text: string): boolean {
  const t = normalizeRiskText(text)
  if (!t) return false
  if (t.endsWith('?')) return true
  return /^(any|is|are|does|do|has|have|was|were|please\s+confirm)\b/i.test(t)
}

function isYesNoStub(text: string): boolean {
  return /^(yes|no|n\/a|na|-|—)$/i.test(normalizeRiskText(text))
}

function isMeaningfulStatement(description: string, question: string): boolean {
  const t = normalizeRiskText(description)
  if (!t || isYesNoStub(t)) return false
  if (looksLikeQuestion(t)) return false
  // Description that is only a copy of the question prompt is not a statement reason
  if (question && textsEqualIgnoreCase(t, question)) return false
  return t.length >= 3
}

function stripQuestionFraming(text: string): string {
  return normalizeRiskText(text)
    .replace(/\?+$/g, '')
    .replace(/^(any|is|are|does|do|has|have|was|were|please\s+confirm)\s+/i, '')
    .replace(/\s+identified$/i, '')
    .trim()
}

/**
 * Turn a yes/no-style IA question prompt into a clinical reason statement.
 * Never returns the raw question text.
 */
export function phraseIaRiskReasonFromPrompt(text: string): string {
  const stripped = stripQuestionFraming(text)
  if (!stripped) return 'Identified from Initial Assessment'
  const body = stripped.charAt(0).toUpperCase() + stripped.slice(1)
  if (/(identified|required|present|noted|recorded)$/i.test(body)) return body
  return `${body} identified`
}

export type IaRiskReasonInput = Pick<
  InitialAssessmentRiskRecord,
  'description' | 'sourceQuestionText'
> & {
  /** Optional answer/value when available from a richer payload (presentation only). */
  answerValue?: string | null
}

/**
 * Reason priority (presentation only):
 * 1. answer/value when present and meaningful
 * 2. risk description when it is a statement (not a question prompt)
 * 3. phrase derived from source question (never raw question-only text)
 */
export function selectIaRiskReason(record: IaRiskReasonInput): string {
  const answer = normalizeRiskText(record.answerValue ?? '')
  const description = normalizeRiskText(record.description ?? '')
  const question = normalizeRiskText(record.sourceQuestionText ?? '')

  if (answer && !isYesNoStub(answer) && !looksLikeQuestion(answer)) {
    return answer
  }

  if (answer && isYesNoStub(answer) && (description || question)) {
    const prompt = isMeaningfulStatement(description, question)
      ? description
      : question || description
    if (prompt && looksLikeQuestion(prompt)) {
      return `${answer.charAt(0).toUpperCase()}${answer.slice(1).toLowerCase()} — ${phraseIaRiskReasonFromPrompt(prompt)}`
    }
    if (isMeaningfulStatement(description, question)) return description
  }

  if (isMeaningfulStatement(description, question)) {
    return description
  }

  const prompt = description || question
  if (prompt) return phraseIaRiskReasonFromPrompt(prompt)

  return 'Identified from Initial Assessment'
}

/** Explicit OTHER question → display name mappings. */
const OTHER_RISK_NAME_RULES: Array<{ match: RegExp; name: string }> = [
  { match: /restricted\s+to\s+bed/i, name: 'Bed Mobility Risk' },
  { match: /pain\s*(or|\/|and)?\s*distress/i, name: 'Pain / Distress Risk' },
  { match: /bed\s*bound|bedbound|bed\s*mobility/i, name: 'Bed Mobility Risk' },
  { match: /sleep(ing)?\s*(disturb|pattern|night)/i, name: 'Sleep Risk' },
  { match: /confusion|disorient/i, name: 'Confusion / Orientation Risk' },
  { match: /aggression|challenging\s+behav/i, name: 'Behaviour Risk' },
]

function titleCaseWords(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      if (w.toLowerCase() === 'or') return '/'
      if (w.length <= 2 && w === w.toUpperCase()) return w
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    })
    .join(' ')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Derive a display name for OTHER risks from description / source question.
 * Falls back to "Other Risk" only when nothing useful can be derived.
 */
export function deriveOtherRiskDisplayName(
  description: string,
  sourceQuestionText?: string | null,
): string {
  const source = normalizeRiskText(description) || normalizeRiskText(sourceQuestionText ?? '')
  if (!source) return 'Other Risk'

  for (const rule of OTHER_RISK_NAME_RULES) {
    if (rule.match.test(source)) return rule.name
  }

  const stripped = stripQuestionFraming(source)
  if (!stripped || stripped.length < 3) return 'Other Risk'

  let label = titleCaseWords(stripped)
  if (!/risk$/i.test(label)) label = `${label} Risk`
  if (label.length > 60) return 'Other Risk'
  return label
}

export function displayNameForIaRisk(
  record: Pick<InitialAssessmentRiskRecord, 'riskType' | 'description' | 'sourceQuestionText'>,
): string {
  if (record.riskType === 'OTHER') {
    return deriveOtherRiskDisplayName(record.description, record.sourceQuestionText)
  }
  const typeLabel = CARE_PLAN_RISK_TYPE_LABELS[record.riskType] ?? record.riskType
  return typeLabel.toLowerCase().endsWith('risk') ? typeLabel : `${typeLabel} Risk`
}

export function formatIaAssessmentSourceLine(submittedAt?: string | null): string {
  if (!submittedAt) return 'Source: Initial Assessment'
  const d = new Date(submittedAt)
  if (Number.isNaN(d.getTime())) return 'Source: Initial Assessment'
  const formatted = d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `Source: Initial Assessment · ${formatted}`
}

/**
 * Map IA risk records for Care Plan Risk Profile display.
 * Does not write into __meta.riskItems — IA stays in InitialAssessmentRiskRecord.
 */
export function mapIaRiskRecordsForCarePlanProfile(
  records: InitialAssessmentRiskRecord[],
  options?: { submittedAt?: string | null },
): CarePlanIaRiskDisplay[] {
  const sourceLabel = formatIaAssessmentSourceLine(options?.submittedAt)
  return records
    .filter((r) => r.status !== 'CLOSED')
    .map((r) => ({
      id: r.id,
      name: displayNameForIaRisk(r),
      riskLevel: r.riskLevel,
      reason: selectIaRiskReason(r),
      status: r.status,
      source: 'initial_assessment' as const,
      sourceLabel,
    }))
}

/** Manual risks from draft only — never merge IA records into this list. */
export function manualRiskItemsFromDraft(values: CarePlanDraftValues): CarePlanRiskItem[] {
  return parseRiskItems(values)
}

/**
 * Assert IA risks are not present in draft risk meta (publish payload invariant).
 * IA ids must never be written into __meta.riskItems.
 */
export function draftRiskMetaContainsOnlyManualIds(
  values: CarePlanDraftValues,
  iaRiskIds: ReadonlySet<string>,
): boolean {
  const manual = parseRiskItems(values)
  return manual.every((item) => !iaRiskIds.has(item.id))
}

export function applyManualRiskItems(
  values: CarePlanDraftValues,
  items: CarePlanRiskItem[],
): CarePlanDraftValues {
  return {
    ...values,
    [CARE_PLAN_META.riskItems]: serializeRiskItems(items),
  }
}

export function formatRiskLevelLabel(level: InitialAssessmentRiskLevel): string {
  switch (level) {
    case 'HIGH':
      return 'High'
    case 'MEDIUM':
      return 'Medium'
    case 'LOW':
      return 'Low'
    default:
      return level
  }
}

/** Exported for tests — reason must never be raw question-only text. */
export function reasonIsNotRawQuestionOnly(reason: string): boolean {
  const t = normalizeRiskText(reason)
  if (!t) return false
  if (t.endsWith('?')) return false
  if (/^(any|is|are|does|do|has|have)\b/i.test(t) && !/\bidentified\b/i.test(t)) return false
  return true
}
