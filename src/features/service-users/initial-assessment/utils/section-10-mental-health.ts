import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

const LEGACY_SECTIONS = new Set([
  'sec_emotional_well_being_client_states',
  'sec_cognitive_ability',
])

/** Enterprise §10 fields — must match SECTION_10_QUESTIONS in backend seed. */
export const SECTION_10_CANONICAL_QUESTION_TEXT = [
  'No concerns identified in this section',
  'Current mental health issues reported?',
  'Current mental health details',
  'Community Psychiatric Nurse involved?',
  'CPN name and contact',
  'Previous mental health issues reported?',
  'Emotional wellbeing status',
  'Feels low in mood?',
  'Feels depressed?',
  'Low mood or depression concern?',
  'GP referral for mental health requested?',
  'GP referral for mental health made?',
  'GP referral date',
  'Diagnosed dementia?',
  'Learning disability?',
  'Ever had a brain injury?',
  'Good long-term memory recall?',
  'Good short-term memory recall?',
  'Able to follow basic instructions?',
  'Gets agitated with change?',
  'Challenging behaviour or agitation with change?',
  'Fully orientated?',
  'De-orientated?',
  'Cognitive impairment level',
  'Mental Capacity Assessment required?',
  'AMT completed?',
  'AMT score',
  'AMT date',
  'Mental Capacity Assessment required?',
  'GP referral for cognition requested?',
  'GP referral for cognition made?',
  'GP referral for cognition date',
  'Sleeping pattern',
  'Sleeping pattern concern?',
  'Sleep medication prescribed or OTC?',
  'GP referral for sleep concern requested?',
  'GP referral for sleep concern made?',
  'GP referral for sleep concern date',
  'Emotional health comments',
] as const

const CANONICAL = new Set<string>(SECTION_10_CANONICAL_QUESTION_TEXT)

export function isSection10Question(q: InitialAssessmentQuestion): boolean {
  const meta = q.metadata
  if (!meta || typeof meta !== 'object') return false
  const legacy = meta.legacyCatalogSection
  if (typeof legacy === 'string' && LEGACY_SECTIONS.has(legacy)) return true
  const ref = meta.specRef
  return typeof ref === 'string' && ref.startsWith('10.')
}

export function filterSection10Questions(
  questions: InitialAssessmentQuestion[],
): InitialAssessmentQuestion[] {
  return questions.filter((q) => {
    if (!isSection10Question(q)) return true
    return CANONICAL.has(q.questionText.trim())
  })
}
