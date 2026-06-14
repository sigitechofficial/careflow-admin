/** Per-completion consent captured when adding or repeating any assessment. */

export type AssessmentConsentGivenBy =
  | 'service_user'
  | 'representative'
  | 'lpa'
  | 'deputy'
  | 'best_interest'
  | 'imca'

export type AssessmentConsentMethod = 'verbal' | 'written' | 'electronic'

export type AssessmentConsentMetadata = {
  /** Consent to this specific assessment on this date. */
  consentObtained?: boolean | null
  givenBy?: AssessmentConsentGivenBy | null
  personName?: string
  personRelationship?: string
  method?: AssessmentConsentMethod | null
  /** ISO date (YYYY-MM-DD). */
  consentDate?: string
  capacityIntact?: boolean | null
  evidenceNote?: string
  /** Required when consentObtained is false. */
  declinedReason?: string
  assessmentKey?: string
  assessmentTitle?: string
}

export const ASSESSMENT_CONSENT_GIVEN_BY_OPTIONS: ReadonlyArray<{
  value: AssessmentConsentGivenBy
  label: string
}> = [
  { value: 'service_user', label: 'Service user' },
  { value: 'representative', label: 'Representative / family' },
  { value: 'lpa', label: 'LPA / attorney' },
  { value: 'deputy', label: 'Court-appointed deputy' },
  { value: 'best_interest', label: 'Best interest process' },
  { value: 'imca', label: 'IMCA / advocate' },
]

export const ASSESSMENT_CONSENT_METHOD_OPTIONS: ReadonlyArray<{
  value: AssessmentConsentMethod
  label: string
}> = [
  { value: 'verbal', label: 'Verbal' },
  { value: 'written', label: 'Written' },
  { value: 'electronic', label: 'Electronic' },
]

const GIVEN_BY_VALUES = new Set<string>(ASSESSMENT_CONSENT_GIVEN_BY_OPTIONS.map((o) => o.value))
const METHOD_VALUES = new Set<string>(ASSESSMENT_CONSENT_METHOD_OPTIONS.map((o) => o.value))

/** Photography consent form is the consent record itself. */
export function isAssessmentConsentCaptureExempt(assessmentKey: string): boolean {
  return assessmentKey === 'photography-consent'
}

export function defaultAssessmentConsentMetadata(
  partial?: Partial<AssessmentConsentMetadata>,
): AssessmentConsentMetadata {
  const today = new Date().toISOString().slice(0, 10)
  return {
    consentObtained: null,
    givenBy: null,
    personName: '',
    personRelationship: '',
    method: null,
    consentDate: today,
    capacityIntact: null,
    evidenceNote: '',
    declinedReason: '',
    ...partial,
  }
}

export function normalizeAssessmentConsentMetadata(raw: unknown): AssessmentConsentMetadata {
  if (!raw || typeof raw !== 'object') return defaultAssessmentConsentMetadata()
  const row = raw as AssessmentConsentMetadata
  const givenBy =
    typeof row.givenBy === 'string' && GIVEN_BY_VALUES.has(row.givenBy)
      ? (row.givenBy as AssessmentConsentGivenBy)
      : null
  const method =
    typeof row.method === 'string' && METHOD_VALUES.has(row.method)
      ? (row.method as AssessmentConsentMethod)
      : null

  return {
    consentObtained:
      row.consentObtained === true || row.consentObtained === false ? row.consentObtained : null,
    givenBy,
    personName: typeof row.personName === 'string' ? row.personName : '',
    personRelationship: typeof row.personRelationship === 'string' ? row.personRelationship : '',
    method,
    consentDate: typeof row.consentDate === 'string' ? row.consentDate : '',
    capacityIntact:
      row.capacityIntact === true || row.capacityIntact === false ? row.capacityIntact : null,
    evidenceNote: typeof row.evidenceNote === 'string' ? row.evidenceNote : '',
    declinedReason: typeof row.declinedReason === 'string' ? row.declinedReason : '',
    assessmentKey: typeof row.assessmentKey === 'string' ? row.assessmentKey : undefined,
    assessmentTitle: typeof row.assessmentTitle === 'string' ? row.assessmentTitle : undefined,
  }
}

export function extractAssessmentConsentFromSnapshot(
  snapshot?: Record<string, unknown> | null,
): AssessmentConsentMetadata | null {
  if (!snapshot || typeof snapshot !== 'object') return null
  const raw = snapshot.assessmentConsent
  if (!raw || typeof raw !== 'object') return null
  return normalizeAssessmentConsentMetadata(raw)
}

function boolAnswered(value: boolean | null | undefined): boolean {
  return value === true || value === false
}

export function validateAssessmentConsent(
  consent: AssessmentConsentMetadata | undefined,
  assessmentKey: string,
): string | null {
  if (isAssessmentConsentCaptureExempt(assessmentKey)) return null
  if (!consent) return 'Record consent for this assessment before saving.'

  if (!boolAnswered(consent.consentObtained)) {
    return 'Confirm whether consent was obtained for this assessment.'
  }

  if (consent.consentObtained === false) {
    if (!consent.declinedReason?.trim()) {
      return 'Document why consent was not obtained (declined or unable to proceed).'
    }
    return null
  }

  if (!consent.givenBy) return 'Select who gave consent.'
  if (!consent.method) return 'Select how consent was recorded.'
  if (!consent.consentDate?.trim()) return 'Consent date is required.'

  if (consent.givenBy !== 'service_user') {
    if (!consent.personName?.trim()) return 'Enter the name of the person who gave consent.'
    if (!consent.personRelationship?.trim()) {
      return 'Enter the relationship or role of the person who gave consent.'
    }
  }

  if (!boolAnswered(consent.capacityIntact)) {
    return 'Confirm whether capacity to consent was intact at the time of this assessment.'
  }

  return null
}

export function attachAssessmentConsentToSnapshot(
  snapshot: Record<string, unknown>,
  consent: AssessmentConsentMetadata,
): Record<string, unknown> {
  return {
    ...snapshot,
    assessmentConsent: {
      ...consent,
      evidenceNote: consent.evidenceNote?.trim() || undefined,
      personName: consent.personName?.trim() || undefined,
      personRelationship: consent.personRelationship?.trim() || undefined,
      declinedReason: consent.declinedReason?.trim() || undefined,
    },
  }
}

export function assessmentConsentSummaryLine(consent: AssessmentConsentMetadata): string {
  if (consent.consentObtained === false) {
    return `Consent not obtained — ${consent.declinedReason?.trim() || 'declined'}`
  }
  const givenBy =
    ASSESSMENT_CONSENT_GIVEN_BY_OPTIONS.find((o) => o.value === consent.givenBy)?.label ??
    consent.givenBy ??
    'Unknown'
  const date = consent.consentDate?.trim() || '—'
  return `Consent recorded (${givenBy}, ${date})`
}
