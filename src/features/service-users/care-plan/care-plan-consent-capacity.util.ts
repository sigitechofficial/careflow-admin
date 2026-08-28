import type { InitialAssessmentAnswer } from '@/features/service-users/initial-assessment/types'
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

const CONSENT_GIVEN_BY_SHORT: Record<string, string> = {
  service_user: 'Service User',
  representative: 'Representative',
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

  const capacityIntact = formatYesNo(findYesNoBySpecRef(answers, '2.4'))
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

  pushIf(items, 'Consent given by', formatSelectedLabel(findByFieldKey(answers, 'consentGivenBy')))
  pushIf(items, 'Information explained accessibly', formatYesNo(findYesNoBySpecRef(answers, '2.3')))

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
    const yn = formatYesNo(a)
    if (!yn) continue
    const label = normalizeText(a.question?.questionText ?? 'Information sharing')
    pushIf(items, label, yn)
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
