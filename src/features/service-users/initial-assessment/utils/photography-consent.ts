/** Photography consent worksheet — paper form (holistic tab 18). */

export type PhotographyConsentGender = 'male' | 'female' | null

/** IA Consent tab gate — only "yes" asks for the consent record; "not_now" = revisit if a skin concern appears. */
export type PhotographyNeeded = 'yes' | 'no' | 'not_now'

export const PHOTOGRAPHY_NEEDED_OPTIONS: { value: PhotographyNeeded; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'not_now', label: 'Not now' },
]

export type PhotographyConsentMetadata = {
  photographyNeeded?: PhotographyNeeded
  /** IA compact record: the statements were explained and consent was given (replaces typed signatures). */
  statementsAgreed?: boolean
  surname?: string
  firstNames?: string
  dateOfBirth?: string
  nhsNumber?: string
  gender?: PhotographyConsentGender
  specialRequirements?: string
  professionalName?: string
  professionalJobTitle?: string
  consentSubjectName?: string
  consentSignature?: string
  consentDate?: string
  consentPrintName?: string
  consentRelationship?: string
  serviceUserName?: string
  serviceUserSignature?: string
  serviceUserDate?: string
  lpoaName?: string
  lpoaSignature?: string
  lpoaDate?: string
}

export const PHOTOGRAPHY_CONSENT_STATEMENTS = [
  'I understand that I may be recognisable in the photographs though every effort will be made to conceal my identity where possible.',
  'I understand that the images will remain the property of Allfor Care Services may be used and reused in the future in accordance with this consent.',
  'I understand I may withdraw my consent at any stage.',
] as const

function str(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export function defaultPhotographyConsentMetadata(): PhotographyConsentMetadata {
  return {}
}

export function normalizePhotographyConsentMetadata(raw: unknown): PhotographyConsentMetadata {
  if (!raw || typeof raw !== 'object') return defaultPhotographyConsentMetadata()
  const row = raw as PhotographyConsentMetadata
  const gender =
    row.gender === 'male' || row.gender === 'female' ? row.gender : row.gender === null ? null : undefined

  const needed = PHOTOGRAPHY_NEEDED_OPTIONS.some((o) => o.value === row.photographyNeeded)
    ? row.photographyNeeded
    : undefined

  return {
    photographyNeeded: needed,
    statementsAgreed: row.statementsAgreed === true ? true : undefined,
    surname: str(row.surname),
    firstNames: str(row.firstNames),
    dateOfBirth: str(row.dateOfBirth),
    nhsNumber: str(row.nhsNumber),
    gender,
    specialRequirements: str(row.specialRequirements),
    professionalName: str(row.professionalName),
    professionalJobTitle: str(row.professionalJobTitle),
    consentSubjectName: str(row.consentSubjectName),
    consentSignature: str(row.consentSignature),
    consentDate: str(row.consentDate),
    consentPrintName: str(row.consentPrintName),
    consentRelationship: str(row.consentRelationship),
    serviceUserName: str(row.serviceUserName),
    serviceUserSignature: str(row.serviceUserSignature),
    serviceUserDate: str(row.serviceUserDate),
    lpoaName: str(row.lpoaName),
    lpoaSignature: str(row.lpoaSignature),
    lpoaDate: str(row.lpoaDate),
  }
}

export function isPhotographyConsentComplete(meta: PhotographyConsentMetadata | undefined): boolean {
  if (!meta) return false
  if (!meta.surname?.trim()) return false
  if (!meta.firstNames?.trim()) return false
  if (!meta.consentSubjectName?.trim()) return false
  if (!meta.consentSignature?.trim()) return false
  if (!meta.consentDate?.trim()) return false
  if (!meta.consentPrintName?.trim()) return false
  return true
}

/** Compact IA record (Consent tab, photography needed = Yes). */
export function isCompactPhotographyConsentRecorded(meta: PhotographyConsentMetadata | undefined): boolean {
  return Boolean(
    meta?.statementsAgreed &&
      meta.consentPrintName?.trim() &&
      meta.consentDate?.trim() &&
      meta.professionalName?.trim(),
  )
}

/**
 * Consent tab completeness: answering No / Not now is complete; Yes needs the compact record.
 * IAs saved before the gate existed still count when the full paper form was filled in.
 */
export function isIaPhotographyConsentComplete(meta: PhotographyConsentMetadata | undefined): boolean {
  if (!meta) return false
  if (meta.photographyNeeded === 'no' || meta.photographyNeeded === 'not_now') return true
  if (meta.photographyNeeded === 'yes') return isCompactPhotographyConsentRecorded(meta)
  return isPhotographyConsentComplete(meta)
}
