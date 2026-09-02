import type {
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import {
  questionsForDocumentTab,
  type HolisticAssessmentTab,
} from '@/features/service-users/initial-assessment/utils/holistic-assessment-tabs'
import { isSection31FireQuestion } from '@/features/service-users/initial-assessment/utils/section-31-fire-safety'
import { specRefOf } from '@/features/service-users/initial-assessment/utils/question-lookup'

function fieldKeyOf(q: InitialAssessmentQuestion): string | undefined {
  const key = q.metadata?.fieldKey
  return typeof key === 'string' ? key : undefined
}

const CONSENT_SPEC_REFS = new Set(['2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8'])

/**
 * Template questions this tab's Fill Demo Data must include even when they are hidden
 * or the tab is worksheet-only. Mirrors backend `extraQuestionsForHolisticTab`.
 */
export function extraDemoFillQuestionsForTab(
  tab: HolisticAssessmentTab,
  sections: InitialAssessmentSection[],
): InitialAssessmentQuestion[] {
  const all = sections.flatMap((s) => s.questions)
  switch (tab.id) {
    case 1: {
      const sec1 = sections.find((s) => s.sectionNumber === 1)
      const assessor = (sec1?.questions ?? []).filter((q) => fieldKeyOf(q) === 'assessorName')
      return [...all.filter((q) => isSection31FireQuestion(q)), ...assessor]
    }
    case 3:
      return all.filter((q) => {
        const ref = specRefOf(q)
        return ref != null && CONSENT_SPEC_REFS.has(ref)
      })
    case 8:
      return all.filter((q) => specRefOf(q) === '12.7')
    case 12: {
      const sec3 = sections.find((s) => s.sectionNumber === 3)
      return (sec3?.questions ?? []).filter((q) => !isSection31FireQuestion(q))
    }
    case 13: {
      const sec13 = sections.find((s) => s.sectionNumber === 13)
      return sec13?.questions ?? []
    }
    case 16: {
      const sec14 = sections.find((s) => s.sectionNumber === 14)
      return (sec14?.questions ?? []).filter((q) => specRefOf(q) === '14.1')
    }
    default:
      return []
  }
}

function uniqueQuestions(lists: InitialAssessmentQuestion[][]): InitialAssessmentQuestion[] {
  const seen = new Set<string>()
  const out: InitialAssessmentQuestion[] = []
  for (const list of lists) {
    for (const q of list) {
      if (seen.has(q.id)) continue
      seen.add(q.id)
      out.push(q)
    }
  }
  return out
}

/**
 * Question IDs sent to Fill Demo Data for one holistic tab.
 *
 * Uses the tab's structural questions (visibility ignored so hidden follow-ups on the
 * same tab are included) plus tab-owned extras for worksheet-only enterprise sections.
 * Does not include questions owned by other tabs.
 */
export function demoFillQuestionsForDocumentTab(
  tab: HolisticAssessmentTab,
  sections: InitialAssessmentSection[],
): InitialAssessmentQuestion[] {
  const allBySection = new Map(sections.map((s) => [s.sectionNumber, s.questions]))
  const structural = questionsForDocumentTab(tab, sections, allBySection)
  const extras = extraDemoFillQuestionsForTab(tab, sections)
  return uniqueQuestions([structural, extras])
}
