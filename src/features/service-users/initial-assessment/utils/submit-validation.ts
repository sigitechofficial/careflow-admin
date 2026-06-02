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
  InitialAssessmentSection,
  InitialAssessmentStatus,
} from '@/features/service-users/initial-assessment/types'
import { isWaterlowScoringComplete } from '@/features/service-users/initial-assessment/utils/waterlow-questions'
import { vitalsCompetencyWarning } from '@/features/service-users/initial-assessment/utils/vitals-validation'
import { DEFAULT_INITIAL_ASSESSMENT_AGENCY_SETTINGS } from '@/features/service-users/initial-assessment/utils/agency-settings-defaults'

export type ValidationIssue = {
  message: string
  sectionNumber: number
  blocking: boolean
  /** Navigate to a hub tab instead of (or as well as) a form section */
  hubTab?: HubTabId
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
    return multiSelectHasAnswer(value, q)
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
  status?: InitialAssessmentStatus
  agencySettings?: InitialAssessmentAgencySettings
  progressContext?: SectionProgressContext
}): { blocks: ValidationIssue[]; warnings: ValidationIssue[]; canSubmit: boolean; overallPercent: number } {
  const { sections, draftAnswers, waterlow, adl, status, progressContext } = params
  const agencySettings = params.agencySettings ?? DEFAULT_INITIAL_ASSESSMENT_AGENCY_SETTINGS
  const blocks: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []

  if (!isEditableStatus(status)) {
    return { blocks, warnings, canSubmit: false, overallPercent: 0 }
  }

  const consentQ = findQuestionBySpecRef(sections, '2.1')
  if (consentQ && isExplicitNo(draftAnswers[consentQ.id])) {
    blocks.push({
      message: 'Consent to assessment is No — cannot submit (section 2.1)',
      sectionNumber: 2,
      blocking: true,
    })
  }

  const careConsentQ = findQuestionBySpecRef(sections, '2.2')
  if (careConsentQ && isExplicitNo(draftAnswers[careConsentQ.id])) {
    blocks.push({
      message: 'Consent to receive care is No — cannot submit (section 2.2)',
      sectionNumber: 2,
      blocking: true,
    })
  }

  const capacityQ = findQuestionBySpecRef(sections, '2.4')
  const mcaDone = findQuestionByTextIncludes(sections, 'mca completed')
  if (capacityQ && isExplicitNo(draftAnswers[capacityQ.id]) && (!mcaDone || !isYesAnswer(draftAnswers[mcaDone.id]))) {
    blocks.push({
      message: 'Capacity not intact — MCA must be completed before submit (section 2.4–2.5)',
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

  const fallsReportedQ = findQuestionBySpecRefAndText(sections, '12.7', 'falls in')
  if (fallsReportedQ && isYesAnswer(draftAnswers[fallsReportedQ.id]) && adl?.fallsAssessmentCompleted !== true) {
    blocks.push({
      message: 'Falls reported but falls trigger assessment not completed (section 12.7)',
      sectionNumber: 12,
      blocking: true,
    })
  }

  if (adl?.fallsAssessmentCompleted == null) {
    blocks.push({
      message: 'Falls trigger assessment completion not recorded (section 12.7)',
      sectionNumber: 12,
      blocking: true,
    })
  } else if (adl.fallsAssessmentCompleted === true && !adl.fallsAssessmentDate?.trim()) {
    blocks.push({
      message: 'Falls trigger assessment date required when completed (section 12.7)',
      sectionNumber: 12,
      blocking: true,
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
          message: `Assessor sign-off required: ${q.questionText}`,
          sectionNumber: sections.find((s) => s.questions.some((x) => x.id === q.id))?.sectionNumber ?? 14,
          blocking: true,
        })
      }
    }
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
      if (!shouldShowQuestion(q, sections, draftAnswers)) continue
      if (isAnsweredForValidation(q, draftAnswers[q.id])) continue
      blocks.push({
        message: `Required: ${q.questionText}`,
        sectionNumber: sec.sectionNumber,
        blocking: true,
      })
    }
  }

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
  if (loneWorkerQ && isYesAnswer(draftAnswers[loneWorkerQ.id])) {
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

  return {
    blocks: finalBlocks,
    warnings: finalWarnings,
    canSubmit: finalBlocks.length === 0,
    overallPercent,
  }
}
