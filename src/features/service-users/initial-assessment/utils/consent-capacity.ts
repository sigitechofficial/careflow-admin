import {
  fieldKeyOf,
  findQuestionByFieldKey,
  findQuestionByTextIncludes,
  isExplicitNo,
  isYesAnswer,
  specRefOf,
} from '@/features/service-users/initial-assessment/utils/question-lookup'
import { textAnswerHasVisibleContent } from '@/features/service-users/initial-assessment/utils/secure-field'
import {
  refusalContextFromDecision,
  type CapacityDecisionRecord,
} from '@/features/service-users/initial-assessment/utils/capacity-decisions'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

type Answers = Record<string, InitialAssessmentAnswerInput>

/** Who can agree to things for the person — derived from the Consent tab (drives photography consent). */
export type ConsentGiver =
  | 'service_user'
  | 'lpa'
  | 'deputy'
  | 'court_order'
  | 'best_interest'
  | 'capacity_to_be_assessed'

export const CONSENT_GIVER_LABEL: Record<ConsentGiver, string> = {
  service_user: 'Service User',
  lpa: 'Health & Welfare LPA',
  deputy: 'Court-appointed Deputy',
  court_order: 'Court Order / other legal authority',
  best_interest: 'Best interest process',
  capacity_to_be_assessed: 'Capacity to be assessed first',
}

/** Legal-authority options that name a decision maker (then name / role / evidence are asked). */
export const LEGAL_AUTHORITY_WITH_DECISION_MAKER = ['hw_lpa', 'deputy', 'court_order_other'] as const

function selectedValue(answer: InitialAssessmentAnswerInput | undefined): string | undefined {
  const raw = answer?.selectedOptions
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' && value ? value : undefined
}

export function consentSelectedAnswer(
  sections: InitialAssessmentSection[],
  answers: Answers,
  fieldKey: string,
): string | undefined {
  const q = findQuestionByFieldKey(sections, fieldKey)
  return q ? selectedValue(answers[q.id]) : undefined
}

/**
 * §2.4 "Is there any reason to doubt capacity?" (Yes = doubt). Templates before the Consent tab rewrite
 * asked the inverse, "Capacity … appears intact?" (No = doubt), so both are read.
 */
export function isCapacityInDoubt(sections: InitialAssessmentSection[], answers: Answers): boolean {
  const doubtQ = findQuestionByFieldKey(sections, 'capacityDoubt')
  if (doubtQ) return isYesAnswer(answers[doubtQ.id])
  const legacyQ = sections
    .flatMap((s) => s.questions)
    .find((q) => specRefOf(q) === '2.4' && q.questionType === 'YES_NO' && fieldKeyOf(q) !== 'legalAuthority')
  return Boolean(legacyQ && isExplicitNo(answers[legacyQ.id]))
}

/** Understanding answered No / Unsure — flag that an MCA may be needed. */
export function understandingInDoubt(sections: InitialAssessmentSection[], answers: Answers): boolean {
  const value = consentSelectedAnswer(sections, answers, 'understandsAssessmentInfo')
  return value === 'no' || value === 'unsure'
}

export function hasLegalDecisionMaker(sections: InitialAssessmentSection[], answers: Answers): boolean {
  const value = consentSelectedAnswer(sections, answers, 'legalAuthority')
  return (LEGAL_AUTHORITY_WITH_DECISION_MAKER as readonly string[]).includes(value ?? '')
}

/** MCA screening outcome for this assessment = lacks capacity (never inferred from a doubt alone). */
export function mcaOutcomeLacksCapacity(sections: InitialAssessmentSection[], answers: Answers): boolean {
  return consentSelectedAnswer(sections, answers, 'mcaScreeningOutcome') === 'lacks_capacity'
}

/** §2.6 best-interests decision recorded (Yes + details, which include the person's wishes / objection). */
export function bestInterestDecisionRecorded(sections: InitialAssessmentSection[], answers: Answers): boolean {
  const requiredQ =
    findQuestionByFieldKey(sections, 'bestInterestDecisionRequired') ??
    findQuestionByTextIncludes(sections, 'best interest decision required')
  const detailsQ =
    findQuestionByFieldKey(sections, 'bestInterestDecisionDetails') ??
    findQuestionByTextIncludes(sections, 'best interest decision details')
  if (!requiredQ || !detailsQ || !isYesAnswer(answers[requiredQ.id])) return false
  return textAnswerHasVisibleContent(answers[detailsQ.id]?.textValue)
}

/**
 * What happens when the person says No to a consent question (assessment §2.1 or care §2.2).
 * A refusal is never ignored: with capacity it stands; with capacity in doubt the IA can only go on
 * once capacity for this decision is assessed as lacking AND a best-interests decision (recording the
 * person's wishes and objection) or a covering legal authority is recorded — and it goes to a manager.
 * Mirrors careflow-api `consentRefusalRoute`.
 */
export type ConsentRefusalRoute =
  | 'none'
  | 'refusal_stands'
  | 'needs_capacity_and_best_interests'
  | 'proceed_with_manager_review'

export function consentRefusalRoute(
  sections: InitialAssessmentSection[],
  answers: Answers,
  refused: boolean,
  /** Complete decision-specific record for the refused decision (replaces the global screening). */
  decision?: CapacityDecisionRecord,
): ConsentRefusalRoute {
  if (!refused) return 'none'
  if (!isCapacityInDoubt(sections, answers)) return 'refusal_stands'
  const fromDecision = refusalContextFromDecision(decision)
  if (fromDecision) {
    if (fromDecision.hasCapacity) return 'refusal_stands'
    if (!fromDecision.lacksCapacity) return 'needs_capacity_and_best_interests'
    return fromDecision.bestInterestRecorded || fromDecision.coveringAuthority
      ? 'proceed_with_manager_review'
      : 'needs_capacity_and_best_interests'
  }
  if (!mcaOutcomeLacksCapacity(sections, answers)) return 'needs_capacity_and_best_interests'
  if (bestInterestDecisionRecorded(sections, answers) || hasLegalDecisionMaker(sections, answers)) {
    return 'proceed_with_manager_review'
  }
  return 'needs_capacity_and_best_interests'
}

/**
 * Who agrees to photography. An attorney / deputy acts only once the person has been assessed as
 * lacking capacity (and within the authority's scope — checked by the manager); a doubt alone does
 * not move the decision away from the person.
 */
export function consentGiver(
  sections: InitialAssessmentSection[],
  answers: Answers,
  /** Complete decision-specific record for photography, when one exists. */
  decision?: CapacityDecisionRecord,
): ConsentGiver {
  if (!isCapacityInDoubt(sections, answers)) return 'service_user'
  if (decision?.outcome === 'has_capacity') return 'service_user'
  if (decision?.outcome === 'lacks_capacity') {
    return decision.authorityCovers === 'yes' ? authorityGiver(sections, answers) : 'best_interest'
  }
  const outcome = consentSelectedAnswer(sections, answers, 'mcaScreeningOutcome')
  if (outcome === 'has_capacity') return 'service_user'
  if (outcome !== 'lacks_capacity') return 'capacity_to_be_assessed'
  return authorityGiver(sections, answers)
}

function authorityGiver(sections: InitialAssessmentSection[], answers: Answers): ConsentGiver {
  const authority = consentSelectedAnswer(sections, answers, 'legalAuthority')
  if (authority === 'hw_lpa') return 'lpa'
  if (authority === 'deputy') return 'deputy'
  if (authority === 'court_order_other') return 'court_order'
  return 'best_interest'
}
