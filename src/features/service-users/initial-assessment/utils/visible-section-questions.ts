import { isHiddenDerivedConcernGate } from '@/features/service-users/initial-assessment/utils/concern-gate-utils'
import { shouldShowQuestion } from '@/features/service-users/initial-assessment/utils/conditional-visibility'
import { filterSection10Questions } from '@/features/service-users/initial-assessment/utils/section-10-mental-health'
import { filterSection311Questions } from '@/features/service-users/initial-assessment/utils/section-311-flooring'
import { filterSection310Questions } from '@/features/service-users/initial-assessment/utils/section-310-environment'
import { filterSection38Questions } from '@/features/service-users/initial-assessment/utils/section-38-pets'
import { filterSection5Questions } from '@/features/service-users/initial-assessment/utils/section-5-clinical'
import { filterSection6Questions } from '@/features/service-users/initial-assessment/utils/section-6-nutrition'
import {
  filterSection12Questions,
  section12EquipmentTemplateQuestions,
  section12FallsHistoryQuestions,
} from '@/features/service-users/initial-assessment/utils/section-12-mobility'
import { section12TransferMatrixExcludedIds } from '@/features/service-users/initial-assessment/utils/section-12-panel-exclusions'
import { filterPhase1SectionQuestions } from '@/features/service-users/initial-assessment/utils/section-phase1-filters'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

export type VisibleQuestionsOptions = {
  /** Questions completed on another hub tab (e.g. Waterlow) — omit from this section's count. */
  hubTabExcludedIds?: Set<string>
  /** §12 — include finance consent when the finance panel is visible. */
  financeConsentQuestion?: InitialAssessmentQuestion
  financeSupportVisible?: boolean
}

function applySectionFilters(
  sectionNumber: number,
  questions: InitialAssessmentQuestion[],
): InitialAssessmentQuestion[] {
  let qs = filterPhase1SectionQuestions(questions)
  if (sectionNumber === 3) {
    qs = filterSection38Questions(filterSection310Questions(filterSection311Questions(qs)))
  }
  if (sectionNumber === 5) qs = filterSection5Questions(qs)
  if (sectionNumber === 6) qs = filterSection6Questions(qs)
  if (sectionNumber === 10) qs = filterSection10Questions(qs)
  if (sectionNumber === 12) qs = filterSection12Questions(qs)
  return qs
}

function dedupeQuestions(lists: InitialAssessmentQuestion[][]): InitialAssessmentQuestion[] {
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

/** Template questions the assessor can see — mirrors SectionQuestions / §12 panel rendering. */
export function getVisibleSectionQuestions(
  section: InitialAssessmentSection,
  allSections: InitialAssessmentSection[],
  answers: Record<string, InitialAssessmentAnswerInput>,
  options?: VisibleQuestionsOptions,
): InitialAssessmentQuestion[] {
  const conditional = section.questions.filter((q) => shouldShowQuestion(q, allSections, answers))

  if (section.sectionNumber === 12) {
    const inline = applySectionFilters(section.sectionNumber, conditional).filter(
      (q) => !options?.hubTabExcludedIds?.has(q.id) && !isHiddenDerivedConcernGate(q, allSections),
    )
    const falls = section12FallsHistoryQuestions(section.questions).filter((q) =>
      shouldShowQuestion(q, allSections, answers),
    )
    const equipment = section12EquipmentTemplateQuestions(section.questions).filter((q) =>
      shouldShowQuestion(q, allSections, answers),
    )
    const transferExcluded = section12TransferMatrixExcludedIds(section.questions)
    const transfer = section.questions.filter(
      (q) => transferExcluded.has(q.id) && shouldShowQuestion(q, allSections, answers),
    )
    const finance =
      options?.financeSupportVisible && options.financeConsentQuestion
        ? [options.financeConsentQuestion]
        : []
    return dedupeQuestions([inline, falls, equipment, transfer, finance])
  }

  return applySectionFilters(section.sectionNumber, conditional).filter(
    (q) =>
      !options?.hubTabExcludedIds?.has(q.id) && !isHiddenDerivedConcernGate(q, allSections),
  )
}
