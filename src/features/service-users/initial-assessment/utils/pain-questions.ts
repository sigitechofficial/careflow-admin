import type { InitialAssessmentAnswerInput, InitialAssessmentQuestion, InitialAssessmentSection } from '@/features/service-users/initial-assessment/types'
import {
  abbeySeverityFromTotal,
  computeAbbeyTotal,
  type PainAssessmentMetadata,
} from '@/features/service-users/initial-assessment/utils/pain-assessment-scoring'

/** Questions captured in the pain assessment panel (§5.3). */
const PAIN_PANEL_QUESTION_TEXT = new Set([
  'Pain score (0-10)',
  'Pain assessment completed?',
  'Pain assessment date',
])

export function isPainPanelTemplateQuestion(q: InitialAssessmentQuestion): boolean {
  const ref = q.metadata?.specRef
  if (ref !== '5.3') return false
  return PAIN_PANEL_QUESTION_TEXT.has(q.questionText.trim())
}

export function painPanelTemplateQuestionIds(sections: InitialAssessmentSection[]): Set<string> {
  const ids = new Set<string>()
  for (const sec of sections) {
    for (const q of sec.questions) {
      if (isPainPanelTemplateQuestion(q)) ids.add(q.id)
    }
  }
  return ids
}

function findQuestionByText(
  sections: InitialAssessmentSection[],
  text: string,
): InitialAssessmentQuestion | undefined {
  return sections.flatMap((s) => s.questions).find((q) => q.questionText.trim() === text)
}

export function isPainAssessmentComplete(pain: PainAssessmentMetadata | undefined): boolean {
  if (pain?.nrsScore != null && Number.isFinite(pain.nrsScore)) return true
  const total = computeAbbeyTotal(pain?.abbey)
  return total > 0 || ABBEY_HAS_ANY_SCORE(pain?.abbey)
}

function ABBEY_HAS_ANY_SCORE(abbey: PainAssessmentMetadata['abbey'] | undefined): boolean {
  if (!abbey) return false
  return (
    abbey.vocalisation != null ||
    abbey.facialExpression != null ||
    abbey.bodyLanguage != null ||
    abbey.behaviouralChange != null ||
    abbey.physiologicalChange != null ||
    abbey.physicalChanges != null
  )
}

export function primaryPainScore(pain: PainAssessmentMetadata | undefined): number | undefined {
  if (pain?.nrsScore != null && Number.isFinite(pain.nrsScore)) {
    return Math.min(10, Math.max(0, Math.round(pain.nrsScore)))
  }
  const total = computeAbbeyTotal(pain?.abbey)
  if (total > 0) {
    return Math.min(10, Math.round(total / 2))
  }
  return undefined
}

export function painOrDistressIdentified(pain: PainAssessmentMetadata | undefined): boolean {
  const nrs = pain?.nrsScore
  if (nrs != null && nrs > 0) return true
  const total = computeAbbeyTotal(pain?.abbey)
  if (total > 0) return true
  const band = pain?.abbey?.severityBand ?? abbeySeverityFromTotal(total)
  return band !== 'none' && total > 0
}

/** Sync panel metadata into canonical §5.3 template answers. */
export function syncPainAssessmentAnswers(
  sections: InitialAssessmentSection[],
  pain: PainAssessmentMetadata | undefined,
  onChange: (questionId: string, patch: InitialAssessmentAnswerInput) => void,
): void {
  const scoreQ = findQuestionByText(sections, 'Pain score (0-10)')
  const completedQ = findQuestionByText(sections, 'Pain assessment completed?')
  const dateQ = findQuestionByText(sections, 'Pain assessment date')
  const identifiedQ = findQuestionByText(sections, 'Pain or distress identified?')

  const score = primaryPainScore(pain)
  if (scoreQ && score != null) {
    onChange(scoreQ.id, { questionId: scoreQ.id, numberValue: score })
  }

  const complete = isPainAssessmentComplete(pain)
  if (completedQ) {
    onChange(completedQ.id, {
      questionId: completedQ.id,
      checked: complete,
      booleanValue: complete,
    })
  }

  const dateIso = pain?.abbey?.dateCompleted
  if (dateQ && dateIso) {
    onChange(dateQ.id, {
      questionId: dateQ.id,
      dateValue: dateIso.includes('T') ? dateIso : `${dateIso}T00:00:00.000Z`,
    })
  }

  if (identifiedQ && painOrDistressIdentified(pain)) {
    onChange(identifiedQ.id, {
      questionId: identifiedQ.id,
      checked: true,
      booleanValue: true,
    })
  }
}
