import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import type { SpecRefGroup } from '@/features/service-users/initial-assessment/utils/spec-ref-groups'

/** Paper Section 5 — Emotional health (enterprise §10) subsection order. */
export const PAPER_SECTION_5_SPEC_ORDER = ['10.1', '10.2', '10.6', '10.6a', '10.4'] as const

/** Intro yes/no block at the top of paper Section 5. */
export const PAPER_SECTION_5_INTRO_QUESTION_TEXT = [
  'Current mental health issues reported?',
  'Community Psychiatric Nurse involved?',
  'Previous mental health issues reported?',
] as const

export const PAPER_SECTION_5_EMOTIONAL_WELLBEING_QUESTION_TEXT = [
  'Emotional wellbeing status',
  'Feels depressed?',
  'GP referral for mental health made?',
] as const

export const PAPER_SECTION_5_COGNITIVE_QUESTION_TEXT = [
  'Cognitive impairment level',
  'AMT completed?',
  'GP referral for cognition requested?',
  'GP referral for cognition made?',
] as const

/** Enterprise spec refs folded into paper §5b — not separate subsection headers. */
export const PAPER_SECTION_5_COGNITIVE_SPEC_REFS = ['10.6', '10.7'] as const

const PAPER_SECTION_5_COGNITIVE_ALLOWED = new Set<string>(PAPER_SECTION_5_COGNITIVE_QUESTION_TEXT)

export const PAPER_SECTION_5_SLEEPING_QUESTION_TEXT = ['Sleeping pattern'] as const

export const PAPER_SECTION_5_ADDITIONAL_COMMENTS_TEXT = 'Emotional health comments'

const PAPER_SECTION_5_ALLOWED = new Set<string>([
  ...PAPER_SECTION_5_INTRO_QUESTION_TEXT,
  ...PAPER_SECTION_5_EMOTIONAL_WELLBEING_QUESTION_TEXT,
  ...PAPER_SECTION_5_COGNITIVE_QUESTION_TEXT,
  ...PAPER_SECTION_5_SLEEPING_QUESTION_TEXT,
  PAPER_SECTION_5_ADDITIONAL_COMMENTS_TEXT,
])

export function isPaperSection5Question(q: InitialAssessmentQuestion): boolean {
  return PAPER_SECTION_5_ALLOWED.has(q.questionText.trim())
}

export function paperSection5GroupOrderIndex(specRef: string): number {
  const index = (PAPER_SECTION_5_SPEC_ORDER as readonly string[]).indexOf(specRef)
  return index === -1 ? 999 : index
}

export function isPaperSection5HiddenCognitiveSpecRef(specRef: string): boolean {
  return specRef === '10.7' || specRef === '10.8'
}

/** Merge §10.6–10.7 fields into one paper §5b panel (MCA required lives on Tab 3). */
export function collectPaperSection5CognitiveQuestions(
  groups: SpecRefGroup[],
): InitialAssessmentQuestion[] {
  const cognitiveSpecRefs = new Set<string>(PAPER_SECTION_5_COGNITIVE_SPEC_REFS)
  const byId = new Map<string, InitialAssessmentQuestion>()
  for (const group of groups) {
    if (!cognitiveSpecRefs.has(group.specRef)) continue
    for (const question of group.questions) {
      const text = question.questionText.trim()
      if (!PAPER_SECTION_5_COGNITIVE_ALLOWED.has(text) || byId.has(question.id)) continue
      byId.set(question.id, question)
    }
  }
  return [...byId.values()].sort((a, b) => a.sortOrder - b.sortOrder)
}
