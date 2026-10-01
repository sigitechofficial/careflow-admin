/**
 * Semantic cross-tab sync/link helpers (Birdie-style: one master, peers follow).
 * Does not overwrite non-empty peer fields unless noted.
 */

import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import type { AdvanceCarePlanningMetadata } from '@/features/service-users/initial-assessment/utils/advance-care-planning'
import type { EndOfLifeAssessmentMetadata } from '@/features/service-users/initial-assessment/utils/end-of-life-assessment'
import type { EquipmentSelectionMetadata } from '@/features/service-users/initial-assessment/utils/equipment-selection'
import type { FallsScreeningMetadata } from '@/features/service-users/initial-assessment/utils/falls-screening'
import type { MovingHandlingOperationsMetadata } from '@/features/service-users/initial-assessment/utils/moving-handling-operations'
import type { PhotographyConsentMetadata } from '@/features/service-users/initial-assessment/utils/photography-consent'
import type { WaterlowMetadata } from '@/features/service-users/initial-assessment/utils/waterlow-scoring'
import {
  computeWaterlowScore,
  waterlowBand,
} from '@/features/service-users/initial-assessment/utils/waterlow-scoring'
import {
  findQuestionByFieldKey,
  findQuestionByTextIncludes,
} from '@/features/service-users/initial-assessment/utils/question-lookup'

function textOf(
  answers: Record<string, InitialAssessmentAnswerInput>,
  q: { id: string } | undefined,
): string {
  if (!q) return ''
  return answers[q.id]?.textValue?.trim() ?? ''
}

function empty(s: string | undefined | null): boolean {
  return !s?.trim()
}

/** DATE answers keep the value in `dateValue` (older rows may hold text). */
function dateOf(
  answers: Record<string, InitialAssessmentAnswerInput>,
  q: { id: string } | undefined,
): string {
  if (!q) return ''
  return answers[q.id]?.dateValue?.slice(0, 10) || textOf(answers, q)
}

/**
 * Personal Details "LPA name" only stands for a Health & Welfare attorney when "LPA appointed?" says
 * health (or both). A property & finance attorney is never offered for care decisions.
 */
function healthWelfareLpaName(
  sections: InitialAssessmentSection[],
  answers: Record<string, InitialAssessmentAnswerInput>,
): string {
  const appointedQ = findQuestionByFieldKey(sections, 'lpoaAppointed')
  const raw = appointedQ ? answers[appointedQ.id]?.selectedOptions : undefined
  const appointed = Array.isArray(raw) ? raw[0] : raw
  if (appointed !== 'health' && appointed !== 'both') return ''
  return textOf(answers, findQuestionByFieldKey(sections, 'lpoaName'))
}

/** Falls Tab 8 → Moving & Handling risk filter (history + meds flag). */
export function syncFallsToMovingHandling(
  screening: FallsScreeningMetadata | undefined,
  current: MovingHandlingOperationsMetadata,
): MovingHandlingOperationsMetadata {
  if (!screening) return current
  const risk = { ...(current.riskFilter ?? {}) }
  let changed = false

  if (
    screening.consentToSixQuestions === true &&
    screening.q1FallsNeedInvestigating != null &&
    risk.historyOfFalls == null
  ) {
    risk.historyOfFalls = screening.q1FallsNeedInvestigating
    changed = true
  }

  if (
    screening.consentToSixQuestions === true &&
    screening.q4FourPlusMedsNoReview != null &&
    screening.q4FourPlusMedsNoReview === true &&
    risk.aged65PlusFallRiskMeds == null
  ) {
    risk.aged65PlusFallRiskMeds = true
    changed = true
  }

  return changed ? { ...current, riskFilter: risk } : current
}

/** Tab 1 identity/GP/LPOA → ACP header (fill empty only). */
export function prefillAcpFromIdentityAnswers(
  sections: InitialAssessmentSection[],
  answers: Record<string, InitialAssessmentAnswerInput>,
  current: AdvanceCarePlanningMetadata,
): AdvanceCarePlanningMetadata {
  const first = findQuestionByFieldKey(sections, 'firstName')
  const last = findQuestionByFieldKey(sections, 'lastName')
  const dob = findQuestionByFieldKey(sections, 'dateOfBirth') ?? findQuestionByTextIncludes(sections, 'date of birth')
  const nhs = findQuestionByFieldKey(sections, 'nhsNumber')
  const gp = findQuestionByFieldKey(sections, 'gpContactDetails')
  const address =
    findQuestionByFieldKey(sections, 'addressContactDetails') ??
    findQuestionByTextIncludes(sections, 'address and contact')

  const fullName = [textOf(answers, first), textOf(answers, last)].filter(Boolean).join(' ').trim()
  const next: AdvanceCarePlanningMetadata = { ...current }
  let changed = false

  if (empty(next.patientName) && fullName) {
    next.patientName = fullName
    changed = true
  }
  if (empty(next.dateOfBirth) && dateOf(answers, dob)) {
    next.dateOfBirth = dateOf(answers, dob)
    changed = true
  }
  if (empty(next.hospitalOrNhsNumber) && textOf(answers, nhs)) {
    next.hospitalOrNhsNumber = textOf(answers, nhs)
    changed = true
  }
  if (empty(next.gpDetails) && textOf(answers, gp)) {
    next.gpDetails = textOf(answers, gp)
    changed = true
  }
  if (empty(next.address) && textOf(answers, address)) {
    next.address = textOf(answers, address)
    changed = true
  }
  // Name only: whether this person holds a valid LPA for the decision is never inferred from a name.
  const hwLpaName = healthWelfareLpaName(sections, answers)
  if (empty(next.proxyContact1?.name) && hwLpaName) {
    next.proxyContact1 = { ...(next.proxyContact1 ?? {}), name: hwLpaName }
    changed = true
  }

  return changed ? next : current
}

/** Tab 1 identity/LPOA → Photography consent (fill empty only). */
export function prefillPhotographyFromIdentityAnswers(
  sections: InitialAssessmentSection[],
  answers: Record<string, InitialAssessmentAnswerInput>,
  current: PhotographyConsentMetadata,
): PhotographyConsentMetadata {
  const first = findQuestionByFieldKey(sections, 'firstName')
  const last = findQuestionByFieldKey(sections, 'lastName')
  const dob = findQuestionByFieldKey(sections, 'dateOfBirth') ?? findQuestionByTextIncludes(sections, 'date of birth')
  const nhs = findQuestionByFieldKey(sections, 'nhsNumber')

  const next: PhotographyConsentMetadata = { ...current }
  let changed = false

  if (empty(next.firstNames) && textOf(answers, first)) {
    next.firstNames = textOf(answers, first)
    changed = true
  }
  if (empty(next.surname) && textOf(answers, last)) {
    next.surname = textOf(answers, last)
    changed = true
  }
  if (empty(next.dateOfBirth) && dateOf(answers, dob)) {
    next.dateOfBirth = dateOf(answers, dob)
    changed = true
  }
  if (empty(next.nhsNumber) && textOf(answers, nhs)) {
    next.nhsNumber = textOf(answers, nhs)
    changed = true
  }
  const hwLpaName = healthWelfareLpaName(sections, answers)
  if (empty(next.lpoaName) && hwLpaName) {
    next.lpoaName = hwLpaName
    changed = true
  }

  return changed ? next : current
}

/** EOL dnrInPlace → §13.6 DNACPR template (if present). */
export function syncDnacprFromEndOfLife(
  sections: InitialAssessmentSection[],
  eol: EndOfLifeAssessmentMetadata | undefined,
  onAnswerChange: (questionId: string, patch: InitialAssessmentAnswerInput) => void,
): void {
  const dnr = eol?.dnrInPlaceAnswer
  if (dnr !== true && dnr !== false) return
  const q =
    findQuestionByTextIncludes(sections, 'dnacpr or respect') ??
    findQuestionByTextIncludes(sections, 'dnacpr')
  if (!q) return
  onAnswerChange(q.id, {
    questionId: q.id,
    checked: dnr,
    booleanValue: dnr,
  })
}

/** Env pets → §3 petsPresent (one-way when peer empty). */
export function syncEnvPetsToSection3(
  sections: InitialAssessmentSection[],
  petsYes: boolean | null | undefined,
  answers: Record<string, InitialAssessmentAnswerInput>,
  onAnswerChange: (questionId: string, patch: InitialAssessmentAnswerInput) => void,
): void {
  if (petsYes !== true && petsYes !== false) return
  const q = findQuestionByFieldKey(sections, 'petsPresent')
  if (!q) return
  const existing = answers[q.id]
  if (existing?.booleanValue != null || existing?.checked != null) return
  onAnswerChange(q.id, {
    questionId: q.id,
    checked: petsYes,
    booleanValue: petsYes,
  })
}

/**
 * The Waterlow tab is the single master for the pressure-ulcer score and band; Equipment Selection
 * keeps a read-only copy (compose reads it). Cleared again when the Waterlow is reset.
 */
export function syncWaterlowScoreToEquipment(
  waterlow: WaterlowMetadata | undefined,
  current: EquipmentSelectionMetadata,
): EquipmentSelectionMetadata {
  const score = computeWaterlowScore(waterlow)
  const waterlowScore = score > 0 ? String(score) : undefined
  const selectedRiskLevel = score > 0 ? waterlowBand(score).label : undefined
  if (
    (current.waterlowScore?.trim() || undefined) === waterlowScore &&
    (current.selectedRiskLevel?.trim() || undefined) === selectedRiskLevel
  ) {
    return current
  }
  return { ...current, waterlowScore, selectedRiskLevel }
}
