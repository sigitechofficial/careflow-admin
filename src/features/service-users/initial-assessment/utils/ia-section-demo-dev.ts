import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type { IaAutofillLevel } from '@/features/service-users/initial-assessment/utils/ia-autofill-dev'
import type { InitialAssessmentAnswerInput } from '@/features/service-users/initial-assessment/types'

const IA_SECTION_GENERATE_PATH = '/dev/generate-ia-section'

/** Generating values is a quick in-memory compute; a short timeout is plenty. */
const IA_SECTION_GENERATE_TIMEOUT_MS = 30 * 1000

export type GenerateIaSectionResult = {
  /** Answer values keyed to real questionIds (profile/secure fields already excluded). */
  answers: InitialAssessmentAnswerInput[]
  /** This tab's worksheet metadata (e.g. { waterlow: {...} }); empty for answer-only tabs. */
  metadata: Record<string, unknown>
}

/**
 * GENERATE (no-save) severity-aware demo values for a single holistic tab. The backend computes
 * the values for the supplied `questionIds` (excluding profile/secure fields) plus this tab's
 * worksheet metadata and RETURNS them — nothing is persisted (no submission, no save, no submit).
 * The caller merges the values into the editable form draft in memory; the user saves/submits
 * via the normal controls. Dev/QA only — the endpoint 404s outside non-production/`ENABLE_DEV_TOOLS`.
 */
export type IaDemoIdentity = {
  firstName?: string | null
  middleName?: string | null
  lastName?: string | null
  preferredName?: string | null
  dateOfBirth?: string | null
  nhsNumber?: string | null
  nationalInsuranceNumber?: string | null
  gender?: string | null
  ethnicity?: string | null
  language?: string | null
  addressContact?: string | null
  gpContact?: string | null
  gpName?: string | null
  emergencyContact?: string | null
  allergies?: string | null
  accessInstruction?: string | null
}

const IDENTITY_PREFILL_KEYS = new Set([
  'firstName',
  'middleName',
  'lastName',
  'preferredName',
  'dateOfBirth',
  'gender',
  'nhsNumber',
  'nationalInsuranceNumber',
  'ethnicity',
  'language',
  'languagesSpoken',
  'addressContact',
  'gpContact',
  'gpName',
  'emergencyContact',
  'allergies',
  'accessInstruction',
  'doorCode',
])

export function isIaDemoIdentityPrefillQuestion(metadata: Record<string, unknown> | null | undefined): boolean {
  if (!metadata || typeof metadata !== 'object') return false
  if (metadata.aboutMeProfileField === true) return false
  const prefill = typeof metadata.prefillKey === 'string' ? metadata.prefillKey : ''
  if (prefill.startsWith('aboutMe_')) return false
  const field = typeof metadata.fieldKey === 'string' ? metadata.fieldKey : ''
  return IDENTITY_PREFILL_KEYS.has(prefill) || IDENTITY_PREFILL_KEYS.has(field)
}

const PROFILE_REF_ETHNICITY = 'SU_PROFILE_ETHNICITY'
const PROFILE_REF_LANGUAGE = 'SU_PROFILE_LANGUAGE'

function nonempty(value: string | null | undefined): string | undefined {
  const t = value?.trim()
  return t ? t : undefined
}

/**
 * Profile values the generator must not overwrite. Empty keys are omitted so the
 * backend can fill those IA fields with synthetic QA data.
 */
export function iaDemoIdentityFromDetail(
  detail: {
    firstName?: string | null
    middleName?: string | null
    lastName?: string | null
    preferredName?: string | null
    dateOfBirth?: string | null
    nhsNumber?: string | null
    nationalInsuranceNumber?: string | null
    gender?: { name?: string | null; code?: string | null } | null
    address?: {
      addressLine1?: string | null
      addressLine2?: string | null
      town?: string | null
      county?: string | null
      postcode?: string | null
    } | null
    phone?: string | null
    mobile?: string | null
    email?: string | null
    references?: Array<{ referenceType?: string | null; referenceValue?: string | null }> | null
    contacts?: Array<{
      firstName?: string | null
      lastName?: string | null
      phone?: string | null
      mobile?: string | null
      isEmergencyContact?: boolean
      isPrimary?: boolean
      relationshipType?: { name?: string | null; code?: string | null } | null
    }> | null
  } | null
  | undefined,
  extras?: { allergiesSummary?: string | null; accessInstruction?: string | null; gpContact?: string | null },
): IaDemoIdentity | null {
  if (!detail) return null
  const ethnicity = detail.references?.find((r) => r.referenceType === PROFILE_REF_ETHNICITY)?.referenceValue
  const language = detail.references?.find((r) => r.referenceType === PROFILE_REF_LANGUAGE)?.referenceValue
  const address = detail.address
    ? [
        detail.address.addressLine1,
        detail.address.addressLine2,
        detail.address.town,
        detail.address.county,
        detail.address.postcode,
        detail.phone ? `Tel: ${detail.phone}` : '',
        detail.mobile ? `Mobile: ${detail.mobile}` : '',
        detail.email ? `Email: ${detail.email}` : '',
      ]
        .filter((x) => typeof x === 'string' && x.trim())
        .join('\n')
    : ''
  const emergency =
    detail.contacts?.find((c) => c.isEmergencyContact) ?? detail.contacts?.find((c) => c.isPrimary)
  const emergencyText = emergency
    ? [
        [emergency.firstName, emergency.lastName].filter(Boolean).join(' '),
        emergency.relationshipType?.name,
        emergency.mobile || emergency.phone,
      ]
        .filter(Boolean)
        .join(' · ')
    : ''

  const identity: IaDemoIdentity = {
    firstName: nonempty(detail.firstName),
    middleName: nonempty(detail.middleName),
    lastName: nonempty(detail.lastName),
    preferredName: nonempty(detail.preferredName),
    dateOfBirth: nonempty(detail.dateOfBirth?.slice(0, 10)),
    nhsNumber: nonempty(detail.nhsNumber),
    nationalInsuranceNumber: nonempty(detail.nationalInsuranceNumber),
    gender: nonempty(detail.gender?.code) ?? nonempty(detail.gender?.name),
    ethnicity: nonempty(ethnicity),
    language: nonempty(language),
    addressContact: nonempty(address),
    gpContact: nonempty(extras?.gpContact),
    emergencyContact: nonempty(emergencyText),
    allergies: nonempty(extras?.allergiesSummary),
    accessInstruction: nonempty(extras?.accessInstruction),
  }
  return Object.values(identity).some((v) => v) ? identity : {}
}

export async function generateIaSectionDemoDev(
  level: IaAutofillLevel,
  tabId: number,
  questionIds: string[],
  identity?: IaDemoIdentity | null,
): Promise<GenerateIaSectionResult> {
  const res = await apiJson<ApiEnvelope<GenerateIaSectionResult>>(
    IA_SECTION_GENERATE_PATH,
    {
      method: 'POST',
      body: JSON.stringify({ level, tabId, questionIds, ...(identity ? { identity } : {}) }),
    },
    { timeoutMs: IA_SECTION_GENERATE_TIMEOUT_MS },
  )
  return {
    answers: Array.isArray(res.data?.answers) ? res.data!.answers : [],
    metadata:
      res.data?.metadata && typeof res.data.metadata === 'object' ? res.data.metadata : {},
  }
}
