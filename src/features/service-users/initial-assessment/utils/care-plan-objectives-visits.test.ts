import { describe, it, expect } from 'vitest'
import {
  CARE_PLAN_VISIT_SECTIONS,
  carePlanVisitsFromPreferredTimes,
  isCarePlanObjectivesComplete,
  normalizeCarePlanObjectivesMetadata,
} from './care-plan-objectives'

describe('carePlanVisitsFromPreferredTimes', () => {
  it('shows only the visits chosen in preferred visit times', () => {
    const raw = { MORNING: { selected: true }, MIDDAY: { selected: false }, EVENING: { selected: true } }
    expect(carePlanVisitsFromPreferredTimes(raw)).toEqual(['morning', 'evening'])
  })

  it('shows all when nothing is chosen, "flexible" is chosen, or a code is unknown', () => {
    expect(carePlanVisitsFromPreferredTimes(undefined)).toBeNull()
    expect(carePlanVisitsFromPreferredTimes({ FLEXIBLE: { selected: true } })).toBeNull()
    expect(carePlanVisitsFromPreferredTimes(['SOMETHING_ELSE'])).toBeNull()
  })

  it('keeps any visit that already holds a plan', () => {
    const meta = { visits: { night: { agreedTask: '<p>Settle into bed</p>' } } }
    expect(carePlanVisitsFromPreferredTimes(['morning'], meta)).toEqual(['morning', 'night'])
  })

  it('completion only needs the visits shown', () => {
    const meta = { visits: { morning: { agreedTask: 'Wash and dress' } } }
    expect(isCarePlanObjectivesComplete(meta, ['morning'])).toBe(true)
    expect(isCarePlanObjectivesComplete(meta)).toBe(false)
  })
})

describe('care plan visit goal links', () => {
  it('keeps goal ids and drops non-string entries', () => {
    const meta = normalizeCarePlanObjectivesMetadata({
      visits: { morning: { agreedTask: 'Wash', goalIds: ['goal-1', 7, 'abc'] } },
    })
    expect(meta.visits?.morning?.goalIds).toEqual(['goal-1', 'abc'])
  })

  it('uses the Tab 2 round names for visit titles', () => {
    expect(CARE_PLAN_VISIT_SECTIONS.map((s) => s.title)).toEqual([
      'Morning visit',
      'Midday visit',
      'Afternoon visit',
      'Evening visit',
      'Night visit',
    ])
  })
})
