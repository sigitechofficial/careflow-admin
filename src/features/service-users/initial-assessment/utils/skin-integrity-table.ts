import type { InitialAssessmentQuestion, InitialAssessmentSection } from '@/features/service-users/initial-assessment/types'

export type SkinIntegrityTableRow = {
  label: string
  assessmentQuestionText?: string
  commentQuestionText?: string
  commentOnly?: boolean
}

/** Paper Section 6 — Skin Integrity table rows (Question / Assessment / Comment). */
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
    commentQuestionText: 'Pressure ulcer risk assessment comment',
  },
  {
    label: 'Has a wound assessment been completed?',
    assessmentQuestionText: 'Has wound assessment been completed?',
    commentQuestionText: 'Wound assessment comment',
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

/** Shown below the table when further pressure equipment is required (paper continuation). */
export const SKIN_INTEGRITY_EQUIPMENT_ORDER_QUESTION_TEXTS = [
  'Equipment ordered?',
  'Date equipment ordered',
  'Pressure equipment order additional comments',
] as const

/** Nutrition monitoring — moved from paper §6.6 into Section 6 — Skin Integrity. */
export const SKIN_INTEGRITY_MONITORING_QUESTION_TEXTS = [
  'Fluid chart required?',
  'Weight monitoring required?',
] as const

export const SKIN_INTEGRITY_TABLE_QUESTION_TEXTS = new Set(
  SKIN_INTEGRITY_TABLE_ROWS.flatMap((row) =>
    [row.assessmentQuestionText, row.commentQuestionText].filter((t): t is string => Boolean(t)),
  ),
)

export const SKIN_INTEGRITY_PAPER_QUESTION_TEXTS = new Set([
  ...SKIN_INTEGRITY_TABLE_QUESTION_TEXTS,
  ...SKIN_INTEGRITY_EQUIPMENT_ORDER_QUESTION_TEXTS,
  ...SKIN_INTEGRITY_MONITORING_QUESTION_TEXTS,
])

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
  return questions.filter((q) => !SKIN_INTEGRITY_PAPER_QUESTION_TEXTS.has(q.questionText.trim()))
}
