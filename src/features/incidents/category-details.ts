/**
 * Category-specific questions on the office raise form. Mirrors careflow-api
 * `incident-category-details.util.ts` (same keys and required rules) so the form can show
 * errors before submitting. Keys are the STABLE category / subtype keys from the catalog.
 */

export type CategoryDetails = Record<string, unknown>

export type AllegedPerson = {
  kind?: 'STAFF' | 'OTHER_PERSON' | 'UNKNOWN' | 'NOT_APPLICABLE'
  employeeId?: string
  name?: string
  relationship?: string
}

/** Pressure ulcer grades (NHS England terminology) — extend or relabel here; keys are stored. */
export const PRESSURE_ULCER_GRADES: { value: string; label: string }[] = [
  { value: 'CATEGORY_1', label: 'Category 1' },
  { value: 'CATEGORY_2', label: 'Category 2' },
  { value: 'CATEGORY_3', label: 'Category 3' },
  { value: 'CATEGORY_4', label: 'Category 4' },
  { value: 'UNSTAGEABLE', label: 'Unstageable' },
  { value: 'SDTI', label: 'Suspected Deep Tissue Injury (SDTI)' },
]

export const WOUND_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'NEW', label: 'New' },
  { value: 'EXISTING', label: 'Existing' },
  { value: 'DETERIORATED', label: 'Deteriorated' },
]

export const ALLEGED_PERSON_OPTIONS: { value: NonNullable<AllegedPerson['kind']>; label: string }[] = [
  { value: 'STAFF', label: 'A staff member' },
  { value: 'OTHER_PERSON', label: 'Another person (family, visitor…)' },
  { value: 'UNKNOWN', label: 'Unknown' },
  { value: 'NOT_APPLICABLE', label: 'Not applicable (e.g. self-neglect)' },
]

export const DEATH_CONFIRMED_BY_ROLES = ['Paramedic', 'GP', 'Nurse', 'Police', 'Family', 'Carer', 'Other']

/** Skin subtypes that need a body-map pin for a service user, and the injury type to pre-fill. */
export const SKIN_SUBTYPE_INJURY_TYPE: Record<string, string> = {
  PRESSURE_ULCER: 'Pressure ulcer',
  SKIN_TEAR: 'Skin tear',
  WOUND: 'Wound',
  BRUISING: 'Bruise',
  UNEXPLAINED_BRUISING: 'Bruise',
  MOISTURE_DAMAGE: 'Moisture damage',
}

/** Hospital outcome doesn't apply: a death is itself the outcome; a data breach harms no one physically. */
export const NO_HOSPITAL_OUTCOME_CATEGORIES = new Set(['DEATH', 'DATA_BREACH'])

/**
 * Short explanations shown under the subtype picker, keyed by category then subtype key.
 * Shown for the chosen subtype, or all of them before one is chosen.
 */
export const SUBTYPE_HINTS: Record<string, Record<string, string>> = {
  DEATH: {
    EXPECTED_DEATH: 'Expected — on end-of-life / palliative care or a known terminal illness.',
    UNEXPECTED_DEATH: 'Unexpected — not anticipated, e.g. sudden death, or after a fall or accident. Call 999.',
  },
}

/** Categories with extra questions; the card title shown above them. */
export const CATEGORY_DETAILS_TITLE: Record<string, string> = {
  MEDICATION: 'Medication details',
  SAFEGUARDING: 'Safeguarding details',
  SKIN_WOUND: 'Skin / wound details',
  CARE_DELIVERY: 'Visit details',
  DEATH: 'Death details',
  INFECTION: 'Infection details',
  VIOLENCE_TO_STAFF: 'Staff safety details',
  DATA_BREACH: 'Data breach details',
}

const isBlank = (v: unknown) => v == null || (typeof v === 'string' && !v.trim())

/** Client-side required checks (the API enforces the same rules). Returns field → message. */
export function validateCategoryDetails(
  categoryKey: string | undefined,
  subtypeKey: string | undefined,
  details: CategoryDetails,
  ctx: { hasLinkedVisit: boolean; today: string },
): Record<string, string> {
  const e: Record<string, string> = {}
  switch (categoryKey) {
    case 'MEDICATION':
      if (isBlank(details.medicationName)) e.medicationName = 'Select or enter the medication'
      if (typeof details.marEntryAffected !== 'boolean') e.marEntryAffected = 'Say whether the MAR entry is affected'
      if (!isBlank(details.scheduledTime) && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(details.scheduledTime)))
        e.scheduledTime = 'Enter a valid time'
      break
    case 'SAFEGUARDING': {
      const ap = (details.allegedPerson ?? {}) as AllegedPerson
      if (!ap.kind) e.allegedPerson = 'Say who is alleged to have caused harm'
      else if (ap.kind === 'STAFF' && !ap.employeeId) e.allegedPerson = 'Select the staff member'
      else if (ap.kind === 'OTHER_PERSON' && isBlank(ap.name)) e.allegedPerson = 'Enter their name'
      break
    }
    case 'SKIN_WOUND':
      if (isBlank(details.woundStatus)) e.woundStatus = 'Select new, existing or deteriorated'
      if (subtypeKey === 'PRESSURE_ULCER' && isBlank(details.pressureUlcerGrade))
        e.pressureUlcerGrade = 'Select the pressure ulcer grade'
      break
    case 'CARE_DELIVERY':
      if (isBlank(details.reason)) e.reason = 'Give the reason'
      if (!ctx.hasLinkedVisit && isBlank(details.noMatchingVisitReason))
        e.noMatchingVisitReason = 'Say why no visit matches'
      break
    case 'DEATH':
      if (isBlank(details.confirmedByName)) e.confirmedByName = 'Enter who confirmed or notified the death'
      if (isBlank(details.confirmedByRole)) e.confirmedByRole = 'Select their role'
      break
    case 'INFECTION':
      if (isBlank(details.symptoms)) e.symptoms = 'Describe the symptoms'
      if (!isBlank(details.symptomsStartedOn) && String(details.symptomsStartedOn) > ctx.today)
        e.symptomsStartedOn = 'Cannot be in the future'
      if (isBlank(details.infectionControlAction)) e.infectionControlAction = 'Describe the action taken'
      break
    case 'DATA_BREACH': {
      if (isBlank(details.informationType)) e.informationType = 'Describe the information affected'
      const n = details.peopleAffected
      if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) e.peopleAffected = 'Enter a whole number'
      if (typeof details.recoveredOrSecured !== 'boolean') e.recoveredOrSecured = 'Say whether it was recovered or secured'
      break
    }
    default:
      break
  }
  return e
}

/** Only send answers that belong to the category (switching category must not leak old answers). */
export function categoryDetailsForSubmit(categoryKey: string | undefined, details: CategoryDetails) {
  if (!categoryKey || !(categoryKey in CATEGORY_DETAILS_TITLE) || categoryKey === 'VIOLENCE_TO_STAFF') return undefined
  const cleaned = Object.fromEntries(
    Object.entries(details).filter(([, v]) => !(v == null || (typeof v === 'string' && !v.trim()))),
  )
  return Object.keys(cleaned).length ? cleaned : undefined
}
