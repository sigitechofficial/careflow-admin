import { mergeComposedValues } from './hooks/useServiceUserCarePlanInstances'
import { deriveCarePlanDisplayState } from '@/features/service-users/care-plan/care-plan-display-state'
import { shouldShowCarePlanIaSuggestions } from '@/features/service-users/care-plans/care-plan-instance-status'
import {
  applySuggestionToValues,
  carePlanValuesEqual,
  clinicalValuesForCreatePlanDraft,
  hydrateCarePlanEditorValues,
  hydrateComposedFromForEditor,
  isAutoPrefilledField,
  isExplicitSuggestionCompose,
  isHybridCompose,
  isSuggestionGatedCompose,
  mergeComposeProvenanceFromComposeResult,
  mergeHybridRefreshValues,
  mergeComposedFromOnIgnore,
  mergeComposedFromOnUse,
  markProvenanceEdited,
  parseCarePlanYesNoValue,
  shouldHydrateFromPublishedVersion,
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

  it('shows IA suggestion cards only for draft edit modes, not published view', () => {
    expect(shouldShowCarePlanIaSuggestions('DRAFT')).toBe(true)
    expect(shouldShowCarePlanIaSuggestions('PUBLISHED_WITH_DRAFT')).toBe(true)
    expect(shouldShowCarePlanIaSuggestions('PUBLISHED')).toBe(false)
    expect(shouldShowCarePlanIaSuggestions(undefined)).toBe(false)
    expect(shouldShowCarePlanIaSuggestions(null)).toBe(false)
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

describe('Hybrid compose editor state', () => {
  const hybridCompose = {
    suggestionMode: 'hybrid' as const,
    values: {
      'sec:lives_alone': true,
      'sec:key_safe_in_use': true,
    },
    composedFrom: {
      mapping: 'home-support-plan-hybrid',
      fieldProvenance: {
        'sec:lives_alone': {
          sourceType: 'INITIAL_ASSESSMENT' as const,
          submissionId: 'ia-hsp-1',
          acceptedAt: '2026-08-19T07:36:44.000Z',
          originalValue: true,
          sourceDate: '2026-08-19T07:36:44.000Z',
          autoPrefilled: true,
          userEdited: false,
        },
      },
    },
    provenance: {
      'sec:key_safe_in_use': {
        sourceType: 'INITIAL_ASSESSMENT' as const,
        submissionId: 'ia-hsp-1',
        acceptedAt: '2026-08-19T07:36:44.000Z',
        originalValue: true,
        sourceDate: '2026-08-19T07:36:44.000Z',
        autoPrefilled: true,
        userEdited: false,
      },
    },
  }

  it('identifies hybrid compose mode', () => {
    expect(isHybridCompose({ suggestionMode: 'hybrid' })).toBe(true)
    expect(isHybridCompose({ suggestionMode: 'explicit' })).toBe(false)
    expect(isSuggestionGatedCompose({ suggestionMode: 'hybrid' })).toBe(true)
    expect(isSuggestionGatedCompose({ values: { a: '1' } })).toBe(false)
  })

  it('writes hybrid compose values on Create Plan', () => {
    expect(shouldWriteComposeValuesToDraft(hybridCompose)).toBe(true)
    expect(clinicalValuesForCreatePlanDraft(hybridCompose)).toEqual(hybridCompose.values)
  })

  it('hydrates an empty draft from hybrid compose values', () => {
    expect(
      hydrateCarePlanEditorValues({
        draftValues: {},
        compose: hybridCompose,
      }),
    ).toEqual(hybridCompose.values)
  })

  it('does not overwrite existing draft values for hybrid compose', () => {
    expect(
      hydrateCarePlanEditorValues({
        draftValues: { 'sec:lives_alone': false },
        compose: hybridCompose,
      }),
    ).toEqual({ 'sec:lives_alone': false })
  })

  it('keeps accepted HSP suggestions after publish when opening the live plan', () => {
    const suggestion: CarePlanFieldSuggestion = {
      id: 'hsp:personal-care:ia-1',
      kind: 'value',
      targetFieldKey: 'sec:personal_care',
      targetLabel: 'Personal care tasks',
      targetFieldType: 'TEXTAREA',
      suggestedValue: 'Bathing: assistance of one person',
      displayText: 'Bathing: assistance of one person',
      sourceType: 'INITIAL_ASSESSMENT',
      submissionId: 'ia-1',
      sourceDate: '2026-08-19T07:36:44.000Z',
      sourceQuestions: [],
      transform: 'narrative',
    }

    // 1–3: create draft, accept suggestion, save (draft values + provenance)
    const draftValues = applySuggestionToValues({ ...hybridCompose.values }, suggestion)
    const draftComposedFrom = mergeComposedFromOnUse({
      composedFrom: mergeComposeProvenanceFromComposeResult(hybridCompose),
      suggestion,
      acceptedById: 'user-1',
    })
    expect(draftValues['sec:personal_care']).toBe('Bathing: assistance of one person')

    // Hybrid compose never writes tier-B suggestions into compose.values
    expect(hybridCompose.values).not.toHaveProperty('sec:personal_care')

    // 4: publish copies draft into version, then consumes draft
    const publishedValues = { ...draftValues }
    const publishedComposedFrom = { ...draftComposedFrom }
    expect(shouldHydrateFromPublishedVersion({ draft: null, latestPublishedVersionId: 'ver-1' })).toBe(
      true,
    )
    expect(
      shouldHydrateFromPublishedVersion({
        draft: { values: draftValues },
        latestPublishedVersionId: 'ver-1',
      }),
    ).toBe(false)

    // 5–6: open live plan — no draft; hydrate from published snapshot, not compose.values
    const liveValues = hydrateCarePlanEditorValues({
      draftValues: null,
      publishedValues,
      compose: hybridCompose,
    })
    expect(liveValues).toEqual(publishedValues)
    expect(liveValues['sec:personal_care']).toBe('Bathing: assistance of one person')

    const liveComposedFrom = hydrateComposedFromForEditor({
      draftComposedFrom: publishedComposedFrom,
      compose: null,
    })
    expect(
      (liveComposedFrom.fieldProvenance as Record<string, { originalValue: string | boolean | null }>)[
        'sec:personal_care'
      ]?.originalValue,
    ).toBe('Bathing: assistance of one person')
  })

  it('prefers published values over hybrid compose when draft was consumed', () => {
    const publishedValues = {
      'sec:lives_alone': true,
      'sec:personal_care': 'Accepted suggestion text',
    }
    expect(
      hydrateCarePlanEditorValues({
        draftValues: {},
        publishedValues,
        compose: hybridCompose,
      }),
    ).toEqual(publishedValues)
  })

  it('does not replace an existing hybrid draft on Create Plan', () => {
    expect(shouldReplaceDraftOnCreatePlan(hybridCompose, true)).toBe(false)
    expect(shouldReplaceDraftOnCreatePlan(hybridCompose, false)).toBe(true)
  })

  it('merges compose provenance into composedFrom for editor hydration', () => {
    const merged = hydrateComposedFromForEditor({
      draftComposedFrom: {},
      compose: hybridCompose,
    })
    const provenance = merged.fieldProvenance as Record<string, { autoPrefilled?: boolean }>
    expect(provenance['sec:lives_alone']?.autoPrefilled).toBe(true)
    expect(provenance['sec:key_safe_in_use']?.autoPrefilled).toBe(true)
    expect(isAutoPrefilledField(merged, 'sec:lives_alone')).toBe(true)
  })

  it('marks auto-prefilled provenance as userEdited after a manual edit', () => {
    const composedFrom = mergeComposeProvenanceFromComposeResult(hybridCompose)
    const edited = markProvenanceEdited(composedFrom, 'sec:lives_alone', false)
    expect(
      (edited.fieldProvenance as Record<string, { userEdited: boolean; autoPrefilled: boolean }>)[
        'sec:lives_alone'
      ].userEdited,
    ).toBe(true)
    expect(isAutoPrefilledField(edited, 'sec:lives_alone')).toBe(false)
  })

  it('keeps Falls explicit suggestion-only behaviour unchanged', () => {
    const fallsCompose = { suggestionMode: 'explicit' as const, values: { 'hist:count': '2' } }
    expect(shouldWriteComposeValuesToDraft(fallsCompose)).toBe(false)
    expect(clinicalValuesForCreatePlanDraft(fallsCompose)).toEqual({})
    expect(
      hydrateCarePlanEditorValues({
        draftValues: {},
        compose: fallsCompose,
      }),
    ).toEqual({})
  })

  it('keeps Medication-style auto-prefill behaviour unchanged', () => {
    const medicationCompose = { values: { 'sec:1': 'Prompted', 'sec:2': true } }
    expect(shouldWriteComposeValuesToDraft(medicationCompose)).toBe(true)
    expect(clinicalValuesForCreatePlanDraft(medicationCompose)).toEqual(medicationCompose.values)
    expect(
      hydrateCarePlanEditorValues({
        draftValues: {},
        compose: medicationCompose,
      }),
    ).toEqual(medicationCompose.values)
  })
})

describe('mergeHybridRefreshValues', () => {
  const composedFrom = {
    fieldProvenance: {
      'sec:gp': {
        sourceType: 'INITIAL_ASSESSMENT' as const,
        submissionId: 'ia-1',
        acceptedAt: '2026-08-19T07:36:44.000Z',
        originalValue: 'Registered with local GP practice.',
        sourceDate: '2026-08-19T07:36:44.000Z',
        autoPrefilled: true,
        userEdited: false,
      },
      'sec:manual': {
        sourceType: 'INITIAL_ASSESSMENT' as const,
        submissionId: 'ia-1',
        acceptedAt: '2026-08-19T07:36:44.000Z',
        originalValue: 'User typed this',
        sourceDate: '2026-08-19T07:36:44.000Z',
        autoPrefilled: true,
        userEdited: true,
      },
    },
  }

  it('replaces auto-prefilled draft values with refreshed compose values', () => {
    const current = {
      'sec:gp': '<p>Registered with local GP practice.</p>',
      'sec:empty': '',
    }
    const composed = {
      'sec:gp': 'Registered with local GP practice.',
      'sec:empty': 'Filled from IA',
    }

    expect(mergeHybridRefreshValues(current, composed, composedFrom)).toEqual({
      'sec:gp': 'Registered with local GP practice.',
      'sec:empty': 'Filled from IA',
    })
  })

  it('keeps user-edited fields untouched during hybrid refresh', () => {
    const current = {
      'sec:gp': '<p>Registered with local GP practice.</p>',
      'sec:manual': 'User typed this',
    }
    const composed = {
      'sec:gp': 'Registered with local GP practice.',
      'sec:manual': 'New IA suggestion',
    }

    expect(mergeHybridRefreshValues(current, composed, composedFrom)).toEqual({
      'sec:gp': 'Registered with local GP practice.',
      'sec:manual': 'User typed this',
    })
  })

  it('does not overwrite non-empty fields without auto-prefill provenance', () => {
    const current = { 'sec:other': 'Keep me' }
    const composed = { 'sec:other': 'Replace me' }

    expect(mergeHybridRefreshValues(current, composed, {})).toEqual({
      'sec:other': 'Keep me',
    })
  })
})
