import { findQuestionByFieldKey } from '@/features/service-users/initial-assessment/utils/question-lookup'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

/**
 * Answers that another tab already implies, filled only while the target is still unanswered so
 * the assessor is never asked twice (and can still override). Unlike derived concern gates these
 * questions stay visible.
 */
type AnswerDefaultRule = {
  target: string
  implied: (value: (fieldKey: string) => InitialAssessmentAnswerInput | undefined) => boolean
  /** Shown under the filled field as "From <source>". */
  source: string
}

function selected(answer: InitialAssessmentAnswerInput | undefined): string[] {
  const sel = answer?.selectedOptions
  if (Array.isArray(sel)) return sel.map(String)
  if (typeof sel === 'string' && sel.trim()) return [sel.trim()]
  return []
}

function isAnswered(answer: InitialAssessmentAnswerInput | undefined): boolean {
  return (
    answer?.booleanValue === true ||
    answer?.booleanValue === false ||
    answer?.checked === true ||
    answer?.checked === false
  )
}

const ANSWER_DEFAULT_RULES: AnswerDefaultRule[] = [
  {
    // §2.5 MCA required ← Consent: reason to doubt capacity (suggested — still editable)
    target: 'mcaRequired',
    implied: (v) => v('capacityDoubt')?.booleanValue === true || v('capacityDoubt')?.checked === true,
    source: 'Consent: reason to doubt capacity for this decision',
  },
  {
    // §1.9 hospital stay ← referral from hospital / assessment after discharge
    target: 'recentHospitalStay',
    implied: (v) =>
      selected(v('referralSource')).includes('hospital_discharge') ||
      selected(v('assessmentReason')).includes('post_hospital'),
    source: 'Personal Details (1.1): referral source is hospital discharge / post-hospital assessment',
  },
  {
    // §13.9 district nurse ← discharge follow-up
    target: 'districtNurseInvolved',
    implied: (v) => selected(v('dischargeFollowUps')).includes('district_nurse'),
    source: 'Personal Details (1.9): discharge follow-up by a district nurse',
  },
  {
    // §18.4 fire safety ← the person is a current smoker
    target: 'smokingInProperty',
    implied: (v) => selected(v('smokingStatus')).includes('current_smoker'),
    source: 'Personal Details (1.11): current smoker',
  },
]

export function syncCrossTabAnswerDefaults(
  sections: InitialAssessmentSection[],
  answers: Record<string, InitialAssessmentAnswerInput>,
): { answers: Record<string, InitialAssessmentAnswerInput>; syncedQuestionIds: string[] } {
  let next = answers
  const synced: string[] = []
  const value = (fieldKey: string) => {
    const q = findQuestionByFieldKey(sections, fieldKey)
    return q ? next[q.id] : undefined
  }
  for (const rule of ANSWER_DEFAULT_RULES) {
    const target = findQuestionByFieldKey(sections, rule.target)
    if (!target || isAnswered(next[target.id])) continue
    if (!rule.implied(value)) continue
    next = {
      ...next,
      [target.id]: { ...next[target.id], questionId: target.id, booleanValue: true, checked: true },
    }
    synced.push(target.id)
  }
  return { answers: next, syncedQuestionIds: synced }
}

/**
 * "From …" note for a question another tab filled: shown while its answer is Yes and the source
 * answer still implies it (so an assessor's own No never gets a misleading note).
 */
export function autoFillSourceNote(
  question: InitialAssessmentQuestion,
  sections: InitialAssessmentSection[],
  answers: Record<string, InitialAssessmentAnswerInput>,
): string | null {
  const fieldKey = question.metadata?.fieldKey
  if (typeof fieldKey !== 'string') return null
  const rule = ANSWER_DEFAULT_RULES.find((r) => r.target === fieldKey)
  if (!rule) return null
  const answer = answers[question.id]
  if (answer?.booleanValue !== true && answer?.checked !== true) return null
  const value = (key: string) => {
    const q = findQuestionByFieldKey(sections, key)
    return q ? answers[q.id] : undefined
  }
  return rule.implied(value) ? rule.source : null
}

/**
 * The person's own alcohol concern / drug use — a prompt on the Environment tab's substance factor.
 * It never answers that factor: personal use is only a staff-safety risk if it affects staff.
 */
export function substanceMisuseImpliedByAnswers(
  sections: InitialAssessmentSection[],
  answers: Record<string, InitialAssessmentAnswerInput>,
): boolean {
  const alcohol = findQuestionByFieldKey(sections, 'alcoholUse')
  const drugs = findQuestionByFieldKey(sections, 'recreationalDrugUse')
  return (
    (alcohol ? selected(answers[alcohol.id]).includes('concern_dependence') : false) ||
    (drugs ? selected(answers[drugs.id]).includes('yes') : false)
  )
}
