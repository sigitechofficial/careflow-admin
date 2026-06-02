import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

export type QuestionOption = { value: string; label: string }

const LEGACY_WOUND_TYPE_LABELS: Record<string, string> = {
  other: 'Other',
}

export function usesBodyMapWoundTypeLookup(question: InitialAssessmentQuestion): boolean {
  const meta = question.metadata
  return Boolean(
    meta &&
      typeof meta === 'object' &&
      !Array.isArray(meta) &&
      meta.optionsLookup === 'body_map_wound_types',
  )
}

export function resolveQuestionOptions(
  question: InitialAssessmentQuestion,
  woundTypeCatalog?: QuestionOption[],
): QuestionOption[] {
  if (usesBodyMapWoundTypeLookup(question)) {
    return woundTypeCatalog ?? []
  }
  return parseQuestionOptions(question.options)
}

export function labelForQuestionOptionValue(
  value: string,
  question: InitialAssessmentQuestion,
  woundTypeCatalog?: QuestionOption[],
): string {
  const opts = resolveQuestionOptions(question, woundTypeCatalog)
  return opts.find((o) => o.value === value)?.label ?? LEGACY_WOUND_TYPE_LABELS[value] ?? value
}

export function parseQuestionOptions(raw: unknown): QuestionOption[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.map((entry) => {
      if (typeof entry === 'string') return { value: entry, label: entry }
      if (entry && typeof entry === 'object') {
        const o = entry as Record<string, unknown>
        const value = String(o.value ?? o.id ?? o.label ?? '')
        const label = String(o.label ?? o.value ?? o.id ?? '')
        if (!value && !label) return null
        return { value: value || label, label: label || value }
      }
      return null
    }).filter((x): x is QuestionOption => x != null)
  }
  if (typeof raw === 'object' && raw !== null) {
    const o = raw as Record<string, unknown>
    if (Array.isArray(o.options)) return parseQuestionOptions(o.options)
  }
  return []
}
