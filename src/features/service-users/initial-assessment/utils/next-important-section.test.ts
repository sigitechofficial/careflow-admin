import { describe, expect, it } from 'vitest'
import { nextImportantSection } from '@/features/service-users/initial-assessment/utils/next-important-section'
import { HOLISTIC_ASSESSMENT_TABS } from '@/features/service-users/initial-assessment/utils/holistic-assessment-tabs'
import type { SectionNavStatus } from '@/features/service-users/initial-assessment/utils/validation-maps'
import type { SpecialistRelevance } from '@/features/service-users/initial-assessment/utils/specialist-relevance-rules'

const tabs = HOLISTIC_ASSESSMENT_TABS
const core = tabs.filter((t) => t.group === 'core')
const specialist = tabs.filter((t) => t.group === 'specialist')
const finalisation = tabs.filter((t) => t.group === 'finalisation')

function statuses(overrides: Record<number, SectionNavStatus>): Map<number, SectionNavStatus> {
  return new Map(tabs.map((t) => [t.id, overrides[t.id] ?? 'ok']))
}
const required = (overrides: Record<number, number>) => new Map(Object.entries(overrides).map(([k, v]) => [Number(k), v]))
const rel = (entries: Array<[number, SpecialistRelevance]>) => new Map(entries)
const none = { requiredMissing: required({}), specialistRelevance: rel([]) }

describe('nextImportantSection', () => {
  it('the next section after the current one with required answers missing comes first — sign-off waits', () => {
    const next = nextImportantSection({
      tabs,
      currentTabId: core[1]!.id,
      navStatus: statuses({ [finalisation[1]!.id]: 'blocking', [core[0]!.id]: 'incomplete', [core[3]!.id]: 'incomplete' }),
      requiredMissing: required({ [core[0]!.id]: 6, [core[3]!.id]: 2, [finalisation[1]!.id]: 11 }),
      specialistRelevance: rel([]),
    })
    expect(next).toMatchObject({ tabId: core[3]!.id, priority: 'required_missing', displayNumber: core[3]!.displayNumber })
    expect(next!.reason).toMatch(/^2 required answers missing/)
  })

  it('a blocking issue counts like missing required answers', () => {
    const next = nextImportantSection({ ...none, tabs, currentTabId: core[0]!.id, navStatus: statuses({ [core[2]!.id]: 'blocking' }) })
    expect(next).toMatchObject({ tabId: core[2]!.id, priority: 'required_missing' })
  })

  it('then a specialist assessment the answers made Required, with the reason', () => {
    const falls = specialist[2]!
    const next = nextImportantSection({
      tabs,
      currentTabId: core[0]!.id,
      navStatus: statuses({ [core[2]!.id]: 'incomplete', [falls.id]: 'incomplete' }),
      requiredMissing: required({}),
      specialistRelevance: rel([[falls.id, { status: 'required', reasons: ['two falls in the last 12 months'] }]]),
    })
    expect(next).toMatchObject({ tabId: falls.id, priority: 'required_specialist' })
    expect(next!.reason).toContain('two falls in the last 12 months')
  })

  it('then unfinished core sections (wrapping round), then outcome & sign-off', () => {
    const status = statuses({ [core[0]!.id]: 'incomplete', [core[3]!.id]: 'incomplete', [finalisation[0]!.id]: 'incomplete' })
    expect(nextImportantSection({ ...none, tabs, currentTabId: core[1]!.id, navStatus: status })!.tabId).toBe(core[3]!.id)
    expect(nextImportantSection({ ...none, tabs, currentTabId: core[3]!.id, navStatus: status })!.tabId).toBe(core[0]!.id)
    expect(
      nextImportantSection({ ...none, tabs, currentTabId: core[0]!.id, navStatus: statuses({ [finalisation[0]!.id]: 'incomplete' }) }),
    ).toMatchObject({ tabId: finalisation[0]!.id, priority: 'finalisation' })
  })

  it('not-needed and screening-pending specialist tabs are never suggested; Suggested ones come last', () => {
    const [a, b, c] = specialist
    const status = statuses({ [a!.id]: 'incomplete', [b!.id]: 'incomplete', [c!.id]: 'incomplete' })
    const relevance = rel([
      [a!.id, { status: 'not_needed', reasons: [] }],
      [b!.id, { status: 'pending', reasons: [], pendingHint: 'answer the screening' }],
      [c!.id, { status: 'suggested', reasons: ['mild pain'] }],
    ])
    expect(
      nextImportantSection({ tabs, currentTabId: core[0]!.id, navStatus: status, requiredMissing: required({ [a!.id]: 3 }), specialistRelevance: relevance }),
    ).toMatchObject({ tabId: c!.id, priority: 'suggested_specialist' })
  })

  it('the section just saved is suggested only when nothing else matters; null when all done', () => {
    const current = core[2]!
    expect(nextImportantSection({ ...none, tabs, currentTabId: current.id, navStatus: statuses({ [current.id]: 'incomplete' }) })!.tabId).toBe(current.id)
    expect(nextImportantSection({ ...none, tabs, currentTabId: current.id, navStatus: statuses({}) })).toBeNull()
  })
})
