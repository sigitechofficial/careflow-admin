import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import { fieldKeyOf } from '@/features/service-users/initial-assessment/utils/question-lookup'

export const PAPER_SECTION_4_TITLE = 'Section 4'

/** Enterprise §4–§9 map to paper Section 4 (subsections a–p). */
export function isPaperSection4EnterpriseSection(sectionNumber: number): boolean {
  return sectionNumber >= 4 && sectionNumber <= 9
}

export const PAPER_SECTION_5_EMOTIONAL_TITLE = 'Section 5 — Emotional health'

/** Tab 1 paper §4 main block — vitals through medication (subsections a–p). */
export function isPaperSection4MainSlice(sectionNumber: number): boolean {
  return sectionNumber >= 4 && sectionNumber <= 9
}

export type PaperSection4TailSlice = {
  sectionNumber: number
  specRefs?: string[]
}

/** Trailing §4 fields after §5 emotional — nutrition extras, height, comments, skin. */
export function isPaperSection4TailSlice(slice: PaperSection4TailSlice): boolean {
  if (slice.sectionNumber === 11) return true
  if (slice.sectionNumber === 4) {
    return slice.specRefs?.includes('4.7') === true || slice.specRefs?.includes('4.10') === true
  }
  return false
}

/** @deprecated Use {@link isPaperSection4MainSlice} / {@link isPaperSection4TailSlice}. */
export function isPaperSection4Tab1Slice(sectionNumber: number): boolean {
  return isPaperSection4MainSlice(sectionNumber) || sectionNumber === 11
}

/**
 * Paper “Section 4 — Physical assessment” subsection order (letters a–p).
 * No-concern gates (x.0) render after their section’s clinical blocks.
 */

export const SECTION_4_GROUP_ORDER = ['4.1', '4.2', '4.4', '4.5', '4.6', '4.10', '4.7'] as const

/** Spec-ref groups whose fields use full-width inputs (build, height, weight). */
export const SECTION_4_FULL_WIDTH_SPEC_REFS = new Set<string>(['4.10'])

export function isSection4FullWidthSpecRef(specRef: string | undefined | null): boolean {
  return Boolean(specRef && SECTION_4_FULL_WIDTH_SPEC_REFS.has(specRef))
}

export const SECTION_5_GROUP_ORDER = ['5.1', '5.2', '5.3', '5.4', '5.0'] as const

export const SECTION_6_GROUP_ORDER = ['6.1', '6.2', '6.3', '6.4', '6.0'] as const

export const SECTION_7_GROUP_ORDER = ['7.1', '7.2', '7.3', '7.4', '7.5', '7.6', '7.0'] as const

export const SECTION_8_GROUP_ORDER = ['8.1', '8.2', '8.3', '8.4', '8.5', '8.6', '8.0'] as const

export const SECTION_9_GROUP_ORDER = ['9.1', '9.2', '9.3', '9.4', '9.5'] as const

export const SECTION_15_GROUP_ORDER = ['15.1', '15.2', '15.3'] as const

export const SECTION_18_GROUP_ORDER = ['18.1', '18.2', '18.3', '18.4', '18.5', '18.6'] as const

const GROUP_ORDER_BY_SECTION: Record<number, readonly string[]> = {
  4: SECTION_4_GROUP_ORDER,
  5: SECTION_5_GROUP_ORDER,
  6: SECTION_6_GROUP_ORDER,
  7: SECTION_7_GROUP_ORDER,
  8: SECTION_8_GROUP_ORDER,
  9: SECTION_9_GROUP_ORDER,
  15: SECTION_15_GROUP_ORDER,
  18: SECTION_18_GROUP_ORDER,
}

export function sectionGroupOrderIndex(sectionNumber: number, specRef: string): number {
  const order = GROUP_ORDER_BY_SECTION[sectionNumber]
  if (!order) return 999
  const index = order.indexOf(specRef)
  return index === -1 ? 998 : index
}

/** Vital signs grid — matches paper “Base line vital signs” layout. */
export const VITALS_MEASUREMENT_FIELD_ORDER = [
  'temperature',
  'pulse',
  'pulseRhythm',
  'respirations',
  'bpSystolic',
  'bpDiastolic',
  'standingBpRequired',
  'bpLyingSystolic',
  'bpLyingDiastolic',
  'bpSittingSystolic',
  'bpSittingDiastolic',
  'bpStandingSystolic',
  'bpStandingDiastolic',
  'spo2',
] as const

const VITALS_FIELD_INDEX = new Map<string, number>(
  VITALS_MEASUREMENT_FIELD_ORDER.map((key, index) => [key, index]),
)

export function sortVitalsMeasurementQuestions(
  questions: InitialAssessmentQuestion[],
): InitialAssessmentQuestion[] {
  return [...questions].sort((a, b) => {
    const keyA = fieldKeyOf(a) ?? ''
    const keyB = fieldKeyOf(b) ?? ''
    const orderA = VITALS_FIELD_INDEX.get(keyA) ?? VITALS_MEASUREMENT_FIELD_ORDER.length
    const orderB = VITALS_FIELD_INDEX.get(keyB) ?? VITALS_MEASUREMENT_FIELD_ORDER.length
    if (orderA !== orderB) return orderA - orderB
    return a.sortOrder - b.sortOrder
  })
}

/** Paper: diabetic Yes/No before peripheral blood glucose level. */
const GLUCOSE_QUESTION_ORDER = [
  'Service User is diabetic?',
  'Type of diabetes',
  'Blood glucose (mmol/L)',
] as const

const GLUCOSE_TEXT_INDEX = new Map<string, number>(
  GLUCOSE_QUESTION_ORDER.map((text, index) => [text, index]),
)

export function sortSection4GlucoseQuestions(
  questions: InitialAssessmentQuestion[],
): InitialAssessmentQuestion[] {
  return [...questions].sort((a, b) => {
    const orderA = GLUCOSE_TEXT_INDEX.get(a.questionText.trim()) ?? GLUCOSE_QUESTION_ORDER.length
    const orderB = GLUCOSE_TEXT_INDEX.get(b.questionText.trim()) ?? GLUCOSE_QUESTION_ORDER.length
    if (orderA !== orderB) return orderA - orderB
    return a.sortOrder - b.sortOrder
  })
}
