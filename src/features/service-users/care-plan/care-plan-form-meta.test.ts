import {
  CARE_PLAN_META,
  CARE_PLAN_SUMMARY_PLACEHOLDER,
  REVIEW_SUMMARY_PLACEHOLDER,
  defaultCarePlanSummary,
  defaultReviewSummary,
  metaString,
} from './care-plan-form-meta'
import { clinicalValuesForCreatePlanDraft, hydrateCarePlanEditorValues } from '../care-plans/care-plan-suggestion-state'

const MEDICATION_DEFAULT_LEAK = /medication administration|blister pack|missed doses/i

describe('Care Plan review summary defaults', () => {
  it('starts a new Falls plan with an empty review summary', () => {
    expect(defaultReviewSummary('Muhammad Salah')).toBe('')
    expect(metaString({}, CARE_PLAN_META.reviewSummary)).toBe('')
  })

  it('starts a new Falls plan with an empty care plan summary', () => {
    expect(defaultCarePlanSummary('Muhammad Salah')).toBe('')
    expect(metaString({}, CARE_PLAN_META.carePlanSummary)).toBe('')
  })

  it('does not inject medication, blister-pack, or missed-dose default text', () => {
    expect(defaultReviewSummary('Test User')).not.toMatch(MEDICATION_DEFAULT_LEAK)
    expect(defaultCarePlanSummary('Test User')).not.toMatch(MEDICATION_DEFAULT_LEAK)
    const hydrated = hydrateCarePlanEditorValues({
      draftValues: {},
      compose: { suggestionMode: 'explicit', values: {} },
    })
    expect(hydrated).toEqual({})
    expect(JSON.stringify(hydrated)).not.toMatch(MEDICATION_DEFAULT_LEAK)
  })

  it('keeps an existing saved review summary', () => {
    const saved = 'Falls review: frame in use, no further incidents this period.'
    expect(metaString({ [CARE_PLAN_META.reviewSummary]: saved }, CARE_PLAN_META.reviewSummary)).toBe(
      saved,
    )
  })

  it('keeps an existing saved care plan summary', () => {
    const saved = 'Support transfers with one carer and a walking frame.'
    expect(
      metaString({ [CARE_PLAN_META.carePlanSummary]: saved }, CARE_PLAN_META.carePlanSummary),
    ).toBe(saved)
  })

  it('does not persist empty placeholder text as a value', () => {
    expect(REVIEW_SUMMARY_PLACEHOLDER).toBe('Enter review summary')
    expect(CARE_PLAN_SUMMARY_PLACEHOLDER).toBe('Enter care plan summary')
    expect(defaultReviewSummary()).not.toBe(REVIEW_SUMMARY_PLACEHOLDER)
    expect(defaultCarePlanSummary()).not.toBe(CARE_PLAN_SUMMARY_PLACEHOLDER)
  })

  it('does not PATCH invented summary content when opening a new Care Plan', () => {
    expect(
      clinicalValuesForCreatePlanDraft({ suggestionMode: 'explicit', values: {} }),
    ).toEqual({})
    expect(
      hydrateCarePlanEditorValues({
        draftValues: {},
        compose: { suggestionMode: 'explicit', values: {} },
      }),
    ).toEqual({})
  })
})
