import type { InitialAssessmentAnswer } from '@/features/service-users/initial-assessment/types'
import { formatRichTextForDisplay } from '@/features/service-users/initial-assessment/utils/submission-display'
import {
  mentalCapacityAnswerValue,
  mentalCapacityRequiresDetailedAssessment,
  mentalCapacityShortCircuitComplete,
  normalizeMentalCapacityChecklistMetadata,
  type MentalCapacityChecklistMetadata,
} from '@/features/service-users/initial-assessment/utils/mental-capacity-checklist'
import { formatIaAssessmentSourceLine } from '@/features/service-users/care-plan/care-plan-risk-profile.util'
import {
  parseConsentRecords,
  setConsentRecords,
  type CarePlanConsentRecord,
} from '@/features/service-users/care-plan/care-plan-consent-meta'
import type { CarePlanDraftValues } from '@/features/service-users/care-plan/care-plan-draft-storage'

export type CarePlanIaConsentInfoItem = {
  label: string
  value: string
}

export type CarePlanIaConsentCapacityDisplay = {
  consentStatus: string | null
  mentalCapacityOutcome: string | null
  mcaSummary: string | null
  relevantInformation: CarePlanIaConsentInfoItem[]
  assessmentDateLabel: string | null
  source: 'initial_assessment'
  sourceLabel: string
  hasContent: boolean
}

const MCA_OUTCOME_SHORT: Record<string, string> = {
  has_capacity: 'Reasonable belief the person has capacity for the decision',
  lacks_capacity: 'Reasonable belief the person lacks capacity for the decision',
}

/** Option labels for the Consent tab selects (answers carry values only). */
const CONSENT_OPTION_LABEL: Record<string, Record<string, string>> = {
  understandsAssessmentInfo: { yes: 'Yes', no: 'No', unsure: 'Unsure' },
  consentMethod: { written: 'Written', verbal: 'Verbal', non_verbal: 'Non-verbal / implied', other: 'Other' },
  legalAuthority: {
    no: 'No',
    hw_lpa: 'Health & Welfare LPA',
    deputy: 'Court-appointed Deputy',
    court_order_other: 'Court Order / other legal authority',
    unsure: 'Unsure',
  },
  infoSharingWith: {
    gp: 'GP',
    district_nurse: 'District / community nurse',
    pharmacy: 'Pharmacy',
    hospital_ambulance: 'Hospital / ambulance',
    local_authority: 'Local authority / social worker',
    family_representatives: 'Family / representatives',
    other: 'Other',
  },
}

function consentOptionLabels(answers: InitialAssessmentAnswer[], fieldKey: string): string | null {
  const sel = findByFieldKey(answers, fieldKey)?.selectedOptions
  const values = Array.isArray(sel) ? sel.map(String) : typeof sel === 'string' && sel.trim() ? [sel.trim()] : []
  if (values.length === 0) return null
  return values.map((v) => CONSENT_OPTION_LABEL[fieldKey]?.[v] ?? normalizeText(v.replace(/_/g, ' '))).join(', ')
}

function richText(answers: InitialAssessmentAnswer[], fieldKey: string): string | null {
  return formatRichTextForDisplay(findByFieldKey(answers, fieldKey)?.textValue) || null
}

const CONSENT_GIVEN_BY_SHORT: Record<string, string> = {
  service_user: 'Service User',
  // Older IAs only — a family member / representative is never a legal decision-maker on their own.
  representative: 'Representative (no legal authority recorded)',
  best_interest: 'Best interest process',
  lpa: 'LPA / attorney',
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function questionMeta(answer: InitialAssessmentAnswer): Record<string, unknown> {
  const m = answer.question?.metadata
  return m && typeof m === 'object' && !Array.isArray(m) ? m : {}
}

function specRefOf(answer: InitialAssessmentAnswer): string | null {
  const ref = questionMeta(answer).specRef
  return typeof ref === 'string' ? ref : null
}

function fieldKeyOf(answer: InitialAssessmentAnswer): string | null {
  const key = questionMeta(answer).fieldKey
  return typeof key === 'string' ? key : null
}

function findByFieldKey(
  answers: InitialAssessmentAnswer[],
  fieldKey: string,
): InitialAssessmentAnswer | undefined {
  return answers.find((a) => fieldKeyOf(a) === fieldKey)
}

function findYesNoBySpecRef(
  answers: InitialAssessmentAnswer[],
  specRef: string,
): InitialAssessmentAnswer | undefined {
  return answers.find((a) => {
    if (specRefOf(a) !== specRef) return false
    // Prefer yes/no / checkbox over text companions under the same spec
    const t = a.question?.questionType
    return t === 'YES_NO' || t === 'CHECKBOX' || a.booleanValue != null || a.checked != null
  })
}

function findTextBySpecRef(
  answers: InitialAssessmentAnswer[],
  specRef: string,
): InitialAssessmentAnswer | undefined {
  return answers.find((a) => {
    if (specRefOf(a) !== specRef) return false
    return Boolean(a.textValue?.trim()) || a.question?.questionType === 'TEXTAREA'
  })
}

function formatYesNo(answer: InitialAssessmentAnswer | undefined): string | null {
  if (!answer) return null
  if (answer.checked === true || answer.booleanValue === true) return 'Yes'
  if (answer.checked === false || answer.booleanValue === false) return 'No'
  return null
}

function selectedRawValue(answer: InitialAssessmentAnswer | undefined): string | null {
  if (!answer) return null
  const sel = answer.selectedOptions
  if (Array.isArray(sel) && sel.length > 0) return String(sel[0])
  if (typeof sel === 'string' && sel.trim()) return sel.trim()
  if (answer.textValue?.trim()) return answer.textValue.trim()
  return null
}

function formatSelectedLabel(answer: InitialAssessmentAnswer | undefined): string | null {
  const raw = selectedRawValue(answer)
  if (!raw) return null
  return (
    MCA_OUTCOME_SHORT[raw] ??
    CONSENT_GIVEN_BY_SHORT[raw] ??
    normalizeText(raw.replace(/_/g, ' '))
  )
}

function formatText(answer: InitialAssessmentAnswer | undefined): string | null {
  const t = answer?.textValue?.trim()
  return t ? normalizeText(t) : null
}

function formatAssessmentDate(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Build consent status line from §2.1 / §2.2 yes/no answers.
 */
export function buildIaConsentStatus(answers: InitialAssessmentAnswer[]): string | null {
  const assessment = formatYesNo(findYesNoBySpecRef(answers, '2.1'))
  const care = formatYesNo(findYesNoBySpecRef(answers, '2.2'))
  if (!assessment && !care) return null
  if (assessment === 'Yes' && care === 'Yes') {
    return 'Consented to assessment and care'
  }
  if (assessment === 'Yes' && care === 'No') {
    return 'Consented to assessment; care consent not given'
  }
  if (assessment === 'No') {
    return care === 'Yes'
      ? 'Assessment consent not given; care consent recorded as Yes'
      : 'Assessment consent not given'
  }
  const parts: string[] = []
  if (assessment) parts.push(`Assessment consent: ${assessment}`)
  if (care) parts.push(`Care consent: ${care}`)
  return parts.join(' · ')
}

/**
 * Prefer MCA screening outcome, then §2.4 capacity yes/no, then checklist gates.
 */
export function buildIaMentalCapacityOutcome(
  answers: InitialAssessmentAnswer[],
  checklist: MentalCapacityChecklistMetadata,
): string | null {
  const screening = formatSelectedLabel(findByFieldKey(answers, 'mcaScreeningOutcome'))
  if (screening) return screening

  // Current template: "reason to doubt capacity?" (Yes = doubt); older IAs: "capacity … appears intact?".
  const doubt = formatYesNo(findByFieldKey(answers, 'capacityDoubt'))
  if (doubt === 'Yes') return 'Reason to doubt capacity for this decision — MCA required'
  if (doubt === 'No') return 'No reason to doubt capacity for this decision'
  const capacityIntact = formatYesNo(
    answers.find((a) => specRefOf(a) === '2.4' && (a.question?.questionText ?? '').toLowerCase().includes('appears intact')),
  )
  if (capacityIntact === 'Yes') return 'Capacity to consent appears intact'
  if (capacityIntact === 'No') return 'Capacity to consent does not appear intact'

  if (mentalCapacityShortCircuitComplete(checklist)) {
    return 'Mental capacity intact — no further assessment required (checklist)'
  }
  if (mentalCapacityRequiresDetailedAssessment(checklist)) {
    return 'Further mental capacity assessment indicated (checklist)'
  }

  const impairment = mentalCapacityAnswerValue(checklist, 'impairment')
  const unable = mentalCapacityAnswerValue(checklist, 'unableKeyDecision')
  if (impairment === false && unable == null) {
    return 'No impairment of mind or brain function recorded (checklist)'
  }
  return null
}

export function buildIaMcaSummary(
  answers: InitialAssessmentAnswer[],
  checklist: MentalCapacityChecklistMetadata,
): string | null {
  const parts: string[] = []

  if (checklist.assessmentType === 'preliminary' || checklist.assessmentType === 'review') {
    parts.push(
      checklist.assessmentType === 'preliminary'
        ? 'Checklist: preliminary assessment'
        : 'Checklist: review assessment',
    )
  }

  if (mentalCapacityShortCircuitComplete(checklist)) {
    parts.push('Gate questions indicate capacity; detailed checklist not required')
  } else if (mentalCapacityRequiresDetailedAssessment(checklist)) {
    const impairment = mentalCapacityAnswerValue(checklist, 'impairment')
    const unable = mentalCapacityAnswerValue(checklist, 'unableKeyDecision')
    const gateBits: string[] = []
    if (impairment === true) gateBits.push('impairment present')
    if (unable === true) gateBits.push('unable to make key decision')
    parts.push(
      gateBits.length > 0
        ? `Detailed assessment indicated (${gateBits.join('; ')})`
        : 'Detailed assessment indicated',
    )
  }

  const comments =
    (typeof checklist.sectionComments === 'string' && checklist.sectionComments.trim()) ||
    formatText(findByFieldKey(answers, 'mcaScreeningComments'))
  if (comments) parts.push(comments)

  const assessorBits = [
    checklist.assessorName?.trim(),
    checklist.assessorPosition?.trim(),
    checklist.assessorDate?.trim(),
  ].filter(Boolean)
  if (assessorBits.length) parts.push(`Assessor: ${assessorBits.join(' · ')}`)

  return parts.length > 0 ? parts.join('. ') : null
}

function pushIf(
  items: CarePlanIaConsentInfoItem[],
  label: string,
  value: string | null | undefined,
) {
  const v = value?.trim()
  if (v) items.push({ label, value: v })
}

export function buildIaConsentRelevantInformation(
  answers: InitialAssessmentAnswer[],
): CarePlanIaConsentInfoItem[] {
  const items: CarePlanIaConsentInfoItem[] = []

  // Older IAs (before the 12-question Consent tab)
  pushIf(items, 'Consent given by', formatSelectedLabel(findByFieldKey(answers, 'consentGivenBy')))

  const explained = formatYesNo(findByFieldKey(answers, 'infoExplainedUnderstood'))
  pushIf(items, 'Purpose of assessment explained', explained)
  if (explained === 'No') pushIf(items, 'Reason / action required', richText(answers, 'infoNotUnderstoodNextStep'))

  const understands = consentOptionLabels(answers, 'understandsAssessmentInfo')
  pushIf(items, 'Understands the assessment information', understands)
  if (understands && understands !== 'Yes') {
    pushIf(items, 'Understanding — details', richText(answers, 'understandsAssessmentInfoDetails'))
  }

  const consented = formatYesNo(findByFieldKey(answers, 'consentToAssessment'))
  if (consented === 'Yes') pushIf(items, 'Consent provided', consentOptionLabels(answers, 'consentMethod'))
  if (consented === 'No') pushIf(items, 'Consent refused — reason', richText(answers, 'consentToAssessmentNoReason'))

  if (formatYesNo(findByFieldKey(answers, 'communicationSupportRequired')) === 'Yes') {
    pushIf(items, 'Communication support needed', richText(answers, 'communicationSupportDetails'))
  }
  if (formatYesNo(findByFieldKey(answers, 'familyInvolvementConsent')) === 'Yes') {
    const repName = formatText(findByFieldKey(answers, 'familyInvolvedName'))
    const repRel = formatText(findByFieldKey(answers, 'familyInvolvedRelationship'))
    pushIf(
      items,
      'Family / representative involved',
      [repName, repRel ? `(${repRel})` : null].filter(Boolean).join(' ') || richText(answers, 'familyInvolvedWho'),
    )
  }
  if (formatYesNo(findByFieldKey(answers, 'infoSharingConsent')) === 'Yes') {
    pushIf(items, 'Information can be shared with', consentOptionLabels(answers, 'infoSharingWith'))
    pushIf(items, 'Sharing — what / limits', richText(answers, 'infoSharingLimits'))
  } else if (formatYesNo(findByFieldKey(answers, 'infoSharingConsent')) === 'No') {
    pushIf(items, 'Information sharing restrictions', richText(answers, 'infoSharingRestrictions'))
  }
  if (formatYesNo(findByFieldKey(answers, 'partialConsentRefusal')) === 'Yes') {
    pushIf(items, 'Does not consent to / conditions', richText(answers, 'partialConsentRefusalDetails'))
  }
  if (formatYesNo(findByFieldKey(answers, 'capacityDoubt')) === 'Yes') {
    pushIf(items, 'Reason to doubt capacity', richText(answers, 'capacityDoubtReason'))
  }
  const authority = consentOptionLabels(answers, 'legalAuthority')
  pushIf(items, 'Legal authority (Health & Welfare)', authority)
  if (authority && authority !== 'No' && authority !== 'Unsure') {
    const name = formatText(findByFieldKey(answers, 'legalAuthorityName'))
    const role = formatText(findByFieldKey(answers, 'legalAuthorityRole'))
    pushIf(items, 'Authorised person', [name, role ? `(${role})` : null].filter(Boolean).join(' '))
    pushIf(items, 'Evidence seen', richText(answers, 'legalAuthorityEvidence'))
  }
  if (authority === 'Unsure') pushIf(items, 'Legal authority — to check', richText(answers, 'legalAuthorityUnsureNote'))
  // Older IAs asked restrictions / preferences separately (now part of "does not consent to / conditions").
  if (formatYesNo(findByFieldKey(answers, 'consentRestrictions')) === 'Yes') {
    pushIf(items, 'Consent restrictions / preferences', richText(answers, 'consentRestrictionsDetails'))
  }

  const mcaRequired = answers.find(
    (a) =>
      specRefOf(a) === '2.5' &&
      (a.question?.questionText ?? '').toLowerCase().includes('mca required'),
  )
  pushIf(items, 'MCA required', formatYesNo(mcaRequired))

  const mcaCompleted = answers.find(
    (a) =>
      specRefOf(a) === '2.5' &&
      (a.question?.questionText ?? '').toLowerCase().includes('mca completed'),
  )
  pushIf(items, 'MCA completed', formatYesNo(mcaCompleted))

  pushIf(items, 'Best interest decision required', formatYesNo(findYesNoBySpecRef(answers, '2.6')))
  pushIf(items, 'Best interest details', formatText(findTextBySpecRef(answers, '2.6')))
  pushIf(items, 'Family / LPA / advocate', formatText(findTextBySpecRef(answers, '2.7')))

  for (const a of answers) {
    if (specRefOf(a) !== '2.8') continue
    // Current Consent tab sharing questions are summarised above.
    if (fieldKeyOf(a) === 'familyInvolvementConsent' || fieldKeyOf(a) === 'infoSharingConsent') continue
    const yn = formatYesNo(a)
    if (!yn) continue
    const label = normalizeText(a.question?.questionText ?? 'Information sharing')
    pushIf(items, label, yn)
  }
  if (formatYesNo(findByFieldKey(answers, 'consentShareWithFamily')) === 'Yes') {
    pushIf(items, 'Family we can share with', formatRichTextForDisplay(findByFieldKey(answers, 'shareWithFamilyWho')?.textValue))
  }

  return items
}

/**
 * Map IA consent / capacity answers + checklist for Care Plan display.
 * Does not write into __meta.consentRecords.
 */
export function mapIaConsentCapacityForCarePlan(
  answers: InitialAssessmentAnswer[],
  options?: {
    submittedAt?: string | null
    submissionMetadata?: Record<string, unknown> | null
  },
): CarePlanIaConsentCapacityDisplay {
  const checklist = normalizeMentalCapacityChecklistMetadata(
    options?.submissionMetadata?.mentalCapacityChecklist,
  )

  const consentStatus = buildIaConsentStatus(answers)
  const mentalCapacityOutcome = buildIaMentalCapacityOutcome(answers, checklist)
  const mcaSummary = buildIaMcaSummary(answers, checklist)
  const relevantInformation = buildIaConsentRelevantInformation(answers)
  const assessmentDateLabel =
    formatAssessmentDate(options?.submittedAt) ||
    (checklist.assessorDate?.trim() ? checklist.assessorDate.trim() : null)

  const hasContent = Boolean(
    consentStatus ||
      mentalCapacityOutcome ||
      mcaSummary ||
      relevantInformation.length > 0 ||
      assessmentDateLabel,
  )

  return {
    consentStatus,
    mentalCapacityOutcome,
    mcaSummary,
    relevantInformation,
    assessmentDateLabel,
    source: 'initial_assessment',
    sourceLabel: formatIaAssessmentSourceLine(options?.submittedAt),
    hasContent,
  }
}

/** Manual consent records from draft only — never merge IA into this list. */
export function manualConsentRecordsFromDraft(values: CarePlanDraftValues): CarePlanConsentRecord[] {
  return parseConsentRecords(values)
}

export function applyManualConsentRecords(
  values: CarePlanDraftValues,
  records: CarePlanConsentRecord[],
): CarePlanDraftValues {
  return setConsentRecords(values, records)
}

/**
 * Publish / draft invariant: IA answer (or question) ids must never appear in consentRecords.
 */
export function draftConsentMetaDoesNotContainIaIds(
  values: CarePlanDraftValues,
  iaIds: ReadonlySet<string>,
): boolean {
  const manual = parseConsentRecords(values)
  return manual.every((row) => !iaIds.has(row.id))
}
