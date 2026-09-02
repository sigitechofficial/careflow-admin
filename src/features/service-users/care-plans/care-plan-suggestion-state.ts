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

/** Hybrid = partial auto-prefill (tier A) plus suggestions (tier B), e.g. Home Support Plan. */
export function isHybridCompose(
  compose: Pick<CarePlanComposeResult, 'suggestionMode'> | null | undefined,
): boolean {
  return compose?.suggestionMode === 'hybrid'
}

/** Plans that surface IA suggestions in the editor (Falls explicit, HSP hybrid). */
export function isSuggestionGatedCompose(
  compose: Pick<CarePlanComposeResult, 'suggestionMode'> | null | undefined,
): boolean {
  return isExplicitSuggestionCompose(compose) || isHybridCompose(compose)
}

/**
 * Whether Create Plan may copy compose.values into clinical draft fields.
 * Explicit suggestion mode never auto-fills. Hybrid and generic compose may.
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
  if (hasExistingDraft && isSuggestionGatedCompose(compose)) return false
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

/** Merge top-level compose.provenance into composedFrom.fieldProvenance for draft persistence. */
export function mergeComposeProvenanceFromComposeResult(
  compose: Pick<CarePlanComposeResult, 'composedFrom' | 'provenance'>,
): Record<string, unknown> {
  const base = compose.composedFrom ?? {}
  const topLevel = compose.provenance ?? {}
  if (!Object.keys(topLevel).length) return base
  return {
    ...base,
    fieldProvenance: {
      ...readFieldProvenance(base),
      ...topLevel,
    },
  }
}

/** Merge draft metadata with compose provenance when opening the editor. */
export function hydrateComposedFromForEditor(params: {
  draftComposedFrom?: Record<string, unknown> | null
  compose: Pick<CarePlanComposeResult, 'composedFrom' | 'provenance'> | null | undefined
}): Record<string, unknown> {
  const draft = params.draftComposedFrom ?? {}
  const composeMerged = params.compose
    ? mergeComposeProvenanceFromComposeResult(params.compose)
    : {}
  const draftIgnored = readIgnoredSuggestionIds(draft)
  const composeIgnored = readIgnoredSuggestionIds(composeMerged)

  return {
    ...composeMerged,
    ...draft,
    fieldProvenance: {
      ...readFieldProvenance(composeMerged),
      ...readFieldProvenance(draft),
    },
    ignoredSuggestionIds: draftIgnored.length > 0 ? draftIgnored : composeIgnored,
  }
}

export function isAutoPrefilledField(composedFrom: unknown, fieldKey: string): boolean {
  const entry = readFieldProvenance(composedFrom)[fieldKey]
  return Boolean(entry?.autoPrefilled && !entry.userEdited)
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
  if (!isCarePlanFieldEmpty(values[suggestion.targetFieldKey])) return values
  return { ...values, [suggestion.targetFieldKey]: suggestion.suggestedValue }
}

export function mergeComposedFromOnEdit(params: {
  composedFrom: Record<string, unknown>
  suggestion: CarePlanFieldSuggestion
  acceptedById?: string | null
}): Record<string, unknown> {
  const next = mergeComposedFromOnUse(params)
  const provenance = { ...readFieldProvenance(next) }
  const existing = provenance[params.suggestion.targetFieldKey]
  if (!existing) return next
  provenance[params.suggestion.targetFieldKey] = { ...existing, userEdited: true }
  return { ...next, fieldProvenance: provenance }
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

/**
 * Hybrid refresh: replace auto-prefilled IA fields from compose; keep user-edited values.
 * Empty fields still accept compose values (same as empty_only).
 */
export function mergeHybridRefreshValues(
  current: Record<string, string | boolean>,
  composed: Record<string, string | boolean>,
  composedFrom: Record<string, unknown>,
): Record<string, string | boolean> {
  const provenance = readFieldProvenance(composedFrom)
  const next = { ...current }

  for (const [key, value] of Object.entries(composed)) {
    const entry = provenance[key]
    if (entry?.userEdited === true) continue
    if (entry?.autoPrefilled === true || isCarePlanFieldEmpty(current[key])) {
      next[key] = value
    }
  }

  return next
}

export function hydrateCarePlanEditorValues(params: {
  draftValues?: Record<string, string | boolean> | null
  /**
   * Snapshot from the latest published version. When provided (published Live view
   * with no draft), this is preferred over compose.values so accepted IA
   * suggestions persist after publish.
   */
  publishedValues?: Record<string, string | boolean> | null
  compose: Pick<CarePlanComposeResult, 'suggestionMode' | 'values'> | null | undefined
}): Record<string, string | boolean> | 'wait' {
  const draftValues = params.draftValues ?? {}
  if (Object.keys(draftValues).length > 0) {
    return draftValues
  }
  // Published Live/"View plan": draft was consumed on publish — restore the version snapshot.
  if (params.publishedValues != null) {
    return params.publishedValues
  }
  if (!params.compose) return 'wait'
  if (isExplicitSuggestionCompose(params.compose)) {
    return draftValues
  }
  // Hybrid and Medication-style compose: prefill empty drafts from compose.values.
  return params.compose.values ?? {}
}

/**
 * Live/"View plan" after publish has no draft row. Load values from the published
 * version instead of hybrid compose.values (which omits accepted suggestion fields).
 */
export function shouldHydrateFromPublishedVersion(params: {
  draft?: { values?: Record<string, string | boolean> | null } | null
  latestPublishedVersionId?: string | null
}): boolean {
  return !params.draft && Boolean(params.latestPublishedVersionId)
}
