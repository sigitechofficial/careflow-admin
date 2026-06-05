import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import { specRefOf } from '@/features/service-users/initial-assessment/utils/question-lookup'
import {
  computeMustScore,
  isMustScoringComplete,
  type MustMetadata,
} from '@/features/service-users/initial-assessment/utils/must-scoring'

/** Template questions answered on the MUST tab, not elsewhere in §6. */
export function isMustTemplateQuestion(q: InitialAssessmentQuestion): boolean {
  const ref = specRefOf(q) ?? ''
  if (ref === '6.8' || ref === '6.9' || ref === '6.10') return true
  const text = q.questionText.trim().toLowerCase()
  return text === 'must assessment completed?' || text === 'must score'
}

export function mustTemplateQuestionIds(sections: InitialAssessmentSection[]): Set<string> {
  const ids = new Set<string>()
  for (const sec of sections) {
    for (const q of sec.questions) {
      if (isMustTemplateQuestion(q)) ids.add(q.id)
    }
  }
  return ids
}

export function findMustCompletedQuestion(sections: InitialAssessmentSection[]) {
  return sections
    .flatMap((s) => s.questions)
    .find((q) => q.questionText.trim() === 'MUST assessment completed?')
}

export function findMustScoreQuestion(sections: InitialAssessmentSection[]) {
  return sections
    .flatMap((s) => s.questions)
    .find((q) => q.questionText.trim() === 'MUST score')
}

/** Keep template MUST fields in sync with the MUST worksheet tab. */
export function syncMustAssessmentAnswers(
  sections: InitialAssessmentSection[],
  must: MustMetadata | undefined,
  onChange: (questionId: string, patch: InitialAssessmentAnswerInput) => void,
): void {
  const completedQ = findMustCompletedQuestion(sections)
  const scoreQ = findMustScoreQuestion(sections)
  const complete = isMustScoringComplete(must)
  const score = computeMustScore(must)

  if (completedQ) {
    onChange(completedQ.id, {
      questionId: completedQ.id,
      checked: complete,
      booleanValue: complete,
    })
  }

  if (scoreQ && complete) {
    onChange(scoreQ.id, {
      questionId: scoreQ.id,
      numberValue: score,
      textValue: String(score),
    })
  }
}
