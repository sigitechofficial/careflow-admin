import type { InitialAssessmentAnswerInput, InitialAssessmentQuestion, InitialAssessmentSection } from '@/features/service-users/initial-assessment/types'
import { specRefOf } from '@/features/service-users/initial-assessment/utils/question-lookup'
import {
  computeWaterlowScore,
  type WaterlowMetadata,
} from '@/features/service-users/initial-assessment/utils/waterlow-scoring'

/** Template questions answered on the Waterlow tab, not in section 11. */
export function isWaterlowTemplateQuestion(q: InitialAssessmentQuestion): boolean {
  const ref = specRefOf(q) ?? ''
  if (ref === '11.4' || ref.startsWith('11.5') || ref.startsWith('11.6')) return true
  const text = q.questionText.toLowerCase()
  return text.includes('waterlow')
}

export function waterlowTemplateQuestionIds(sections: InitialAssessmentSection[]): Set<string> {
  const ids = new Set<string>()
  for (const sec of sections) {
    for (const q of sec.questions) {
      if (isWaterlowTemplateQuestion(q)) ids.add(q.id)
    }
  }
  return ids
}

export function findWaterlowCompletedQuestion(
  sections: InitialAssessmentSection[],
): InitialAssessmentQuestion | undefined {
  return sections
    .flatMap((s) => s.questions)
    .find((q) => q.questionText.toLowerCase().includes('waterlow assessment completed'))
}

export function isWaterlowScoringComplete(waterlow: WaterlowMetadata | undefined): boolean {
  return computeWaterlowScore(waterlow) > 0
}

/** Keep template “Waterlow assessment completed?” in sync with the Waterlow tab score. */
export function syncWaterlowCompletedAnswer(
  sections: InitialAssessmentSection[],
  waterlow: WaterlowMetadata | undefined,
  onChange: (questionId: string, patch: InitialAssessmentAnswerInput) => void,
): void {
  const q = findWaterlowCompletedQuestion(sections)
  if (!q) return
  const complete = isWaterlowScoringComplete(waterlow)
  onChange(q.id, {
    questionId: q.id,
    checked: complete,
    booleanValue: complete,
  })
}
