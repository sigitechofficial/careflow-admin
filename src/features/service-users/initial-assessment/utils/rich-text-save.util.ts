import { readInitialAssessmentTextareaValue } from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
} from '@/features/service-users/initial-assessment/types'

/** Merge live Summernote HTML into draft answers before persist (editor can lead React state). */
export function mergeLiveRichTextAnswersForQuestions(
  questions: InitialAssessmentQuestion[],
  draftAnswers: Record<string, InitialAssessmentAnswerInput>,
): Record<string, InitialAssessmentAnswerInput> {
  if (typeof document === 'undefined') return draftAnswers

  let changed = false
  let next = draftAnswers

  for (const q of questions) {
    if (q.questionType !== 'TEXTAREA') continue
    const host = document.getElementById(q.id)
    if (!host?.hasAttribute('data-ia-rich-text')) continue
    const html = readInitialAssessmentTextareaValue(host)
    const current = draftAnswers[q.id]?.textValue ?? ''
    if (html === current) continue
    changed = true
    next = {
      ...next,
      [q.id]: {
        ...next[q.id],
        questionId: q.id,
        textValue: html,
      },
    }
  }

  return changed ? next : draftAnswers
}
