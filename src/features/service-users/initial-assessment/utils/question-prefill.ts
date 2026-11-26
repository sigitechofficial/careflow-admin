import type { ServiceUserDetail, ServiceUserLookupsBundle } from '@/features/service-users/api'
import type { ServiceUserDomCareData, ServiceUserMedicationRow } from '@/features/service-users/api/service-users.api'
import type { MedicationSupportProfile } from '@/features/service-users/api/medication-support-profile.api'
import {
  type CodeNameLookupRow,
  resolveStoredLookupCode,
} from '@/features/service-users/utils/service-user-profile-lookup-rows'
import { parseAboutMeFromReferences, ROUTINE_DAYS, ROUTINE_SLOTS } from '@/features/service-users/service-user-about-me'
import { multiSelectHasAnswer } from '@/features/service-users/initial-assessment/utils/preferred-visit-times'
import {
  labelForQuestionOptionValue,
  type QuestionOptionCatalogs,
} from '@/features/service-users/initial-assessment/utils/question-options'
import { hasTextAnswerValue, isSecureQuestion } from '@/features/service-users/initial-assessment/utils/secure-field'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

import { formatOrganisationDay } from '@/shared/lib/organisation-display-format.store'
export type PrefillContext = {
  detail: ServiceUserDetail | null | undefined
  domCare: ServiceUserDomCareData | null | undefined
  lookups?: ServiceUserLookupsBundle | null
  allergiesSummary?: string | null
  /** Meds tab: support profile (storage, notes) and the active medicines list. */
  medicationSupport?: Pick<MedicationSupportProfile, 'storageLocation' | 'notes'> | null
  medications?: ServiceUserMedicationRow[] | null
}

/** Meds tab → IA §9 prefill. Only "Yes" is prefilled: an empty list may just not be entered yet. */
function medicationPrefill(ctx: PrefillContext): Record<string, string> {
  const active = (ctx.medications ?? []).filter((m) => String(m.status).toUpperCase() === 'ACTIVE')
  const describe = (m: ServiceUserMedicationRow) =>
    [m.medicationName, m.strength, m.dose].map((v) => v?.trim()).filter(Boolean).join(' ')
  const prn = active.filter((m) => m.medicationKind === 'PRN')
  const timeCritical = active.filter((m) => m.timeCritical)
  return {
    medStorageLocation: ctx.medicationSupport?.storageLocation?.trim() ?? '',
    medSupportNotes: ctx.medicationSupport?.notes?.trim() ?? '',
    medTakingPrescribed: active.length ? 'yes' : '',
    medListAvailable: active.length ? 'yes' : '',
    medPrnInUse: prn.length ? 'yes' : '',
    medPrnDetails: prn
      .map((m) => {
        const max = m.prnMaxDosesIn24Hours ? ` (max ${m.prnMaxDosesIn24Hours} in 24 hours)` : ''
        const why = m.reasonForMedication?.trim() ? ` — ${m.reasonForMedication.trim()}` : ''
        return `${describe(m)}${why}${max}`
      })
      .join('\n'),
    medTimeCritical: timeCritical.length ? 'yes' : '',
    medTimeCriticalDetails: timeCritical.map(describe).join('\n'),
  }
}

/** IA §9 questions prefilled from the Meds tab, by field key. */
const MEDICATION_PREFILL_KEY_BY_FIELD: Readonly<Record<string, string>> = {
  medicationStorageDetails: 'medStorageLocation',
  medicationSafetyNotes: 'medSupportNotes',
  takingPrescribedMedication: 'medTakingPrescribed',
  medicationListAvailable: 'medListAvailable',
  prnMedicationInUse: 'medPrnInUse',
  prnMedicationDetails: 'medPrnDetails',
  timeCriticalMedication: 'medTimeCritical',
  timeCriticalMedicationDetails: 'medTimeCriticalDetails',
}

const PROFILE_REF_ETHNICITY = 'SU_PROFILE_ETHNICITY'
const PROFILE_REF_LANGUAGE = 'SU_PROFILE_LANGUAGE'
const PROFILE_REF_SEX = 'SU_PROFILE_SEX'
const PROFILE_REF_SEXUAL_ORIENTATION = 'SU_PROFILE_SEXUAL_ORIENTATION'

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
  rows: ReadonlyArray<CodeNameLookupRow> | undefined,
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

function lpaContactOf(detail: ServiceUserDetail) {
  return detail.contacts?.find((c) => c.relationshipType?.code === 'POWER_OF_ATTORNEY')
}

function formatLpaName(detail: ServiceUserDetail): string {
  const c = lpaContactOf(detail)
  return c ? [c.firstName, c.lastName].filter(Boolean).join(' ').trim() : ''
}

/** Same "Contact: / Address:" lines the IA LPA contact widget stores. */
function formatLpaContact(detail: ServiceUserDetail): string {
  const c = lpaContactOf(detail)
  if (!c) return ''
  const contact = (c.mobile || c.phone || c.email || '').trim()
  const address = c.address?.trim() ?? ''
  return [contact ? `Contact: ${contact}` : '', address ? `Address: ${address}` : ''].filter(Boolean).join('\n')
}

function formatGpContact(detail: ServiceUserDetail): string {
  const gp = detail.contacts?.find((c) => c.relationshipType?.code === 'GP')
  if (!gp) return ''
  const name = [gp.firstName, gp.lastName].filter(Boolean).join(' ').trim()
  const phone = (gp.mobile || gp.phone || '').trim()
  const address = gp.address?.trim() ?? ''
  return [
    name ? `Name: ${name}` : '',
    phone ? `Tel: ${phone}` : '',
    address ? `Address: ${address}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * §1.2 key contacts: every family / representative contact on the Contacts tab, one per line, emergency
 * and primary contacts first. GP and social worker are left out — they have their own linked questions.
 */
function formatEmergencyContact(detail: ServiceUserDetail): string {
  const own = new Set(['GP', 'SOCIAL_WORKER'])
  const contacts = (detail.contacts ?? []).filter((c) => !own.has(c.relationshipType?.code ?? ''))
  const rank = (c: (typeof contacts)[number]) => (c.isEmergencyContact ? 0 : c.isPrimary ? 1 : 2)
  return contacts
    .slice()
    .sort((a, b) => rank(a) - rank(b))
    .map((c) => {
      const name = [c.firstName, c.lastName].filter(Boolean).join(' ').trim()
      const roles = [c.isEmergencyContact ? 'emergency contact' : '', c.isPrimary ? 'primary' : ''].filter(Boolean)
      return [
        name,
        c.relationshipType?.name,
        c.mobile || c.phone,
        roles.length ? `(${roles.join(', ')})` : '',
      ]
        .filter(Boolean)
        .join(' · ')
    })
    .filter(Boolean)
    .join('\n')
}

const ROUTINE_SLOT_LABEL: Record<(typeof ROUTINE_SLOTS)[number], string> = {
  getUp: 'Get up',
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  afternoon: 'Afternoon',
  teaTime: 'Tea time',
  bedtime: 'Bedtime',
}

/**
 * §1.4 routine from the About Me weekly grid (every day, not only Monday). Empty when nothing is
 * recorded, so the required question is never "answered" by a placeholder.
 */
function routineSummary(detail: ServiceUserDetail): string {
  const about = parseAboutMeFromReferences(detail.references)
  const lines: string[] = []
  for (const day of ROUTINE_DAYS) {
    const slots = about.routine?.[day]
    if (!slots) continue
    const parts = ROUTINE_SLOTS.filter((slot) => slots[slot]?.trim()).map(
      (slot) => `${ROUTINE_SLOT_LABEL[slot]}: ${slots[slot]!.trim()}`,
    )
    if (parts.length) lines.push(`${day.charAt(0).toUpperCase()}${day.slice(1)} — ${parts.join('; ')}`)
  }
  return lines.join('\n')
}

/** Lookup display name for a stored profile value (free-text questions want "English", not "english"). */
function prefillLookupAnswerName(
  stored: string,
  rows: ReadonlyArray<CodeNameLookupRow> | undefined,
): string {
  if (!stored.trim()) return ''
  if (!rows?.length) return stored.trim()
  const code = resolveStoredLookupCode(stored, rows).trim().toLowerCase()
  return rows.find((r) => r.code.trim().toLowerCase() === code)?.name?.trim() || stored.trim()
}

/** Map service-user gender lookup codes to initial assessment SINGLE_SELECT values. */
export function mapGenderToAssessmentOption(
  gender: { code?: string; name?: string } | null | undefined,
): string {
  const code = gender?.code?.trim().toLowerCase() ?? ''
  const name = gender?.name?.trim().toLowerCase() ?? ''
  if (code === 'f' || name === 'female') return 'female'
  if (code === 'm' || name === 'male') return 'male'
  if (code) return code
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

/** Non-empty answers, each once, one per line. */
function joinDistinct(...parts: Array<string | null | undefined>): string {
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of parts) {
    const v = part?.trim()
    if (!v || seen.has(v.toLowerCase())) continue
    seen.add(v.toLowerCase())
    out.push(v)
  }
  return out.join('\n')
}

export function buildPrefillMap(ctx: PrefillContext): Map<string, string> {
  const map = new Map<string, string>()
  const { detail, domCare, lookups } = ctx
  if (!detail) return map

  const about = parseAboutMeFromReferences(detail.references)
  const cultureParts = [about.religiousSpiritualPreferences].filter((s) => s?.trim())
  const ethnicityStored = profileReferenceValue(detail, PROFILE_REF_ETHNICITY)
  const languageStored = profileReferenceValue(detail, PROFILE_REF_LANGUAGE)
  const sexStored = profileReferenceValue(detail, PROFILE_REF_SEX)
  const sexualOrientationStored = profileReferenceValue(detail, PROFILE_REF_SEXUAL_ORIENTATION)

  const aboutMePrefill: Record<string, string> = {
    aboutMe_whatIsMostImportantToMe: about.whatIsMostImportantToMe?.trim() ?? '',
    aboutMe_peopleImportantToMe: about.peopleImportantToMe?.trim() ?? '',
    aboutMe_externalAboutMeUrl: about.externalAboutMeUrl?.trim() ?? '',
    aboutMe_howICommunicate: about.howICommunicate?.trim() ?? '',
    aboutMe_myWellness: about.myWellness?.trim() ?? '',
    aboutMe_whatMakesAGoodDay: about.whatMakesAGoodDay?.trim() ?? '',
    aboutMe_whatMakesMeHappy: about.whatMakesMeHappy?.trim() ?? '',
    aboutMe_whatMakesMeUnhappy: about.whatMakesMeUnhappy?.trim() ?? '',
    aboutMe_whatMakesABadDay: about.whatMakesABadDay?.trim() ?? '',
    aboutMe_howAndWhenToSupportMe: about.howAndWhenToSupportMe?.trim() ?? '',
    aboutMe_alsoWorthKnowing: about.alsoWorthKnowing?.trim() ?? '',
    aboutMe_supportedToWriteThisBy: about.supportedToWriteThisBy?.trim() ?? '',
    aboutMe_hobbiesAndInterests: about.hobbiesAndInterests?.trim() ?? '',
    aboutMe_religiousSpiritualPreferences: about.religiousSpiritualPreferences?.trim() ?? '',
    aboutMe_whereIAmFrom: about.whereIAmFrom?.trim() ?? '',
    aboutMe_whatILikeToTalkAbout: about.whatILikeToTalkAbout?.trim() ?? '',
    aboutMe_familyAndFriends: about.familyAndFriends?.trim() ?? '',
    aboutMe_myChildhood: about.myChildhood?.trim() ?? '',
    aboutMe_myEducation: about.myEducation?.trim() ?? '',
    aboutMe_myOccupation: about.myOccupation?.trim() ?? '',
    aboutMe_myAdulthood: about.myAdulthood?.trim() ?? '',
    aboutMe_lifeHistoryFavourites: about.lifeHistoryFavourites?.trim() ?? '',
    // IA merges two About Me profile answers into one question (profile keeps both)
    aboutMe_peopleAndFamily: joinDistinct(about.peopleImportantToMe, about.familyAndFriends),
    aboutMe_happyGoodDay: joinDistinct(about.whatMakesMeHappy, about.whatMakesAGoodDay),
    aboutMe_unhappyBadDay: joinDistinct(about.whatMakesMeUnhappy, about.whatMakesABadDay),
    aboutMe_personalHygiene: about.personalHygiene?.trim() ?? '',
    aboutMe_domesticSupport: about.domesticSupport?.trim() ?? '',
    aboutMe_shoppingArrangements: about.shoppingArrangements?.trim() ?? '',
    aboutMe_nightSupport: about.nightSupport?.trim() ?? '',
    aboutMe_supportOther: about.supportOther?.trim() ?? '',
    aboutMe_foodDrinksLike: about.foodDrinksLike?.trim() ?? '',
    aboutMe_foodDrinksDontLike: about.foodDrinksDontLike?.trim() ?? '',
    aboutMe_favouriteItems: about.favouriteItems?.trim() ?? '',
    aboutMe_tvProgrammes: about.tvProgrammes?.trim() ?? '',
    aboutMe_favouriteActivities: about.favouriteActivities?.trim() ?? '',
    aboutMe_favouriteRooms: about.favouriteRooms?.trim() ?? '',
    aboutMe_favouriteOther: about.favouriteOther?.trim() ?? '',
    aboutMe_identificationCharacteristics: about.identificationCharacteristics?.trim() ?? '',
  }
  for (const day of ROUTINE_DAYS) {
    for (const slot of ROUTINE_SLOTS) {
      aboutMePrefill[`aboutMe_routine_${day}_${slot}`] = about.routine[day][slot]?.trim() ?? ''
    }
  }

  const values: Record<string, string> = {
    firstName: detail.firstName?.trim() ?? '',
    middleName: detail.middleName?.trim() ?? '',
    lastName: detail.lastName?.trim() ?? '',
    preferredName: detail.preferredName?.trim() || detail.firstName || '',
    dateOfBirth: detail.dateOfBirth?.slice(0, 10) ?? '',
    gender: mapGenderToAssessmentOption(detail.gender),
    sex: prefillLookupAnswerCode(sexStored, lookups?.sexes),
    sexualOrientation: prefillLookupAnswerCode(sexualOrientationStored, lookups?.sexualOrientations),
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
    ...medicationPrefill(ctx),
    // Power of Attorney contact (the API fills it from these answers; never overwritten).
    lpaName: formatLpaName(detail),
    lpaContact: formatLpaContact(detail),
    aboutMeRoutine: routineSummary(detail),
    foodLikes: [about.foodDrinksLike, about.foodDrinksDontLike ? `Dislikes: ${about.foodDrinksDontLike}` : '']
      .filter(Boolean)
      .join('\n'),
    culture: cultureParts.join(' · '),
    ethnicity: prefillLookupAnswerCode(ethnicityStored, lookups?.ethnicities),
    language: prefillLookupAnswerCode(languageStored, lookups?.languages),
    languageName: prefillLookupAnswerName(languageStored, lookups?.languages),
    careInstructions: domCare?.careInstructions?.trim() ?? '',
    // DOM Care preferences (the API copies IA changes back). An empty DOM preference is not "No preference".
    staffGenderPreference: domCare?.staffGenderPreference?.trim() ?? '',
    accommodationType: (domCare?.accommodationType ?? []).filter((v) => v?.trim()).join('\n'),
    plannedCarers: domCare?.numberOfCarers != null ? String(domCare.numberOfCarers) : '',
    // Home & access (address) is the one access-instructions field; the old DOM Care box is a fallback.
    accessInstruction: detail.address?.accessInstructions?.trim() || domCare?.accessInstruction?.trim() || '',
    // Home & access key-safe code is the master carers see; the legacy DOM Care door code is a fallback.
    doorCode: detail.address?.keySafeNumber?.trim() || domCare?.doorCode ? '•••• (hidden)' : '',
    fundingType: mapFundingTypeCode(detail.fundingType?.code),
    nhsNumber: detail.nhsNumber?.trim() ?? '',
    nationalInsuranceNumber: detail.nationalInsuranceNumber?.trim() ?? '',
    serviceUserNumber: detail.serviceUserNumber?.trim() ?? '',
    allergies: ctx.allergiesSummary?.trim() ?? '',
  }

  for (const [key, val] of Object.entries(values)) {
    setIfNonEmpty(map, key, val)
  }
  for (const [key, val] of Object.entries(aboutMePrefill)) {
    setIfNonEmpty(map, key, val)
  }

  return map
}

export function prefillKeyForQuestion(q: InitialAssessmentQuestion): string | null {
  const key = q.metadata?.prefillKey
  if (typeof key === 'string' && key.trim()) return key.trim()
  const fieldKey = q.metadata?.fieldKey
  if (fieldKey === 'fundingType') return 'fundingType'
  if (typeof fieldKey === 'string' && MEDICATION_PREFILL_KEY_BY_FIELD[fieldKey]) {
    return MEDICATION_PREFILL_KEY_BY_FIELD[fieldKey]!
  }
  // LPA questions: the profile's Power of Attorney contact.
  if (fieldKey === 'lpoaName') return 'lpaName'
  if (fieldKey === 'lpoaContactDetails') return 'lpaContact'
  // DOM Care preferences: linked by field key / question text (no prefill key in the template).
  if (fieldKey === 'accommodationType') return 'accommodationType'
  if (q.questionText?.trim() === 'Staff gender preference for personal care') return 'staffGenderPreference'
  // §1.4 has no prefill key in the template; it is the About Me "personal hygiene" field (synced both ways).
  if (q.questionText?.trim() === ABOUT_ME_HYGIENE_QUESTION_TEXT) return 'aboutMe_personalHygiene'
  return null
}

/** §1.4 question linked to the About Me "personal hygiene" field (same text as the API's sync). */
export const ABOUT_ME_HYGIENE_QUESTION_TEXT = 'Bathing / shower and dressing preferences'

export function prefillValueForQuestion(
  q: InitialAssessmentQuestion,
  prefillMap: Map<string, string>,
): string {
  const key = prefillKeyForQuestion(q)
  if (!key) return ''
  return prefillMap.get(key) ?? ''
}

/** Where each prefill value comes from — shown to the assessor next to the value. */
const PREFILL_SOURCE_BY_KEY: Readonly<Record<string, string>> = {
  firstName: 'Profile',
  middleName: 'Profile',
  lastName: 'Profile',
  preferredName: 'Profile',
  dateOfBirth: 'Profile',
  gender: 'Profile',
  sex: 'Profile',
  sexualOrientation: 'Profile',
  addressContact: 'Profile',
  ethnicity: 'Profile',
  language: 'Profile',
  languageName: 'Profile',
  nhsNumber: 'Profile',
  nationalInsuranceNumber: 'Profile',
  serviceUserNumber: 'Profile',
  fundingType: 'Profile (funding)',
  emergencyContact: 'Contacts',
  gpContact: 'Contacts (GP)',
  careInstructions: 'DOM Care',
  lpaName: 'Contacts',
  medStorageLocation: 'Medication',
  medSupportNotes: 'Medication',
  medTakingPrescribed: 'Medication',
  medListAvailable: 'Medication',
  medPrnInUse: 'Medication',
  medPrnDetails: 'Medication',
  medTimeCritical: 'Medication',
  medTimeCriticalDetails: 'Medication',
  lpaContact: 'Contacts',
  staffGenderPreference: 'DOM Care',
  accommodationType: 'DOM Care',
  plannedCarers: 'DOM Care',
  accessInstruction: 'Home & access',
  doorCode: 'Home & access',
  allergies: 'Allergies',
  aboutMeRoutine: 'About Me',
  foodLikes: 'About Me',
  culture: 'About Me',
}

export function prefillSourceForKey(key: string): string {
  if (key.startsWith('aboutMe_')) return 'About Me'
  return PREFILL_SOURCE_BY_KEY[key] ?? 'Profile'
}

/** Option codes → labels and ISO dates → "19 Dec 1986", so the hint reads like the field. */
function prefillDisplayValue(
  q: InitialAssessmentQuestion,
  value: string,
  catalogs: QuestionOptionCatalogs,
): string {
  if (q.questionType === 'SINGLE_SELECT' || q.questionType === 'MULTI_SELECT') {
    return labelForQuestionOptionValue(value, q, catalogs)
  }
  if (q.questionType === 'DATE' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const d = new Date(`${value.slice(0, 10)}T00:00:00Z`)
    if (!Number.isNaN(d.getTime())) {
      return String(formatOrganisationDay(value.slice(0, 10)))
    }
  }
  return value
}

/** "<Source>: <value>" for the field hint (rendered as "From …"). */
export function prefillHintForQuestion(
  q: InitialAssessmentQuestion,
  prefillMap: Map<string, string>,
  catalogs: QuestionOptionCatalogs = {},
): string | null {
  const key = prefillKeyForQuestion(q)
  const val = prefillValueForQuestion(q, prefillMap)
  if (!key || !val) return null
  const shown = prefillDisplayValue(q, val, catalogs)
  const short = shown.length > 140 ? `${shown.slice(0, 140)}…` : shown
  return `${prefillSourceForKey(key)}: ${short}`
}

export function hasAssessmentAnswer(
  value: InitialAssessmentAnswerInput | undefined,
  q: InitialAssessmentQuestion,
): boolean {
  if (!value) return false
  if (value.hasSecureValue || value.secureMasked) return true
  if (value.notes?.trim()) return true
  if (q.questionType === 'YES_NO' || q.questionType === 'CHECKBOX') {
    return (
      value.checked === true ||
      value.checked === false ||
      value.booleanValue === true ||
      value.booleanValue === false
    )
  }
  if (q.questionType === 'NUMBER') return value.numberValue != null && !Number.isNaN(value.numberValue)
  if (q.questionType === 'DATE') return Boolean(value.dateValue)
  if (q.questionType === 'SINGLE_SELECT' || q.questionType === 'MULTI_SELECT') {
    return multiSelectHasAnswer(value, q)
  }
  return hasTextAnswerValue(value)
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
  if (q.questionType === 'YES_NO') {
    // Only a "yes" is ever prefilled (see medicationPrefill).
    return trimmed.toLowerCase() === 'yes' ? { ...base, checked: true, booleanValue: true } : null
  }
  if (q.questionType === 'DATE' && /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return { ...base, dateValue: `${trimmed.slice(0, 10)}T00:00:00.000Z` }
  }
  if (q.questionType === 'MULTI_SELECT') {
    // Several prefilled options are one per line (e.g. DOM Care accommodation types).
    return { ...base, selectedOptions: trimmed.split('\n').map((v) => v.trim()).filter(Boolean) }
  }
  if (q.questionType === 'SINGLE_SELECT') {
    return { ...base, selectedOptions: [trimmed] }
  }
  if (q.questionType === 'TEXT' || q.questionType === 'TEXTAREA') {
    return { ...base, textValue: trimmed }
  }
  return null
}

function plainText(value: string | undefined | null): string {
  return (value ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

/** True while the answer is still the value prefill put there (the assessor has not changed it). */
export function answerIsPrefillValue(
  q: InitialAssessmentQuestion,
  answer: InitialAssessmentAnswerInput | undefined,
  prefillMap: Map<string, string>,
): boolean {
  if (!answer) return false
  const built = buildAnswerFromPrefill(q, prefillValueForQuestion(q, prefillMap))
  if (!built) return false
  if (built.textValue !== undefined) {
    return plainText(answer.textValue) === plainText(built.textValue)
  }
  if (built.selectedOptions !== undefined) {
    const sel = answer.selectedOptions
    const have = Array.isArray(sel) ? sel.map(String) : typeof sel === 'string' ? [sel] : []
    const want = (built.selectedOptions as string[]).map(String)
    return have.length === want.length && want.every((v, i) => have[i] === v)
  }
  if (built.booleanValue !== undefined) return answer.booleanValue === built.booleanValue || answer.checked === built.checked
  if (built.numberValue !== undefined) return answer.numberValue === built.numberValue
  if (built.dateValue !== undefined) {
    return String(answer.dateValue ?? '').slice(0, 10) === String(built.dateValue).slice(0, 10)
  }
  return false
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
