import type { InitialAssessmentQuestion, InitialAssessmentSection } from '@/features/service-users/initial-assessment/types'

export type SkinIntegrityTableRow = {
  label: string
  assessmentQuestionText?: string
  commentQuestionText?: string
  commentOnly?: boolean
}

/** Paper form rows for Section 6 — Skin Integrity (Question / Assessment / Comment). */
export const SKIN_INTEGRITY_TABLE_ROWS: SkinIntegrityTableRow[] = [
  {
    label: 'Does the client suffer from a skin condition?',
    assessmentQuestionText: 'Skin condition or concern?',
    commentQuestionText: 'Skin condition comment',
  },
  {
    label: 'Does the client have any ulcers or wounds?',
    assessmentQuestionText: 'Currently has ulcers or wounds?',
    commentQuestionText: 'Ulcers or wounds comment',
  },
  {
    label: 'Has a pressure ulcer risk assessment been completed? Including photography.',
    assessmentQuestionText: 'Pressure ulcer risk assessment completed (including photography)?',
  },
  {
    label: 'Has a wound assessment been completed?',
    assessmentQuestionText: 'Has wound assessment been completed?',
  },
  {
    label: 'Skin integrity additional comments',
    commentQuestionText: 'Skin / wound notes',
    commentOnly: true,
  },
  {
    label: 'Does client have any pressure relieving equipment?',
    assessmentQuestionText: 'Pressure relieving equipment in use?',
    commentQuestionText: 'Pressure equipment details',
  },
  {
    label: 'Does the client require any further pressure relieving equipment to be ordered?',
    assessmentQuestionText: 'Further pressure equipment required?',
  },
]

export const SKIN_INTEGRITY_TABLE_QUESTION_TEXTS = new Set(
  SKIN_INTEGRITY_TABLE_ROWS.flatMap((row) =>
    [row.assessmentQuestionText, row.commentQuestionText].filter((t): t is string => Boolean(t)),
  ),
)

export function findQuestionByExactText(
  sections: InitialAssessmentSection[],
  questionText: string,
): InitialAssessmentQuestion | undefined {
  const needle = questionText.trim()
  for (const sec of sections) {
    const q = sec.questions.find((x) => x.questionText.trim() === needle)
    if (q) return q
  }
  return undefined
}

export function excludeSkinIntegrityTableQuestions(
  questions: InitialAssessmentQuestion[],
): InitialAssessmentQuestion[] {
  return questions.filter((q) => !SKIN_INTEGRITY_TABLE_QUESTION_TEXTS.has(q.questionText.trim()))
}
