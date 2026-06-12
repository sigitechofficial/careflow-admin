import type { SectionQuestionFilter } from '@/features/service-users/initial-assessment/utils/holistic-assessment-tabs'

/** Paper form title — enterprise §12.2–12.9 maps to paper Section 7. */
export const PAPER_SECTION_7_ADL_TITLE = 'Section 7 — Activities of daily living'

export type PaperSection7AdlSlice = SectionQuestionFilter & {
  sectionNumber: number
  paperSection7Adl?: boolean
}

export function isPaperSection7AdlSlice(slice: PaperSection7AdlSlice): boolean {
  return slice.sectionNumber === 12 && slice.paperSection7Adl === true
}
