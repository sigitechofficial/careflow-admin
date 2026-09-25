import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

const SECTION_FOOTER_NOTE_TEXT: Partial<Record<number, string>> = {
  7: 'Continence / oral care notes',
  8: 'Communication support notes',
  9: 'Medication safety notes',
  // Section 11 notes live inside Skin Integrity panel ("Skin integrity additional comments") —
  // do not also render them as a trailing footer outside the collapsible shell.
  13: 'Safeguarding / emergency notes',
  14: 'Review and sign-off notes',
}

export function sectionFooterNotesQuestion(
  sectionNumber: number,
  questions: InitialAssessmentQuestion[],
): InitialAssessmentQuestion | undefined {
  const exact = SECTION_FOOTER_NOTE_TEXT[sectionNumber]
  if (!exact) return undefined
  return questions.find((q) => q.questionText.trim() === exact)
}

export function questionsExcludingSectionFooterNotes(
  sectionNumber: number,
  questions: InitialAssessmentQuestion[],
): InitialAssessmentQuestion[] {
  const footer = sectionFooterNotesQuestion(sectionNumber, questions)
  if (!footer) return questions
  return questions.filter((q) => q.id !== footer.id)
}
