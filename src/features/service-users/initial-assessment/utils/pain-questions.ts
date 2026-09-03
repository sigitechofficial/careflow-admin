import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import {
  abbeySeverityFromTotal,
  computeAbbeyTotal,
  isAbbeyAssessmentComplete,
  isNrsAssessmentComplete,
  isPainAssessmentComplete,
  type PainAssessmentMetadata,
  type PainScaleUsed,
} from '@/features/service-users/initial-assessment/utils/pain-assessment-scoring'
import {
  findQuestionByFieldKey,
  findQuestionByTextIncludes,
  isYesAnswer,
} from '@/features/service-users/initial-assessment/utils/question-lookup'

export { isAbbeyAssessmentComplete, isNrsAssessmentComplete, isPainAssessmentComplete }

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

function singleSelectValue(answer: InitialAssessmentAnswerInput | undefined): string | undefined {
  const sel = answer?.selectedOptions
  if (Array.isArray(sel) && sel.length > 0) return String(sel[0])
  if (typeof sel === 'string' && sel.trim()) return sel.trim()
  return undefined
}

/**
 * Prefer Abbey when existing IA information indicates cognitive impairment,
 * diagnosed dementia, or speech/communication impairment. Prefer NRS otherwise.
 * Advisory only — the assessor may still use either scale or both.
 */
export function recommendedPainScale(
  sections: InitialAssessmentSection[],
  answers: Record<string, InitialAssessmentAnswerInput>,
): Exclude<PainScaleUsed, 'both'> {
  const cognitiveQ = findQuestionByFieldKey(sections, 'cognitiveImpairment')
  const cognitive = cognitiveQ ? singleSelectValue(answers[cognitiveQ.id]) : undefined
  if (cognitive && cognitive !== 'none') return 'abbey'

  const dementiaQ = findQuestionByTextIncludes(sections, 'Diagnosed dementia')
  if (dementiaQ && isYesAnswer(answers[dementiaQ.id])) return 'abbey'

  const speechQ = findQuestionByTextIncludes(sections, 'Speech impairment or concern')
  if (speechQ && isYesAnswer(answers[speechQ.id])) return 'abbey'

  return 'nrs'
}

/** NRS 0–10 only. Abbey 0–18 must never be converted into this field. */
export function nrsScoreForSection53(pain: PainAssessmentMetadata | undefined): number | undefined {
  if (!isNrsAssessmentComplete(pain?.nrsScore)) return undefined
  return Math.min(10, Math.max(0, Math.round(pain!.nrsScore!)))
}

export function painOrDistressIdentified(pain: PainAssessmentMetadata | undefined): boolean {
  const nrs = pain?.nrsScore
  if (isNrsAssessmentComplete(nrs) && nrs! > 0) return true
  if (!isAbbeyAssessmentComplete(pain?.abbey)) return false
  const total = pain!.abbey!.total ?? computeAbbeyTotal(pain!.abbey)
  const band = abbeySeverityFromTotal(total)
  return band !== 'none'
}

export function iaAssessorNameDesignation(
  sections: InitialAssessmentSection[],
  answers: Record<string, InitialAssessmentAnswerInput>,
): string | undefined {
  const nameQ = findQuestionByFieldKey(sections, 'assessorName')
  const designationQ =
    findQuestionByFieldKey(sections, 'assessorDesignation') ??
    findQuestionByFieldKey(sections, 'assessorRole')
  const name = nameQ ? answers[nameQ.id]?.textValue?.trim() : undefined
  const designation = designationQ ? answers[designationQ.id]?.textValue?.trim() : undefined
  if (name && designation) return `${name} — ${designation}`
  return name || designation || undefined
}

/**
 * Stamp Abbey date/assessor from existing IA context only when Abbey itself is complete.
 * NRS-only completion must not invent an Abbey stamp. Existing manual values are not overwritten.
 */
export function stampPainAssessmentCompletion(
  pain: PainAssessmentMetadata,
  context: { dateCompleted?: string; assessorNameDesignation?: string },
): PainAssessmentMetadata {
  if (!isAbbeyAssessmentComplete(pain.abbey)) return pain
  const existingDate = pain.abbey?.dateCompleted?.trim()
  const existingAssessor = pain.abbey?.assessorNameDesignation?.trim()
  const nextDate = existingDate || context.dateCompleted?.trim() || undefined
  const nextAssessor = existingAssessor || context.assessorNameDesignation?.trim() || undefined
  if (!nextDate && !nextAssessor) return pain
  if (existingDate && existingAssessor) return pain
  return {
    ...pain,
    abbey: {
      ...pain.abbey,
      ...(nextDate && !existingDate ? { dateCompleted: nextDate } : {}),
      ...(nextAssessor && !existingAssessor ? { assessorNameDesignation: nextAssessor } : {}),
    },
  }
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

  const nrs = nrsScoreForSection53(pain)
  if (scoreQ && nrs != null) {
    onChange(scoreQ.id, { questionId: scoreQ.id, numberValue: nrs })
  }

  const complete = isPainAssessmentComplete(pain)
  if (completedQ && complete) {
    onChange(completedQ.id, {
      questionId: completedQ.id,
      checked: true,
      booleanValue: true,
    })
  }

  const dateIso = pain?.abbey?.dateCompleted
  if (dateQ && complete && dateIso) {
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
