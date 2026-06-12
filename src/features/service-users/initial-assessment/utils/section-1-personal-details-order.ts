import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

/**
 * Display order for §1.1 Personal Details — matches the paper
 * "Initial Holistic Assessment and Care Needs Assessment" form (basic info first).
 */
export const SECTION_1_1_PERSONAL_DETAILS_ORDER = [
  'First name',
  'Middle name',
  'Last name',
  'Preferred name',
  'NHS number',
  'NI number',
  'Gender',
  'Date of birth',
  'Ethnicity',
  'Languages spoken',
  'Pendant / telecare in use?',
  'Beliefs',
  'Communication needs',
  'Address and contact details',
  'GP contact details',
  // LPOA — grouped in UI
  'LPOA appointed?',
  'LPOA designation',
  'LPOA name',
  'LPOA contact details',
  // Assessor — grouped in UI
  'Assessment completed date and time',
  'Assessor name',
  'Assessor designation',
  'Social worker contact',
  'Care manager contact',
  'Mental health team contact',
  'Advocate contact',
  // Assessment administration — after client identity and contacts
  'Funding type',
  'Referral source',
  'Assessment location',
  'Local authority ID (if funded)',
] as const

export const SECTION_1_1_LPOA_QUESTIONS = [
  'LPOA appointed?',
  'LPOA designation',
  'LPOA name',
  'LPOA contact details',
] as const

export const SECTION_1_1_ASSESSOR_QUESTIONS = [
  'Assessment completed date and time',
  'Assessor name',
  'Assessor designation',
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
