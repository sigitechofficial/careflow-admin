import type {
  CarePlanComposeResult,
  CarePlanFieldProvenance,
  CarePlanFieldSuggestion,
} from '@/features/service-users/care-plans/types'

export type CarePlanDraftComposedFrom = Record<string, unknown> & {
  fieldProvenance?: Record<string, CarePlanFieldProvenance>
  ignoredSuggestionIds?: string[]
}

export function isExplicitSuggestionCompose(
  compose: Pick<CarePlanComposeResult, 'suggestionMode'> | null | undefined,
): boolean {
  return compose?.suggestionMode === 'explicit'
}

/**
 * Whether Create Plan may copy compose.values into clinical draft fields.
 * Explicit suggestion mode never auto-fills. Empty generic compose still
 * creates a draft — that is a separate decision from this flag.
 */
export function shouldWriteComposeValuesToDraft(
  compose: Pick<CarePlanComposeResult, 'suggestionMode'> | null | undefined,
): boolean {
  if (!compose || isExplicitSuggestionCompose(compose)) return false
  return true
}

export function clinicalValuesForCreatePlanDraft(
  compose: Pick<CarePlanComposeResult, 'suggestionMode' | 'values'> | null | undefined,
): Record<string, string | boolean> {
  if (!shouldWriteComposeValuesToDraft(compose)) return {}
  return compose?.values ?? {}
}

/**
 * Create Plan always needs a draft row (empty is allowed). Do not replace an
 * existing explicit-mode draft — that would wipe user-entered values with {}.
 */
export function shouldReplaceDraftOnCreatePlan(
  compose: Pick<CarePlanComposeResult, 'suggestionMode'> | null | undefined,
  hasExistingDraft: boolean,
): boolean {
  if (isExplicitSuggestionCompose(compose) && hasExistingDraft) return false
  return true
}

export function isCarePlanFieldEmpty(value: string | boolean | null | undefined): boolean {
  if (value == null) return true
  if (typeof value === 'boolean') return false
  return value.trim() === ''
}

export function carePlanValuesEqual(
  current: string | boolean | null | undefined,
  suggested: string | boolean | null,
): boolean {
  if (suggested == null) return false
  if (typeof current === 'boolean' || typeof suggested === 'boolean') {
    return Boolean(current) === Boolean(suggested) && current !== '' && current != null
  }
  return String(current ?? '').trim() === String(suggested).trim()
}

export function suggestionConflictState(
  current: string | boolean | null | undefined,
  suggestion: CarePlanFieldSuggestion,
): 'empty' | 'match' | 'conflict' | 'context' {
  if (suggestion.kind !== 'value' || suggestion.suggestedValue == null) return 'context'
  if (isCarePlanFieldEmpty(current)) return 'empty'
  if (carePlanValuesEqual(current, suggestion.suggestedValue)) return 'match'
  return 'conflict'
}

export function readIgnoredSuggestionIds(composedFrom: unknown): string[] {
  if (!composedFrom || typeof composedFrom !== 'object' || Array.isArray(composedFrom)) return []
  const raw = (composedFrom as CarePlanDraftComposedFrom).ignoredSuggestionIds
  return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : []
}

export function readFieldProvenance(composedFrom: unknown): Record<string, CarePlanFieldProvenance> {
  if (!composedFrom || typeof composedFrom !== 'object' || Array.isArray(composedFrom)) return {}
  const raw = (composedFrom as CarePlanDraftComposedFrom).fieldProvenance
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return raw
}

export function visibleFieldSuggestion(
  suggestions: CarePlanFieldSuggestion[] | undefined,
  fieldKey: string,
  ignoredIds: string[],
): CarePlanFieldSuggestion | undefined {
  const ignored = new Set(ignoredIds)
  return (suggestions ?? []).find((item) => item.targetFieldKey === fieldKey && !ignored.has(item.id))
}

export function formatSuggestionSourceDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function displayCarePlanValue(value: string | boolean | null | undefined): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

export function parseCarePlanYesNoValue(
  value: string | boolean | null | undefined,
): boolean | undefined {
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  return undefined
}

export function applySuggestionToValues(
  values: Record<string, string | boolean>,
  suggestion: CarePlanFieldSuggestion,
): Record<string, string | boolean> {
  if (suggestion.kind !== 'value' || suggestion.suggestedValue == null) return values
  return { ...values, [suggestion.targetFieldKey]: suggestion.suggestedValue }
}

export function mergeComposedFromOnUse(params: {
  composedFrom: Record<string, unknown>
  suggestion: CarePlanFieldSuggestion
  acceptedById?: string | null
}): Record<string, unknown> {
  const { composedFrom, suggestion, acceptedById } = params
  const provenance = { ...readFieldProvenance(composedFrom) }
  provenance[suggestion.targetFieldKey] = {
    sourceType: 'INITIAL_ASSESSMENT',
    submissionId: suggestion.submissionId,
    questionId: suggestion.questionId,
    sourceQuestions: suggestion.sourceQuestions,
    acceptedAt: new Date().toISOString(),
    acceptedById: acceptedById ?? null,
    originalValue: suggestion.suggestedValue,
    sourceDate: suggestion.sourceDate,
    userEdited: false,
  }
  return {
    ...composedFrom,
    fieldProvenance: provenance,
    iaSubmissionId: suggestion.submissionId,
  }
}

export function mergeComposedFromOnIgnore(
  composedFrom: Record<string, unknown>,
  suggestionId: string,
): Record<string, unknown> {
  const ignored = new Set(readIgnoredSuggestionIds(composedFrom))
  ignored.add(suggestionId)
  return {
    ...composedFrom,
    ignoredSuggestionIds: [...ignored],
  }
}

export function markProvenanceEdited(
  composedFrom: Record<string, unknown>,
  fieldKey: string,
  nextValue: string | boolean,
): Record<string, unknown> {
  const provenance = readFieldProvenance(composedFrom)
  const existing = provenance[fieldKey]
  if (!existing) return composedFrom
  const original = existing.originalValue
  const edited = !carePlanValuesEqual(nextValue, original)
  if (existing.userEdited === edited) return composedFrom
  return {
    ...composedFrom,
    fieldProvenance: {
      ...provenance,
      [fieldKey]: { ...existing, userEdited: edited },
    },
  }
}

export function hydrateCarePlanEditorValues(params: {
  draftValues?: Record<string, string | boolean> | null
  compose: Pick<CarePlanComposeResult, 'suggestionMode' | 'values'> | null | undefined
}): Record<string, string | boolean> | 'wait' {
  const draftValues = params.draftValues ?? {}
  if (Object.keys(draftValues).length > 0) {
    return draftValues
  }
  if (!params.compose) return 'wait'
  if (isExplicitSuggestionCompose(params.compose)) {
    return draftValues
  }
  return params.compose.values ?? {}
}
