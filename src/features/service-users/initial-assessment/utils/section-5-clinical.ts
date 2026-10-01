import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

const LEGACY_SECTIONS = new Set([
  'sec_breathing_difficulties',
  'sec_distress_pain_physical_state',
  'sec_swallowing',
])

/** Enterprise §5 fields — must match SECTION_5_QUESTIONS in backend seed. */
export const SECTION_5_CANONICAL_QUESTION_TEXT = [
  'No concerns identified in this section',
  'Breathing concern options',
  'Breathing condition details',
  'Asthma present?',
  'Emphysema / COPD present?',
  'Oxygen dependent?',
  'Oxygen care notes',
  'GP or specialist nurse review requested?',
  'Breathing action plan',
  'Pain / distress options',
  'Pain or distress identified?',
  'Pain location',
  'Pain score (0-10)',
  'Pain trigger / aggravating factors',
  'Current pain relief',
  'Pain assessment completed?',
  'Pain assessment date',
  'What pain management plan in place',
  'Swallowing concern options',
  'Swallowing or choking concerns?',
  'Choking history details',
  'What does choking occur with?',
  'How frequently does choking occur?',
  'What positioning or supervision is required for swallowing or choking?',
  'Is the choking or rescue first aid plan known to staff?',
  'Food texture requirement',
  'Fluid thickness requirement',
  'Swallowing action plan',
  'SALT referral required?',
  'SALT referral made?',
  'SALT referral date',
] as const

const CANONICAL = new Set<string>(SECTION_5_CANONICAL_QUESTION_TEXT)

export function isSection5ClinicalQuestion(q: InitialAssessmentQuestion): boolean {
  const meta = q.metadata
  if (!meta || typeof meta !== 'object') return false
  const legacy = meta.legacyCatalogSection
  if (typeof legacy === 'string' && LEGACY_SECTIONS.has(legacy)) return true
  const ref = meta.specRef
  if (typeof ref !== 'string') return false
  return ref === '5.0' || ref === '5.1' || ref === '5.2' || ref === '5.3' || ref === '5.4'
}

export function filterSection5Questions(
  questions: InitialAssessmentQuestion[],
): InitialAssessmentQuestion[] {
  return questions.filter((q) => {
    if (!isSection5ClinicalQuestion(q)) return true
    return CANONICAL.has(q.questionText.trim())
  })
}
