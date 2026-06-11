import type { ServiceUserDetail, ServiceUserLookupsBundle } from '@/features/service-users/api'
import type { ServiceUserDomCareData } from '@/features/service-users/api/service-users.api'
import { resolveStoredLookupCode } from '@/features/service-users/utils/service-user-profile-lookup-rows'
import { parseAboutMeFromReferences } from '@/features/service-users/service-user-about-me'
import { multiSelectHasAnswer } from '@/features/service-users/initial-assessment/utils/preferred-visit-times'
import { isSecureQuestion } from '@/features/service-users/initial-assessment/utils/secure-field'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

export type PrefillContext = {
  detail: ServiceUserDetail | null | undefined
  domCare: ServiceUserDomCareData | null | undefined
  lookups?: ServiceUserLookupsBundle | null
}

const PROFILE_REF_ETHNICITY = 'SU_PROFILE_ETHNICITY'
const PROFILE_REF_LANGUAGE = 'SU_PROFILE_LANGUAGE'

function profileReferenceValue(
  detail: ServiceUserDetail,
  referenceType: string,
): string {
  return (
    detail.references?.find((r) => r.referenceType === referenceType)?.referenceValue?.trim() ?? ''
  )
}

function prefillLookupAnswerCode(
  stored: string,
  rows: ReadonlyArray<{ name: string; code: string }> | undefined,
): string {
  if (!stored.trim()) return ''
  if (!rows?.length) return stored.trim()
  return resolveStoredLookupCode(stored, rows).trim().toLowerCase()
}

function formatAddress(detail: ServiceUserDetail): string {
  const a = detail.address
  if (!a) return ''
  return [a.addressLine1, a.addressLine2, a.town, a.county, a.postcode].filter(Boolean).join(', ')
}

function formatGpContact(detail: ServiceUserDetail): string {
  const gp = detail.contacts?.find((c) => c.relationshipType?.code === 'GP')
  if (!gp) return ''
  const name = [gp.firstName, gp.lastName].filter(Boolean).join(' ').trim()
  const phone = (gp.mobile || gp.phone || '').trim()
  const other = [gp.address, gp.notes].filter((x) => x?.trim()).join('\n').trim()
  return [
    name ? `Name: ${name}` : '',
    phone ? `Tel: ${phone}` : '',
    other,
  ]
    .filter(Boolean)
    .join('\n')
}

function formatEmergencyContact(detail: ServiceUserDetail): string {
  const emergency = detail.contacts?.filter((c) => c.isEmergencyContact) ?? []
  const primary = emergency[0] ?? detail.contacts?.find((c) => c.isPrimary)
  if (!primary) {
    const count = detail.contacts?.length ?? 0
    return count > 0 ? `${count} contact(s) on Contacts tab` : ''
  }
  const name = [primary.firstName, primary.lastName].filter(Boolean).join(' ')
  const rel = primary.relationshipType?.name
  const phone = primary.mobile || primary.phone
  return [name, rel, phone].filter(Boolean).join(' · ')
}

function routineSummary(detail: ServiceUserDetail): string {
  const about = parseAboutMeFromReferences(detail.references)
  const slots = about.routine?.monday
  if (!slots) return ''
  const parts = Object.entries(slots)
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `${k}: ${v}`)
  return parts.length ? parts.join('; ') : 'See About Me → My Daily Routine'
}

/** Map service-user gender lookup codes to initial assessment SINGLE_SELECT values. */
export function mapGenderToAssessmentOption(
  gender: { code?: string; name?: string } | null | undefined,
): string {
  const code = gender?.code?.trim().toLowerCase() ?? ''
  const name = gender?.name?.trim().toLowerCase() ?? ''
  if (code === 'female' || code === 'f' || name === 'female') return 'female'
  if (code === 'male' || code === 'm' || name === 'male') return 'male'
  if (code.includes('non') || name.includes('non-binary') || name.includes('non binary')) {
    return 'non_binary'
  }
  if (code.includes('prefer') || name.includes('prefer not')) return 'prefer_not_to_say'
  if (code || name) return 'other'
  return ''
}

function mapFundingTypeCode(code: string | undefined | null): string {
  if (!code?.trim()) return ''
  return code.trim().toLowerCase()
}

function setIfNonEmpty(map: Map<string, string>, key: string, value: string | undefined | null): void {
  const v = value?.trim()
  if (v) map.set(key, v)
}

export function buildPrefillMap(ctx: PrefillContext): Map<string, string> {
  const map = new Map<string, string>()
  const { detail, domCare, lookups } = ctx
  if (!detail) return map

  const about = parseAboutMeFromReferences(detail.references)
  const cultureParts = [about.religiousSpiritualPreferences].filter((s) => s?.trim())
  const ethnicityStored = profileReferenceValue(detail, PROFILE_REF_ETHNICITY)
  const languageStored = profileReferenceValue(detail, PROFILE_REF_LANGUAGE)

  const values: Record<string, string> = {
    firstName: detail.firstName?.trim() ?? '',
    middleName: detail.middleName?.trim() ?? '',
    lastName: detail.lastName?.trim() ?? '',
    preferredName: detail.preferredName?.trim() || detail.firstName || '',
    dateOfBirth: detail.dateOfBirth?.slice(0, 10) ?? '',
    gender: mapGenderToAssessmentOption(detail.gender),
    addressContact: [
      formatAddress(detail),
      detail.phone ? `Tel: ${detail.phone}` : '',
      detail.mobile ? `Mobile: ${detail.mobile}` : '',
      detail.email ? `Email: ${detail.email}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    emergencyContact: formatEmergencyContact(detail),
    gpContact: formatGpContact(detail),
    aboutMePriorities: about.whatIsMostImportantToMe?.trim() || about.whatMakesAGoodDay?.trim() || '',
    aboutMeRoutine: routineSummary(detail),
    foodLikes: [about.foodDrinksLike, about.foodDrinksDontLike ? `Dislikes: ${about.foodDrinksDontLike}` : '']
      .filter(Boolean)
      .join('\n'),
    activityLikes: about.favouriteActivities?.trim() || about.hobbiesAndInterests?.trim() || '',
    culture: cultureParts.join(' · '),
    ethnicity: prefillLookupAnswerCode(ethnicityStored, lookups?.ethnicities),
    language: prefillLookupAnswerCode(languageStored, lookups?.languages),
    careInstructions: domCare?.careInstructions?.trim() ?? '',
    plannedCarers: domCare?.numberOfCarers != null ? String(domCare.numberOfCarers) : '',
    accessInstruction: domCare?.accessInstruction?.trim() ?? '',
    doorCode: domCare?.doorCode ? '•••• (on file in DOM Care)' : '',
    fundingType: mapFundingTypeCode(detail.fundingType?.code),
    nhsNumber: detail.nhsNumber?.trim() ?? '',
    nationalInsuranceNumber: detail.nationalInsuranceNumber?.trim() ?? '',
    serviceUserNumber: detail.serviceUserNumber?.trim() ?? '',
  }

  for (const [key, val] of Object.entries(values)) {
    setIfNonEmpty(map, key, val)
  }

  return map
}

export function prefillKeyForQuestion(q: InitialAssessmentQuestion): string | null {
  const key = q.metadata?.prefillKey
  if (typeof key === 'string' && key.trim()) return key.trim()
  const fieldKey = q.metadata?.fieldKey
  if (fieldKey === 'fundingType') return 'fundingType'
  return null
}

export function prefillValueForQuestion(
  q: InitialAssessmentQuestion,
  prefillMap: Map<string, string>,
): string {
  const key = prefillKeyForQuestion(q)
  if (!key) return ''
  return prefillMap.get(key) ?? ''
}

export function prefillHintForQuestion(
  q: InitialAssessmentQuestion,
  prefillMap: Map<string, string>,
): string | null {
  const val = prefillValueForQuestion(q, prefillMap)
  if (!val) return null
  const short = val.length > 140 ? `${val.slice(0, 140)}…` : val
  return short
}

export function hasAssessmentAnswer(
  value: InitialAssessmentAnswerInput | undefined,
  q: InitialAssessmentQuestion,
): boolean {
  if (!value) return false
  if (value.hasSecureValue || value.secureMasked) return true
  if (value.notes?.trim()) return true
  if (q.questionType === 'YES_NO' || q.questionType === 'CHECKBOX') {
    return value.checked === true || value.booleanValue === true
  }
  if (q.questionType === 'NUMBER') return value.numberValue != null && !Number.isNaN(value.numberValue)
  if (q.questionType === 'DATE') return Boolean(value.dateValue)
  if (q.questionType === 'SINGLE_SELECT' || q.questionType === 'MULTI_SELECT') {
    return multiSelectHasAnswer(value, q)
  }
  return Boolean(value.textValue?.trim())
}

/** Keep assessor notes when merging profile prefill (notes-only answers are valid). */
export function mergePrefillAnswer(
  q: InitialAssessmentQuestion,
  value: InitialAssessmentAnswerInput | undefined,
  prefillMap: Map<string, string>,
): InitialAssessmentAnswerInput | undefined {
  const base: InitialAssessmentAnswerInput = value
    ? { ...value, questionId: q.id }
    : { questionId: q.id }

  if (hasAssessmentAnswer(value, q)) return base
  if (isSecureQuestion(q)) return base

  const built = buildAnswerFromPrefill(q, prefillValueForQuestion(q, prefillMap))
  if (!built) return value

  return { ...base, ...built, questionId: q.id }
}

export function buildAnswerFromPrefill(
  q: InitialAssessmentQuestion,
  prefill: string,
): InitialAssessmentAnswerInput | null {
  const trimmed = prefill.trim()
  if (!trimmed) return null

  const base: InitialAssessmentAnswerInput = { questionId: q.id }

  if (q.questionType === 'NUMBER') {
    const n = Number(trimmed)
    if (!Number.isFinite(n)) return null
    return { ...base, numberValue: n }
  }
  if (q.questionType === 'DATE' && /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return { ...base, dateValue: `${trimmed.slice(0, 10)}T00:00:00.000Z` }
  }
  if (q.questionType === 'SINGLE_SELECT' || q.questionType === 'MULTI_SELECT') {
    return { ...base, selectedOptions: [trimmed] }
  }
  if (q.questionType === 'TEXT' || q.questionType === 'TEXTAREA') {
    return { ...base, textValue: trimmed }
  }
  return null
}

/** Merge service-user profile values into draft answers where the submission has no saved value. */
export function applyPrefillToDraftAnswers(
  sections: InitialAssessmentSection[],
  draft: Record<string, InitialAssessmentAnswerInput>,
  prefillMap: Map<string, string>,
): Record<string, InitialAssessmentAnswerInput> {
  if (!prefillMap.size) return draft

  const next = { ...draft }
  for (const section of sections) {
    for (const q of section.questions) {
      if (isSecureQuestion(q)) continue
      if (hasAssessmentAnswer(next[q.id], q)) continue
      const prefill = prefillValueForQuestion(q, prefillMap)
      const built = buildAnswerFromPrefill(q, prefill)
      if (built) next[q.id] = built
    }
  }
  return next
}
