import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

/**
 * Display order for §1.1 Personal Details — matches the paper
 * "Initial Holistic Assessment and Care Needs Assessment" form (Tab 1, page 3).
 */
export const SECTION_1_1_PERSONAL_DETAILS_ORDER = [
  'First name',
  'Middle name',
  'Last name',
  'Preferred name',
  'Gender',
  'Date of birth',
  'NHS number',
  'NI number',
  'Ethnicity',
  'Languages spoken',
  'Address and contact details',
  'GP contact details',
  'Pendant / telecare in use?',
  'Assessment completed date and time',
  'LPA appointed?',
  'LPA designation',
  'LPA name',
  'LPA contact details',
  'Social worker contact',
  'Care manager contact',
  'Mental health team contact',
  'Advocate contact',
  'Funding type',
  'Referral source',
  'Assessment location',
  'Local authority ID (if funded)',
] as const

const ORDER_INDEX = new Map<string, number>(
  SECTION_1_1_PERSONAL_DETAILS_ORDER.map((text, index) => [text, index]),
)

const UNKNOWN_ORDER = SECTION_1_1_PERSONAL_DETAILS_ORDER.length

export function sortPersonalDetailsQuestions(
  questions: InitialAssessmentQuestion[],
): InitialAssessmentQuestion[] {
  return [...questions].sort((a, b) => {
    const orderA = ORDER_INDEX.get(a.questionText) ?? UNKNOWN_ORDER
    const orderB = ORDER_INDEX.get(b.questionText) ?? UNKNOWN_ORDER
    if (orderA !== orderB) return orderA - orderB
    return a.sortOrder - b.sortOrder
  })
}
