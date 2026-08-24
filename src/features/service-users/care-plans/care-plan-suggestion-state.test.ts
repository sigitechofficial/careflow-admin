import { mergeComposedValues } from './hooks/useServiceUserCarePlanInstances'
import { deriveCarePlanDisplayState } from '@/features/service-users/care-plan/care-plan-display-state'
import {
  applySuggestionToValues,
  carePlanValuesEqual,
  clinicalValuesForCreatePlanDraft,
  hydrateCarePlanEditorValues,
  isExplicitSuggestionCompose,
  mergeComposedFromOnIgnore,
  mergeComposedFromOnUse,
  markProvenanceEdited,
  parseCarePlanYesNoValue,
  shouldReplaceDraftOnCreatePlan,
  shouldWriteComposeValuesToDraft,
  suggestionConflictState,
  visibleFieldSuggestion,
} from './care-plan-suggestion-state'
import type { CarePlanFieldSuggestion } from './types'

const suggestion: CarePlanFieldSuggestion = {
  id: 'falls:count:ia-1:2',
  kind: 'value',
  targetFieldKey: 'hist:count',
  targetLabel: 'Falls in last 12 months',
  targetFieldType: 'NUMBER',
  suggestedValue: '2',
  displayText: '2',
  sourceType: 'INITIAL_ASSESSMENT',
  submissionId: 'ia-1',
  sourceDate: '2026-08-19T07:36:44.000Z',
  sourceQuestions: [],
  transform: 'typed',
}

describe('Falls suggestion editor state', () => {
  it('does not dump compose values for explicit suggestion mode', () => {
    expect(shouldWriteComposeValuesToDraft({ suggestionMode: 'explicit', values: { a: '1' } })).toBe(false)
    expect(shouldWriteComposeValuesToDraft({ values: { a: '1' } })).toBe(true)
    expect(isExplicitSuggestionCompose({ suggestionMode: 'explicit' })).toBe(true)
  })

  it('still creates an empty draft for generic compose with no values', () => {
    expect(shouldWriteComposeValuesToDraft({ values: {} })).toBe(true)
    expect(clinicalValuesForCreatePlanDraft({ values: {} })).toEqual({})
    expect(shouldReplaceDraftOnCreatePlan({ values: {} }, false)).toBe(true)
    expect(deriveCarePlanDisplayState({ displayStatus: 'DRAFT' })).toBe('IN_PROGRESS')
  })

  it('creates an empty Falls draft without writing IA suggestion values', () => {
    const fallsCompose = { suggestionMode: 'explicit' as const, values: { 'hist:count': '2' } }
    expect(shouldWriteComposeValuesToDraft(fallsCompose)).toBe(false)
    expect(clinicalValuesForCreatePlanDraft(fallsCompose)).toEqual({})
    expect(shouldReplaceDraftOnCreatePlan(fallsCompose, false)).toBe(true)
    expect(shouldReplaceDraftOnCreatePlan(fallsCompose, true)).toBe(false)
    expect(deriveCarePlanDisplayState({ displayStatus: 'DRAFT' })).toBe('IN_PROGRESS')
  })

  it('still writes custom-compose values for Medication-style Create Plan', () => {
    const medicationCompose = { values: { 'sec:1': 'Prompted', 'sec:2': true } }
    expect(shouldWriteComposeValuesToDraft(medicationCompose)).toBe(true)
    expect(clinicalValuesForCreatePlanDraft(medicationCompose)).toEqual(medicationCompose.values)
    expect(shouldReplaceDraftOnCreatePlan(medicationCompose, false)).toBe(true)
  })

  it('hydrates Falls from existing draft only and leaves blanks blank', () => {
    expect(
      hydrateCarePlanEditorValues({
        draftValues: {},
        compose: { suggestionMode: 'explicit', values: { 'hist:count': '2' } },
      }),
    ).toEqual({})
    expect(
      hydrateCarePlanEditorValues({
        draftValues: { 'hist:count': '1' },
        compose: { suggestionMode: 'explicit', values: { 'hist:count': '2' } },
      }),
    ).toEqual({ 'hist:count': '1' })
  })

  it('does not write IA values to Falls draft fields until Use is clicked', () => {
    const hydrated = hydrateCarePlanEditorValues({
      draftValues: {},
      compose: { suggestionMode: 'explicit', values: { 'hist:count': '2', 'hist:injury': true } },
    })
    expect(hydrated).toEqual({})
    expect(hydrated).not.toEqual(expect.objectContaining({ 'hist:count': '2' }))
  })

  it('opens a generic empty-compose editor from an empty draft without waiting', () => {
    expect(
      hydrateCarePlanEditorValues({
        draftValues: {},
        compose: { values: {} },
      }),
    ).toEqual({})
  })

  it('still waits for non-Falls compose when the draft is empty', () => {
    expect(hydrateCarePlanEditorValues({ draftValues: {}, compose: null })).toBe('wait')
    expect(
      hydrateCarePlanEditorValues({
        draftValues: {},
        compose: { values: { 'sec:1': 'Prompted' } },
      }),
    ).toEqual({ 'sec:1': 'Prompted' })
  })

  it('Use populates the field without touching other keys', () => {
    expect(applySuggestionToValues({ notes: 'keep' }, suggestion)).toEqual({
      notes: 'keep',
      'hist:count': '2',
    })
  })

  it('Ignore persists the suggestion id on the draft metadata', () => {
    const values = { notes: 'keep' }
    const next = mergeComposedFromOnIgnore({ iaSubmissionId: 'ia-1' }, suggestion.id)
    expect(values).toEqual({ notes: 'keep' })
    expect(next.ignoredSuggestionIds).toEqual([suggestion.id])
    expect(visibleFieldSuggestion([suggestion], 'hist:count', next.ignoredSuggestionIds as string[])).toBeUndefined()
  })

  it('a new suggestion id can reappear after ignore', () => {
    const ignored = mergeComposedFromOnIgnore({}, suggestion.id)
    const newer = { ...suggestion, id: 'falls:count:ia-2:4', submissionId: 'ia-2', suggestedValue: '4' }
    expect(visibleFieldSuggestion([newer], 'hist:count', ignored.ignoredSuggestionIds as string[])?.id).toBe(
      newer.id,
    )
  })

  it('does not treat an equal current value as a conflict', () => {
    expect(suggestionConflictState('2', suggestion)).toBe('match')
    expect(carePlanValuesEqual(true, true)).toBe(true)
  })

  it('shows a conflict when the current value differs', () => {
    expect(suggestionConflictState('1', suggestion)).toBe('conflict')
    expect(suggestionConflictState('', suggestion)).toBe('empty')
  })

  it('Keep current leaves values untouched and can suppress the chip', () => {
    const values = { 'hist:count': '1' }
    const composedFrom = mergeComposedFromOnIgnore({}, suggestion.id)
    expect(values['hist:count']).toBe('1')
    expect(visibleFieldSuggestion([suggestion], 'hist:count', composedFrom.ignoredSuggestionIds as string[])).toBeUndefined()
  })

  it('does not change empty_only merge for other care plans', () => {
    expect(mergeComposedValues({ notes: 'keep' }, { notes: 'new', extra: 'filled' }, 'empty_only')).toEqual({
      notes: 'keep',
      extra: 'filled',
    })
  })

  it('stores historical submission provenance when a history value is used', () => {
    const historical = { ...suggestion, id: 'hist-old', submissionId: 'ia-old', sourceDate: '2026-05-11T00:00:00.000Z' }
    const composedFrom = mergeComposedFromOnUse({
      composedFrom: {},
      suggestion: historical,
      acceptedById: 'user-1',
    })
    const provenance = (composedFrom.fieldProvenance as Record<string, { submissionId: string }>)['hist:count']
    expect(provenance?.submissionId).toBe('ia-old')
    expect(composedFrom.iaSubmissionId).toBe('ia-old')
  })

  it('records IA provenance on Use and marks userEdited after a later edit', () => {
    const composedFrom = mergeComposedFromOnUse({
      composedFrom: {},
      suggestion,
      acceptedById: 'user-1',
    })
    const provenance = (
      composedFrom.fieldProvenance as Record<
        string,
        {
          sourceType: string
          submissionId: string
          sourceQuestions: unknown
          sourceDate: string
          acceptedAt: string
          acceptedById: string
          originalValue: string
          userEdited: boolean
        }
      >
    )['hist:count']
    expect(provenance.sourceType).toBe('INITIAL_ASSESSMENT')
    expect(provenance.submissionId).toBe('ia-1')
    expect(provenance.sourceQuestions).toEqual([])
    expect(provenance.sourceDate).toBe('2026-08-19T07:36:44.000Z')
    expect(provenance.acceptedById).toBe('user-1')
    expect(provenance.originalValue).toBe('2')
    expect(provenance.userEdited).toBe(false)
    expect(typeof provenance.acceptedAt).toBe('string')

    const edited = markProvenanceEdited(composedFrom, 'hist:count', '3')
    expect(
      (edited.fieldProvenance as Record<string, { userEdited: boolean; sourceType: string }>)['hist:count']
        .userEdited,
    ).toBe(true)
    expect(
      (edited.fieldProvenance as Record<string, { sourceType: string }>)['hist:count'].sourceType,
    ).toBe('INITIAL_ASSESSMENT')
  })

  it('keeps Ignore after a save/reload of composedFrom', () => {
    const saved = mergeComposedFromOnIgnore({ iaSubmissionId: 'ia-1' }, suggestion.id)
    expect(
      visibleFieldSuggestion([suggestion], 'hist:count', saved.ignoredSuggestionIds as string[]),
    ).toBeUndefined()
  })

  it('maps a successful publish without leftover draft to Live, not Update in progress', () => {
    expect(deriveCarePlanDisplayState({ displayStatus: 'PUBLISHED' })).toBe('LIVE')
    expect(deriveCarePlanDisplayState({ displayStatus: 'PUBLISHED_WITH_DRAFT' })).toBe('LIVE_WITH_DRAFT')
  })

  it('does not write context-only suggestions into draft values', () => {
    const context: CarePlanFieldSuggestion = {
      ...suggestion,
      id: 'falls:count:ctx',
      kind: 'context',
      suggestedValue: null,
      displayText: 'Initial Assessment confirms falls in the last 12 months, but the number of falls was not recorded.',
      transform: 'context',
    }
    expect(applySuggestionToValues({ notes: 'keep' }, context)).toEqual({ notes: 'keep' })
    expect(suggestionConflictState(undefined, context)).toBe('context')
  })

  it('treats missing YES_NO as unanswered, not No', () => {
    expect(parseCarePlanYesNoValue(undefined)).toBeUndefined()
    expect(parseCarePlanYesNoValue(null)).toBeUndefined()
    expect(parseCarePlanYesNoValue('')).toBeUndefined()
    expect(parseCarePlanYesNoValue(false)).toBe(false)
    expect(parseCarePlanYesNoValue(true)).toBe(true)
    expect(parseCarePlanYesNoValue('false')).toBe(false)
    expect(parseCarePlanYesNoValue('true')).toBe(true)
  })

  it('does not PATCH false when opening a Falls form with a missing YES_NO', () => {
    const hydrated = hydrateCarePlanEditorValues({
      draftValues: {},
      compose: { suggestionMode: 'explicit', values: { 'hist:injury': false } },
    })
    expect(hydrated).toEqual({})
    expect(parseCarePlanYesNoValue((hydrated as Record<string, string | boolean>)['hist:injury'])).toBeUndefined()
    expect(clinicalValuesForCreatePlanDraft({ suggestionMode: 'explicit', values: { 'hist:injury': false } })).toEqual({})
  })
})
