import { describe, expect, it } from 'vitest'
import type { CarePlanInstanceDisplayStatus } from '@/features/service-users/care-plans/types'
import {
  deriveCarePlanDisplayState,
  displayStateForForm,
  filterCarePlansByNameSearch,
  groupFormsByDisplayState,
  groupPendingRecommendationsByForm,
  lifecycleFormIds,
  pendingRecommendationsForRecommendedSection,
  recommendationStatusForForm,
  splitEvidencePreview,
  CARE_PLAN_PAGE_SECTION_ORDER,
} from './care-plan-display-state'

function rec(
  formId: string | null,
  status: 'pending' | 'accepted' | 'declined',
) {
  return { carePathwayFormId: formId ?? undefined, status }
}

describe('deriveCarePlanDisplayState', () => {
  it('maps PUBLISHED_WITH_DRAFT to LIVE_WITH_DRAFT before other states', () => {
    expect(
      deriveCarePlanDisplayState({
        displayStatus: 'PUBLISHED_WITH_DRAFT',
        recommendationStatus: 'pending',
      }),
    ).toBe('LIVE_WITH_DRAFT')
  })

  it('maps PUBLISHED to LIVE', () => {
    expect(deriveCarePlanDisplayState({ displayStatus: 'PUBLISHED' })).toBe('LIVE')
  })

  it('maps DRAFT to IN_PROGRESS even when a recommendation is still pending', () => {
    expect(
      deriveCarePlanDisplayState({
        displayStatus: 'DRAFT',
        recommendationStatus: 'pending',
      }),
    ).toBe('IN_PROGRESS')
  })

  it('maps an accepted recommendation without an instance to IN_PROGRESS', () => {
    expect(deriveCarePlanDisplayState({ recommendationStatus: 'accepted' })).toBe('IN_PROGRESS')
  })

  it('maps a pending recommendation to RECOMMENDED', () => {
    expect(deriveCarePlanDisplayState({ recommendationStatus: 'pending' })).toBe('RECOMMENDED')
  })

  it('treats NOT_STARTED as no instance', () => {
    expect(
      deriveCarePlanDisplayState({
        displayStatus: 'NOT_STARTED',
        recommendationStatus: 'pending',
      }),
    ).toBe('RECOMMENDED')
    expect(deriveCarePlanDisplayState({ displayStatus: 'NOT_STARTED' })).toBe('AVAILABLE')
  })

  it('does not treat a declined recommendation as Recommended or In Progress', () => {
    expect(deriveCarePlanDisplayState({ recommendationStatus: 'declined' })).toBe('AVAILABLE')
  })

  it('does not treat Medication as Live by name — no instance and no rec is AVAILABLE', () => {
    expect(deriveCarePlanDisplayState({})).toBe('AVAILABLE')
  })
})

describe('displayStateForForm / Medication fallback', () => {
  it('does not place Medication in Live solely because of its form name', () => {
    const state = displayStateForForm('med-1', null, [], new Set())
    expect(state).toBe('AVAILABLE')
    expect(state).not.toBe('LIVE')
    expect(state).not.toBe('LIVE_WITH_DRAFT')
  })

  it('places a draft-only plan in In Progress', () => {
    expect(displayStateForForm('f1', 'DRAFT', [])).toBe('IN_PROGRESS')
  })

  it('places a published plan in Live', () => {
    expect(displayStateForForm('f1', 'PUBLISHED', [])).toBe('LIVE')
  })

  it('keeps published-with-draft under Live (LIVE_WITH_DRAFT)', () => {
    expect(displayStateForForm('f1', 'PUBLISHED_WITH_DRAFT', [])).toBe('LIVE_WITH_DRAFT')
  })

  it('places a pending recommendation in Recommended', () => {
    expect(displayStateForForm('f1', null, [rec('f1', 'pending')])).toBe('RECOMMENDED')
  })

  it('places a template with no recommendation or instance in Available', () => {
    expect(displayStateForForm('f1', null, [])).toBe('AVAILABLE')
  })

  it('treats acceptedCarePlans ids as accepted even if rec list is empty', () => {
    expect(displayStateForForm('f1', null, [], new Set(['f1']))).toBe('IN_PROGRESS')
  })
})

describe('groupFormsByDisplayState — no duplicates', () => {
  it('assigns each form to exactly one lifecycle section', () => {
    const forms = [
      { id: 'med', name: 'Medication' },
      { id: 'draft', name: 'Mobility' },
      { id: 'live', name: 'Falls' },
      { id: 'live-draft', name: 'Pain Management' },
      { id: 'pending', name: 'Eating and Drinking' },
      { id: 'available', name: 'Sleeping and Night' },
    ]
    const instance: Record<string, CarePlanInstanceDisplayStatus> = {
      draft: 'DRAFT',
      live: 'PUBLISHED',
      'live-draft': 'PUBLISHED_WITH_DRAFT',
    }
    const recs = [rec('pending', 'pending')]

    const buckets = groupFormsByDisplayState(forms, (form) =>
      displayStateForForm(form.id, instance[form.id] ?? null, recs),
    )

    expect(buckets.recommended.map((f) => f.id)).toEqual(['pending'])
    expect(buckets.inProgress.map((f) => f.id)).toEqual(['draft'])
    expect(buckets.live.map((f) => f.id)).toEqual(['live', 'live-draft'])
    expect(buckets.available.map((f) => f.id)).toEqual(['med', 'available'])

    const ids = lifecycleFormIds(buckets)
    expect(ids).toHaveLength(forms.length)
    expect(new Set(ids).size).toBe(forms.length)
  })

  it('does not list a draft form in Recommended when its rec is still pending', () => {
    const forms = [{ id: 'f1', name: 'Medication' }]
    const buckets = groupFormsByDisplayState(forms, (form) =>
      displayStateForForm(form.id, 'DRAFT', [rec('f1', 'pending')]),
    )
    expect(buckets.inProgress).toHaveLength(1)
    expect(buckets.recommended).toHaveLength(0)
    expect(buckets.live).toHaveLength(0)
    expect(buckets.available).toHaveLength(0)
  })
})

describe('pendingRecommendationsForRecommendedSection', () => {
  it('omits pending recs whose form is already In Progress or Live', () => {
    const recs = [rec('draft-form', 'pending'), rec('rec-form', 'pending')]
    const visible = pendingRecommendationsForRecommendedSection(
      recs,
      new Set(['rec-form']),
      new Set(['draft-form', 'rec-form']),
    )
    expect(visible.map((r) => r.carePathwayFormId)).toEqual(['rec-form'])
  })

  it('still shows pending recs with no linked form', () => {
    const recs = [rec(null, 'pending')]
    const visible = pendingRecommendationsForRecommendedSection(recs, new Set(), new Set())
    expect(visible).toHaveLength(1)
  })
})

describe('filterCarePlansByNameSearch', () => {
  const catalogue = [
    { id: '1', name: 'Medication' },
    { id: '2', name: 'Mobility' },
    { id: '3', name: 'Falls' },
  ]

  it('filters by care-plan name without mutating the source list', () => {
    const original = [...catalogue]
    const filtered = filterCarePlansByNameSearch(catalogue, 'med')
    expect(filtered.map((f) => f.name)).toEqual(['Medication'])
    expect(catalogue).toEqual(original)
  })

  it('is case-insensitive and trims the query', () => {
    expect(filterCarePlansByNameSearch(catalogue, '  FALL  ').map((f) => f.id)).toEqual(['3'])
  })

  it('returns all items for an empty query', () => {
    expect(filterCarePlansByNameSearch(catalogue, '   ')).toEqual(catalogue)
  })

  it('does not match when the search has no hits', () => {
    expect(filterCarePlansByNameSearch(catalogue, 'zzz')).toEqual([])
    expect(catalogue).toHaveLength(3)
  })
})

describe('recommendationStatusForForm', () => {
  it('prefers accepted over pending for the same form', () => {
    expect(
      recommendationStatusForForm([rec('f1', 'pending'), rec('f1', 'accepted')], 'f1'),
    ).toBe('accepted')
  })
})

function pendingRec(
  id: string,
  formId: string | null,
  triggers: Array<{ questionId: string; questionText: string }>,
  title = 'Physical Health',
) {
  return {
    id,
    title,
    carePathwayFormName: formId ? 'Physical Health' : title,
    carePathwayFormId: formId ?? undefined,
    status: 'pending' as const,
    triggerCount: triggers.length,
    triggers,
  }
}

describe('groupPendingRecommendationsByForm', () => {
  it('renders ONE group when two pending recs share a carePathwayFormId', () => {
    const grouped = groupPendingRecommendationsByForm([
      pendingRec('a', 'form-ph', [
        { questionId: 'q1', questionText: 'Swallowing or choking concerns?' },
        { questionId: 'q2', questionText: 'GP review requested?' },
        { questionId: 'q3', questionText: 'Pain or distress identified?' },
      ]),
      pendingRec('b', 'form-ph', [{ questionId: 'q4', questionText: 'Falls in last 12 months?' }]),
    ])
    expect(grouped).toHaveLength(1)
    expect(grouped[0]?.formId).toBe('form-ph')
    expect(grouped[0]?.recs.map((r) => r.id)).toEqual(['a', 'b'])
    expect(grouped[0]?.triggers.map((t) => t.questionId)).toEqual(['q1', 'q2', 'q3', 'q4'])
    expect(grouped[0]?.triggerCount).toBe(4)
  })

  it('keeps unlinked pending recs as separate cards', () => {
    const grouped = groupPendingRecommendationsByForm([
      pendingRec('a', null, [{ questionId: 'q1', questionText: 'One?' }], 'Area A'),
      pendingRec('b', null, [{ questionId: 'q2', questionText: 'Two?' }], 'Area B'),
    ])
    expect(grouped).toHaveLength(2)
  })

  it('does not mutate the source recommendation list', () => {
    const source = [
      pendingRec('a', 'form-ph', [{ questionId: 'q1', questionText: 'One?' }]),
      pendingRec('b', 'form-ph', [{ questionId: 'q2', questionText: 'Two?' }]),
    ]
    const snapshot = JSON.parse(JSON.stringify(source))
    groupPendingRecommendationsByForm(source)
    expect(source).toEqual(snapshot)
  })
})

describe('splitEvidencePreview', () => {
  const lines = ['a', 'b', 'c', 'd']

  it('shows only a concise subset initially when there are more than 3 lines', () => {
    const preview = splitEvidencePreview(lines, 3, false)
    expect(preview.visible).toEqual(['a', 'b', 'c'])
    expect(preview.hiddenCount).toBe(1)
  })

  it('exposes remaining evidence when expanded', () => {
    const preview = splitEvidencePreview(lines, 3, true)
    expect(preview.visible).toEqual(lines)
    expect(preview.hiddenCount).toBe(0)
  })
})

describe('CARE_PLAN_PAGE_SECTION_ORDER', () => {
  it('places Recommended, In Progress and Live before Assessment/Risk supporting content', () => {
    const order = [...CARE_PLAN_PAGE_SECTION_ORDER]
    expect(order.indexOf('recommended')).toBeLessThan(order.indexOf('assessment-risk'))
    expect(order.indexOf('in-progress')).toBeLessThan(order.indexOf('assessment-risk'))
    expect(order.indexOf('live')).toBeLessThan(order.indexOf('assessment-risk'))
    expect(order.indexOf('assessment-risk')).toBeLessThan(order.indexOf('available'))
  })
})
