import {
  consentRefusalRoute,
  isCapacityInDoubt,
  understandingInDoubt,
} from '@/features/service-users/initial-assessment/utils/consent-capacity'
import {
  hasAgreedGoal,
  type AgreedGoalsMetadata,
} from '@/features/service-users/initial-assessment/utils/agreed-goals'
import { multiSelectHasAnswer } from '@/features/service-users/initial-assessment/utils/preferred-visit-times'
import {
  overallAssessmentProgress,
  sectionProgress,
  type SectionProgressContext,
} from '@/features/service-users/initial-assessment/utils/section-progress'
import {
  findQuestionBySpecRef,
  findQuestionByFieldKey,
  findQuestionByTextIncludes,
  findQuestionBySpecRefAndText,
  isExplicitNo,
  isYesAnswer,
  specRefOf,
} from '@/features/service-users/initial-assessment/utils/question-lookup'
import { shouldShowQuestion } from '@/features/service-users/initial-assessment/utils/conditional-visibility'
import { isAdlWorksheetComplete } from '@/features/service-users/initial-assessment/utils/adl-scoring'
import type { AdlMetadata } from '@/features/service-users/initial-assessment/utils/submission-metadata'
import {
  computeWaterlowScore,
  type WaterlowMetadata,
} from '@/features/service-users/initial-assessment/utils/waterlow-scoring'
import { hasTextAnswerValue } from '@/features/service-users/initial-assessment/utils/secure-field'
import type { HubTabId } from '@/features/service-users/initial-assessment/components/InitialAssessmentHubTabs'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentAgencySettings,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
  InitialAssessmentStatus,
} from '@/features/service-users/initial-assessment/types'
import { isWaterlowScoringComplete } from '@/features/service-users/initial-assessment/utils/waterlow-questions'
import { vitalsCompetencyWarning } from '@/features/service-users/initial-assessment/utils/vitals-validation'
import { DEFAULT_INITIAL_ASSESSMENT_AGENCY_SETTINGS } from '@/features/service-users/initial-assessment/utils/agency-settings-defaults'
import {
  FALLS_ASSESSMENT_REQUIRED_MESSAGE,
  fallsCaseFindingFromAnswers,
} from '@/features/service-users/initial-assessment/utils/falls-case-finding'
import {
  SPECIALIST_WORKSHEET_TITLES,
  specialistRequiredMessage,
} from '@/features/service-users/initial-assessment/utils/specialist-relevance-rules'
import { holisticTabById } from '@/features/service-users/initial-assessment/utils/holistic-assessment-tabs'
import { specialistInputsFromAssessment } from '@/features/service-users/initial-assessment/utils/specialist-relevance'
import {
  capacityDecisionIssues,
  completedDecisionFor,
  usesLegacyCapacityScreening,
  type CapacityDecisionRecord,
} from '@/features/service-users/initial-assessment/utils/capacity-decisions'
import { iaQuestionDisplayLabelOverride } from '@/features/service-users/initial-assessment/utils/holistic-assessment-labels'

export type ValidationIssue = {
  message: string
  sectionNumber: number
  blocking: boolean
  /** Navigate to a hub tab instead of (or as well as) a form section */
  hubTab?: HubTabId
}

/** Missing answers / worksheets — allowed when user confirms incomplete submit. */
export function isSkippableIncompleteValidationMessage(message: string): boolean {
  if (message.startsWith('Required: ')) return true
  if (message.startsWith('Specialist assessment required:')) return true
  if (message.startsWith('Assessor sign-off required:')) return true
  if (message.includes('Next review date is required')) return true
  if (message.includes('ADL dependency scores incomplete')) return true
  if (message.includes('Complete the Waterlow assessment')) return true
  if (message.includes('Falls trigger assessment') || message.includes('Falls assessment')) return true
  if (message.includes('Mobility aids')) return true
  if (message.includes('Emergency contact 1 not recorded')) return true
  if (message.startsWith('Agreed goals:')) return true
  if (message.startsWith('Capacity assessment incomplete')) return true
  return false
}

export function partitionSubmitValidationBlocks(blocks: ValidationIssue[]) {
  const hardBlocks = blocks.filter((b) => !isSkippableIncompleteValidationMessage(b.message))
  const skippableBlocks = blocks.filter((b) => isSkippableIncompleteValidationMessage(b.message))
  return { hardBlocks, skippableBlocks }
}

const EDITABLE: InitialAssessmentStatus[] = ['DRAFT', 'IN_PROGRESS']

export function isEditableStatus(status: InitialAssessmentStatus | undefined): boolean {
  return status != null && EDITABLE.includes(status)
}

function isAnsweredForValidation(
  q: { id: string; questionType: string; isRequired: boolean },
  value: InitialAssessmentAnswerInput | undefined,
): boolean {
  if (!value) return false
  if (q.questionType === 'CHECKBOX' || q.questionType === 'YES_NO') {
    return typeof value.checked === 'boolean' || typeof value.booleanValue === 'boolean'
  }
  if (q.questionType === 'NUMBER') {
    return value.numberValue != null && !Number.isNaN(value.numberValue)
  }
  if (q.questionType === 'DATE') return Boolean(value.dateValue?.trim())
  if (q.questionType === 'MULTI_SELECT') {
    return multiSelectHasAnswer(value, q as InitialAssessmentQuestion)
  }
  if (q.questionType === 'SINGLE_SELECT') {
    const opts = value.selectedOptions
    if (Array.isArray(opts)) return opts.length > 0
    return typeof opts === 'string' && opts.length > 0
  }
  if (value.hasSecureValue) return true
  return hasTextAnswerValue(value)
}

export function getSubmitValidationIssues(params: {
  sections: InitialAssessmentSection[]
  draftAnswers: Record<string, InitialAssessmentAnswerInput>
  waterlow?: WaterlowMetadata
  adl?: AdlMetadata
  /** Tab 12 environment worksheet — lone-worker Yes replaces retired §3.9 question. */
  environmentAssessment?: { loneWorkerRiskIdentified?: boolean | null }
  /** Final-tab goals agreed with the person (`metadata.agreedGoals`). Omit to skip the check. */
  agreedGoals?: AgreedGoalsMetadata
  status?: InitialAssessmentStatus
  agencySettings?: InitialAssessmentAgencySettings
  progressContext?: SectionProgressContext
  /** Skippable "Specialist assessment required: …" blocks built by the page (see specialistRequiredBlocks). */
  specialistBlocks?: ValidationIssue[]
  /** Decision-specific capacity records (`metadata.capacityDecisions`). */
  capacityDecisions?: CapacityDecisionRecord[]
}): {
  blocks: ValidationIssue[]
  warnings: ValidationIssue[]
  canSubmit: boolean
  /** True when only skippable blocks remain (incomplete submit allowed). */
  canSubmitIncomplete: boolean
  overallPercent: number
} {
  const { sections, draftAnswers, waterlow, adl, environmentAssessment, agreedGoals, status, progressContext } =
    params
  const agencySettings = params.agencySettings ?? DEFAULT_INITIAL_ASSESSMENT_AGENCY_SETTINGS
  const blocks: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []

  if (!isEditableStatus(status)) {
    return { blocks, warnings, canSubmit: false, canSubmitIncomplete: false, overallPercent: 0 }
  }

  const capacityInDoubt = isCapacityInDoubt(sections, draftAnswers)
  // A refusal is never ignored (CQC Regulation 11, MCA 2005). With capacity it stands; with capacity in
  // doubt the IA goes on only once capacity for this decision is assessed as lacking AND a best-interests
  // decision (recording the person's wishes and objection) or a covering legal authority is recorded —
  // and a manager reviews it. Mirrors careflow-api initial-assessment-validation.
  // Decision-specific capacity records replace the one global screening; IAs that only have the old
  // §2.mca screening keep the old rules.
  const capacityRecords = params.capacityDecisions ?? []
  const legacyScreeningAnswered = sections.some((sec) =>
    sec.questions.some((q) => specRefOf(q) === '2.mca' && isAnsweredForValidation(q, draftAnswers[q.id])),
  )
  const legacyCapacity = usesLegacyCapacityScreening(capacityRecords, legacyScreeningAnswered)
  const consentQ = findQuestionByFieldKey(sections, 'consentToAssessment') ?? findQuestionBySpecRef(sections, '2.1')
  const careConsentQ = findQuestionByFieldKey(sections, 'consentToCare') ?? findQuestionBySpecRef(sections, '2.2')
  for (const [q, label, ref, decision] of [
    [consentQ, 'Consent to assessment', '2.1', 'consent_to_assessment'],
    [careConsentQ, 'Consent to receive care', '2.2', 'consent_to_care'],
  ] as const) {
    const route = consentRefusalRoute(
      sections,
      draftAnswers,
      Boolean(q && isExplicitNo(draftAnswers[q.id])),
      legacyCapacity ? undefined : completedDecisionFor(capacityRecords, decision),
    )
    if (route === 'refusal_stands') {
      blocks.push({ message: `${label} is No — cannot submit (section ${ref})`, sectionNumber: 2, blocking: true })
    } else if (route === 'needs_capacity_and_best_interests') {
      blocks.push({
        message: `${label} is No and capacity is in doubt — record the capacity assessment for this decision and a best-interests decision (including the person's wishes and objection) or a covering legal authority (section ${ref})`,
        sectionNumber: 2,
        blocking: true,
      })
    } else if (route === 'proceed_with_manager_review') {
      warnings.push({
        message: `${label} refused by a person assessed as lacking capacity — manager review required; their wishes and objection must be considered (section ${ref})`,
        sectionNumber: 2,
        blocking: false,
      })
    }
  }

  if (understandingInDoubt(sections, draftAnswers) && !capacityInDoubt) {
    warnings.push({
      message: 'Service user may not understand the assessment — consider a Mental Capacity Assessment (section 2.3)',
      sectionNumber: 2,
      blocking: false,
    })
  }

  const mcaDone = findQuestionByTextIncludes(sections, 'mca completed')
  if (capacityInDoubt && (!mcaDone || !isYesAnswer(draftAnswers[mcaDone.id]))) {
    blocks.push({
      message: 'Capacity in doubt — MCA must be completed before submit (section 2.4–2.5)',
      sectionNumber: 2,
      blocking: true,
    })
  }

  const mcaReq = sections
    .flatMap((s) => s.questions)
    .find((q) => specRefOf(q) === '2.5' && q.questionText.toLowerCase().includes('mca required'))
  if (mcaReq && isYesAnswer(draftAnswers[mcaReq.id]) && mcaDone && !isYesAnswer(draftAnswers[mcaDone.id])) {
    blocks.push({
      message: 'MCA required but not completed (section 2.5)',
      sectionNumber: 2,
      blocking: true,
    })
  }

  const emergencyQ = findQuestionBySpecRef(sections, '13.3')
  if (emergencyQ && !isYesAnswer(draftAnswers[emergencyQ.id])) {
    const issue: ValidationIssue = {
      message: 'Emergency contact 1 not recorded (section 13)',
      sectionNumber: 13,
      blocking: agencySettings.blockWithoutEmergencyContact,
    }
    if (agencySettings.blockWithoutEmergencyContact) {
      blocks.push(issue)
    } else {
      warnings.push(issue)
    }
  }

  const noResponseQ = findQuestionByTextIncludes(sections, 'no response procedure')
  if (noResponseQ && isExplicitNo(draftAnswers[noResponseQ.id])) {
    const issue: ValidationIssue = {
      message: 'No response procedure not agreed — cannot activate care (section 13.5)',
      sectionNumber: 13,
      blocking: agencySettings.blockWithoutNoResponseProcedure,
    }
    if (agencySettings.blockWithoutNoResponseProcedure) {
      blocks.push(issue)
    } else {
      warnings.push(issue)
    }
  }

  // Falls: §12.7 case-finding (always asked) decides whether the Falls tab is needed. Mirrors API
  // initial-assessment-validation — change both together.
  const fallsFinding = fallsCaseFindingFromAnswers(sections, draftAnswers)
  if (fallsFinding.status === 'required' && adl?.fallsAssessmentCompleted !== true) {
    blocks.push({ message: FALLS_ASSESSMENT_REQUIRED_MESSAGE, sectionNumber: 12, blocking: true })
  } else if (fallsFinding.status === 'suggested' && adl?.fallsAssessmentCompleted !== true) {
    warnings.push({
      message: `Falls assessment suggested — ${fallsFinding.reasons.join(', ').toLowerCase()} recorded (section 12.7)`,
      sectionNumber: 12,
      blocking: false,
    })
  }
  const fallInjuryQ = findQuestionByFieldKey(sections, 'fallInjury')
  if (fallInjuryQ && isYesAnswer(draftAnswers[fallInjuryQ.id])) {
    warnings.push({
      message: 'Fall-related injury reported — manager review recommended (section 12.7)',
      sectionNumber: 12,
      blocking: false,
    })
  }

  if (adl?.mobilityAidsRequired == null) {
    blocks.push({
      message: 'Mobility aids in use or required not answered (section 12.8)',
      sectionNumber: 12,
      blocking: true,
    })
  } else if (adl.mobilityAidsRequired === true && !adl.mobilityAidsList?.trim()) {
    blocks.push({
      message: 'Mobility aids list required when aids are in use (section 12.8)',
      sectionNumber: 12,
      blocking: true,
    })
  }

  const safeguardingQ =
    findQuestionByFieldKey(sections, 'safeguardingConcern') ?? findQuestionBySpecRef(sections, '13.1')
  const safeguardingDetailsQ = findQuestionByTextIncludes(sections, 'safeguarding concern details')
  if (safeguardingQ && isYesAnswer(draftAnswers[safeguardingQ.id])) {
    const details = safeguardingDetailsQ ? draftAnswers[safeguardingDetailsQ.id] : undefined
    if (!details?.textValue?.trim()) {
      blocks.push({
        message: 'Safeguarding concern flagged but details are missing (section 13.1)',
        sectionNumber: 13,
        blocking: true,
      })
    }
    warnings.push({
      message: 'Safeguarding concern flagged — manager review required',
      sectionNumber: 13,
      blocking: false,
    })
  }

  const woundsQ =
    findQuestionByFieldKey(sections, 'hasWounds') ??
    findQuestionByTextIncludes(sections, 'currently has ulcers or wounds')
  const woundAssessmentQ = findQuestionByTextIncludes(sections, 'wound assessment been completed')
  if (
    woundsQ &&
    isYesAnswer(draftAnswers[woundsQ.id]) &&
    woundAssessmentQ &&
    !isYesAnswer(draftAnswers[woundAssessmentQ.id])
  ) {
    blocks.push({
      message: 'Active wounds recorded but wound assessment not completed (section 11.2)',
      sectionNumber: 11,
      blocking: true,
    })
  }

  const saltReferralReqQ = findQuestionByTextIncludes(sections, 'salt referral required')
  const saltReferralMadeQ = findQuestionByTextIncludes(sections, 'salt referral made')
  if (
    saltReferralReqQ &&
    isYesAnswer(draftAnswers[saltReferralReqQ.id]) &&
    saltReferralMadeQ &&
    !isYesAnswer(draftAnswers[saltReferralMadeQ.id])
  ) {
    warnings.push({
      message: 'SALT referral required but not yet made (section 5.4)',
      sectionNumber: 5,
      blocking: false,
    })
  }

  const sgReferralReqQ = findQuestionByTextIncludes(sections, 'local authority safeguarding referral required')
  const sgReferralMadeQ = findQuestionByTextIncludes(sections, 'safeguarding referral made')
  if (
    sgReferralReqQ &&
    isYesAnswer(draftAnswers[sgReferralReqQ.id]) &&
    sgReferralMadeQ &&
    !isYesAnswer(draftAnswers[sgReferralMadeQ.id])
  ) {
    warnings.push({
      message: 'Safeguarding referral required but not yet made (section 13.7)',
      sectionNumber: 13,
      blocking: false,
    })
  }

  if (!isAdlWorksheetComplete(adl?.rows)) {
    blocks.push({
      message:
        'ADL dependency scores incomplete — score all activities in the worksheet (section 12, §12.2–12.6)',
      sectionNumber: 12,
      blocking: true,
    })
  }

  if (agencySettings.requireAssessorSignOff) {
    for (const fieldKey of ['assessorName', 'assessorRole', 'assessorSignDate'] as const) {
      const q = findQuestionByFieldKey(sections, fieldKey)
      if (q && !isAnsweredForValidation(q, draftAnswers[q.id])) {
        blocks.push({
          message: `Assessor sign-off required: ${iaQuestionDisplayLabelOverride(q) ?? q.questionText}`,
          sectionNumber: sections.find((s) => s.questions.some((x) => x.id === q.id))?.sectionNumber ?? 14,
          blocking: true,
        })
      }
    }
  }

  if (agreedGoals && !hasAgreedGoal(agreedGoals)) {
    blocks.push({
      message: 'Agreed goals: add at least one goal agreed with the person',
      sectionNumber: 14,
      blocking: true,
    })
  }

  const nextReviewQ = findQuestionByFieldKey(sections, 'nextReviewDate')
  if (
    agencySettings.requireNextReviewDate &&
    nextReviewQ &&
    !isAnsweredForValidation(nextReviewQ, draftAnswers[nextReviewQ.id])
  ) {
    blocks.push({
      message: 'Next review date is required (section 14)',
      sectionNumber: 14,
      blocking: true,
    })
  }

  for (const sec of sections) {
    for (const q of sec.questions) {
      if (!q.isRequired) continue
      // The old global screening is only required on IAs that already use it.
      if (!legacyCapacity && specRefOf(q) === '2.mca') continue
      if (!shouldShowQuestion(q, sections, draftAnswers)) continue
      if (isAnsweredForValidation(q, draftAnswers[q.id])) continue
      blocks.push({
        message: `Required: ${iaQuestionDisplayLabelOverride(q) ?? q.questionText}`,
        sectionNumber: sec.sectionNumber,
        blocking: true,
      })
    }
  }

  const capacityInputs = specialistInputsFromAssessment({ sections, answers: draftAnswers })
  const capacity = capacityDecisionIssues(
    capacityRecords,
    {
      capacityDoubt: capacityInputs.capacityDoubt,
      covertMedication: capacityInputs.covertMedication,
      dolRestrictions: capacityInputs.dolRestrictions,
      dolConcern: capacityInputs.dolConcern,
    },
    legacyScreeningAnswered,
  )
  for (const message of capacity.blocks) blocks.push({ message, sectionNumber: 2, blocking: true })
  for (const message of capacity.warnings) warnings.push({ message, sectionNumber: 2, blocking: false })

  blocks.push(...(params.specialistBlocks ?? []))

  const pressureRiskQ = findQuestionByTextIncludes(sections, 'pressure ulcer risk assessment completed')
  const waterlowRequired =
    (pressureRiskQ && isYesAnswer(draftAnswers[pressureRiskQ.id])) || isWaterlowScoringComplete(waterlow)
  if (waterlowRequired && !isWaterlowScoringComplete(waterlow)) {
    blocks.push({
      message: 'Complete the Waterlow assessment (gender and age bands required)',
      sectionNumber: 11,
      blocking: true,
      hubTab: 'waterlow',
    })
  }

  const wlScore = computeWaterlowScore(waterlow)
  const waterlowThreshold = agencySettings.managerReviewWaterlowThreshold
  if (wlScore >= 10) {
    warnings.push({
      message: 'Waterlow score 10+ — pressure ulcer prevention care plan required',
      sectionNumber: 11,
      blocking: false,
      hubTab: 'waterlow',
    })
  }
  if (wlScore >= waterlowThreshold) {
    warnings.push({
      message: 'High Waterlow score — manager review will be required',
      sectionNumber: 11,
      blocking: false,
      hubTab: 'waterlow',
    })
  }
  if (wlScore >= 20) {
    warnings.push({
      message: 'Very high Waterlow score — escalate to clinical lead',
      sectionNumber: 11,
      blocking: false,
      hubTab: 'waterlow',
    })
  }

  const loneWorkerQ = findQuestionByTextIncludes(sections, 'lone worker risk')
  const loneWorkerFromWorksheet = environmentAssessment?.loneWorkerRiskIdentified === true
  if ((loneWorkerQ && isYesAnswer(draftAnswers[loneWorkerQ.id])) || loneWorkerFromWorksheet) {
    warnings.push({
      message: 'Lone worker risk identified — double-up visits may be required',
      sectionNumber: 3,
      blocking: false,
    })
  }

  const percents = sections.map((s) =>
    sectionProgress(s, draftAnswers, sections, { ...progressContext, waterlow, adl }).percent,
  )
  const overallPercent =
    percents.length === 0 ? 0 : Math.round(percents.reduce((a, b) => a + b, 0) / percents.length)
  if (overallPercent < 40) {
    warnings.push({
      message: 'Assessment less than 40% complete — consider finishing more sections before submit',
      sectionNumber: 1,
      blocking: false,
    })
  }

  const vitalsIssue = vitalsCompetencyWarning(sections, draftAnswers)
  if (vitalsIssue) {
    blocks.push({
      message: vitalsIssue,
      sectionNumber: 4,
      blocking: true,
    })
  }

  const dedupe = (items: ValidationIssue[]) => {
    const seen = new Set<string>()
    return items.filter((i) => {
      const k = `${i.sectionNumber}:${i.message}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
  }

  const finalBlocks = dedupe(blocks)
  const finalWarnings = dedupe(warnings)
  const { hardBlocks, skippableBlocks } = partitionSubmitValidationBlocks(finalBlocks)

  return {
    blocks: finalBlocks,
    warnings: finalWarnings,
    canSubmit: finalBlocks.length === 0,
    canSubmitIncomplete: hardBlocks.length === 0 && skippableBlocks.length > 0,
    overallPercent,
  }
}

/**
 * Required specialist worksheets that are not complete → skippable blocks (same text as the server's
 * `specialistRequiredIssues`, which is authoritative at submit).
 */
export function specialistRequiredBlocks(
  relevanceByTab: ReadonlyMap<number, { status: string; reasons: string[] }>,
  worksheetComplete: Readonly<Record<number, boolean>>,
): ValidationIssue[] {
  const out: ValidationIssue[] = []
  for (const [tabIdText, title] of Object.entries(SPECIALIST_WORKSHEET_TITLES)) {
    const tabId = Number(tabIdText)
    const relevance = relevanceByTab.get(tabId)
    if (relevance?.status !== 'required' || worksheetComplete[tabId]) continue
    out.push({
      message: specialistRequiredMessage(title, relevance.reasons),
      sectionNumber: holisticTabById(tabId)?.enterpriseSection ?? 0,
      blocking: true,
    })
  }
  return out
}
