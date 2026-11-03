import type { HolisticAssessmentTab } from '@/features/service-users/initial-assessment/utils/holistic-assessment-tabs'
import type { SectionNavStatus } from '@/features/service-users/initial-assessment/utils/validation-maps'
import type { SpecialistRelevance } from '@/features/service-users/initial-assessment/utils/specialist-relevance-rules'

export type NextSectionPriority =
  | 'required_missing'
  | 'required_specialist'
  | 'core'
  | 'finalisation'
  | 'suggested_specialist'

export type NextImportantSection = {
  tabId: number
  title: string
  displayNumber: number
  priority: NextSectionPriority
  /** Why this section is next, in plain words. */
  reason: string
}

const PRIORITY_ORDER: NextSectionPriority[] = [
  'required_missing',
  'required_specialist',
  'core',
  'finalisation',
  'suggested_specialist',
]

/**
 * After a section is saved: which section matters most next, from what the page already shows —
 * 1. sections with required answers missing (or blocking issues), which stop submission;
 * 2. specialist assessments the answers made Required;
 * 3. other unfinished core sections;
 * 4. outcome & sign-off (last, once the assessment itself is done);
 * 5. specialist assessments the answers only Suggest.
 * Ties go to the first one after the current tab in nav order (the current tab last). Not needed /
 * screening-pending specialist tabs are never suggested. Null when nothing is left.
 */
export function nextImportantSection(input: {
  tabs: HolisticAssessmentTab[]
  currentTabId: number
  /** Raw nav status per tab (before the specialist overlay hides Suggested tabs). */
  navStatus: ReadonlyMap<number, SectionNavStatus>
  /** Required fields still unanswered per tab (the "N required" shown in the nav). */
  requiredMissing: ReadonlyMap<number, number>
  specialistRelevance: ReadonlyMap<number, SpecialistRelevance>
}): NextImportantSection | null {
  const { tabs, currentTabId, navStatus, requiredMissing, specialistRelevance } = input
  const start = Math.max(0, tabs.findIndex((t) => t.id === currentTabId))
  const ordered = [...tabs.slice(start + 1), ...tabs.slice(0, start), ...tabs.slice(start, start + 1)]

  const classify = (tab: HolisticAssessmentTab): { priority: NextSectionPriority; reason: string } | null => {
    const status = navStatus.get(tab.id) ?? 'ok'
    const missing = requiredMissing.get(tab.id) ?? 0
    const relevance = tab.group === 'specialist' ? specialistRelevance.get(tab.id) : undefined
    if (relevance && (relevance.status === 'not_needed' || relevance.status === 'pending')) return null
    const unfinished = missing > 0 || status === 'blocking' || status === 'incomplete'
    if (!unfinished) return null

    if (tab.group === 'finalisation') {
      return {
        priority: 'finalisation',
        reason:
          missing > 0
            ? `Outcome and sign-off: ${missing} required answer${missing === 1 ? '' : 's'} still to complete.`
            : 'Outcome and sign-off are still to be completed.',
      }
    }
    if (missing > 0 || status === 'blocking') {
      return {
        priority: 'required_missing',
        reason:
          missing > 0
            ? `${missing} required answer${missing === 1 ? '' : 's'} missing — needed before the assessment can be submitted.`
            : 'Has issues that must be fixed before the assessment can be submitted.',
      }
    }
    if (tab.group === 'specialist') {
      const why = relevance?.reasons.filter(Boolean).join('; ')
      if (relevance?.status === 'required') {
        return { priority: 'required_specialist', reason: why ? `Required by the answers so far: ${why}.` : 'Required by the answers so far.' }
      }
      if (relevance?.status === 'suggested') {
        return { priority: 'suggested_specialist', reason: why ? `Suggested by the answers so far: ${why}.` : 'Suggested by the answers so far.' }
      }
      return null
    }
    return { priority: 'core', reason: 'Part of the core assessment and not finished yet.' }
  }

  let best: { result: NextImportantSection; rank: number } | null = null
  for (const tab of ordered) {
    const c = classify(tab)
    if (!c) continue
    const rank = PRIORITY_ORDER.indexOf(c.priority)
    if (!best || rank < best.rank) {
      best = { result: { tabId: tab.id, title: tab.title, displayNumber: tab.displayNumber, ...c }, rank }
    }
  }
  return best?.result ?? null
}
