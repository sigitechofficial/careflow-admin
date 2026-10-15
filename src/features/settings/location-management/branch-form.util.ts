import type {
  BranchStatus,
  CqcRating,
  CqcRatingStatus,
  LocationBranchDetailsPayload,
  LocationTreeBranch,
  UpdateLocationBranchPayload,
} from '@/features/settings/location-management/location-management.types'

/** One select for rating + rating status: '' = not recorded, NOT_YET_RATED = "Not rated". */
export type BranchRatingChoice = '' | 'NOT_YET_RATED' | CqcRating

export const CQC_RATING_OPTIONS: ReadonlyArray<{ value: BranchRatingChoice; label: string }> = [
  { value: '', label: 'Not recorded' },
  { value: 'NOT_YET_RATED', label: 'Not rated' },
  { value: 'OUTSTANDING', label: 'Outstanding' },
  { value: 'GOOD', label: 'Good' },
  { value: 'REQUIRES_IMPROVEMENT', label: 'Requires improvement' },
  { value: 'INADEQUATE', label: 'Inadequate' },
]

export const BRANCH_STATUS_OPTIONS: ReadonlyArray<{ value: BranchStatus; label: string }> = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'CLOSED', label: 'Closed' },
]

export function ratingChoiceFrom(
  rating: CqcRating | null | undefined,
  status: CqcRatingStatus | null | undefined,
): BranchRatingChoice {
  if (rating) return rating
  if (status === 'NOT_YET_RATED') return 'NOT_YET_RATED'
  return ''
}

export function ratingFieldsFromChoice(choice: BranchRatingChoice): {
  cqcRating: CqcRating | null
  cqcRatingStatus: CqcRatingStatus | null
} {
  if (!choice) return { cqcRating: null, cqcRatingStatus: null }
  if (choice === 'NOT_YET_RATED') return { cqcRating: null, cqcRatingStatus: 'NOT_YET_RATED' }
  return { cqcRating: choice, cqcRatingStatus: 'RATED' }
}

/** "Good", "Not rated", or null when nothing is recorded. */
export function formatCqcRating(
  branch: Pick<LocationTreeBranch, 'cqcRating' | 'cqcRatingStatus'>,
): string | null {
  const choice = ratingChoiceFrom(branch.cqcRating, branch.cqcRatingStatus)
  if (!choice) return null
  return CQC_RATING_OPTIONS.find(o => o.value === choice)?.label ?? null
}

export function formatBranchStatus(status: BranchStatus | null | undefined): string {
  return BRANCH_STATUS_OPTIONS.find(o => o.value === status)?.label ?? 'Active'
}

/** Editable form state for the Edit branch dialog. */
export type BranchFormState = {
  name: string
  address: string
  addressLine1: string
  addressLine2: string
  town: string
  county: string
  postcode: string
  country: string
  countryCode: string
  localAuthority: string
  phone: string
  email: string
  website: string
  cqcLocationId: string
  officialCqcName: string
  serviceTypes: string[]
  regulatedActivities: string[]
  registeredManagers: string[]
  nominatedIndividual: string
  /** YYYY-MM-DD or '' */
  cqcRegistrationDate: string
  rating: BranchRatingChoice
  status: BranchStatus
  timezone: string
  currency: string
  locale: string
  /** Read-only; only replaced by a Google-resolved address. */
  latitude: number | null
  longitude: number | null
  /** True once a Google suggestion supplied new coordinates. */
  coordinatesFromGoogle: boolean
}

export type BranchListField = 'serviceTypes' | 'regulatedActivities' | 'registeredManagers'

export function branchToForm(branch: LocationTreeBranch): BranchFormState {
  return {
    name: branch.name ?? '',
    address: branch.address ?? '',
    addressLine1: branch.addressLine1 ?? '',
    addressLine2: branch.addressLine2 ?? '',
    town: branch.town ?? '',
    county: branch.county ?? '',
    postcode: branch.postcode ?? '',
    country: branch.country ?? '',
    countryCode: branch.countryCode ?? 'GB',
    localAuthority: branch.localAuthority ?? '',
    phone: branch.phone ?? '',
    email: branch.email ?? '',
    website: branch.website ?? '',
    cqcLocationId: branch.cqcLocationId ?? '',
    officialCqcName: branch.officialCqcName ?? '',
    serviceTypes: [...(branch.serviceTypes ?? [])],
    regulatedActivities: [...(branch.regulatedActivities ?? [])],
    registeredManagers: [...(branch.registeredManagers ?? [])],
    nominatedIndividual: branch.nominatedIndividual ?? '',
    cqcRegistrationDate: branch.cqcRegistrationDate ?? '',
    rating: ratingChoiceFrom(branch.cqcRating, branch.cqcRatingStatus),
    status: branch.status ?? 'ACTIVE',
    timezone: branch.timezone ?? 'Europe/London',
    currency: branch.currency ?? 'GBP',
    locale: branch.locale ?? 'en-GB',
    latitude: branch.latitude ?? null,
    longitude: branch.longitude ?? null,
    coordinatesFromGoogle: false,
  }
}

/** Append an empty row for the user to type into. */
export function addListItem(list: string[]): string[] {
  return [...list, '']
}

export function updateListItem(list: string[], index: number, value: string): string[] {
  return list.map((item, i) => (i === index ? value : item))
}

export function removeListItem(list: string[], index: number): string[] {
  return list.filter((_, i) => i !== index)
}

/** Trimmed, non-empty, de-duplicated. */
export function cleanList(list: string[]): string[] {
  const out: string[] = []
  for (const raw of list) {
    const v = raw.trim()
    if (v && !out.includes(v)) out.push(v)
  }
  return out
}

/** Google Places result → structured address parts (+ coordinates when Google has them). */
export type GoogleAddressMeta = {
  addressLine1?: string
  addressLine2?: string
  city?: string
  county?: string
  postcode?: string
  country?: string
  lat?: number | null
  lng?: number | null
}

export function addressPartsFromGoogle(meta: GoogleAddressMeta | undefined): LocationBranchDetailsPayload {
  if (!meta) return {}
  const out: LocationBranchDetailsPayload = {}
  if (meta.addressLine1) out.addressLine1 = meta.addressLine1
  if (meta.addressLine2) out.addressLine2 = meta.addressLine2
  if (meta.city) out.town = meta.city
  if (meta.county) out.county = meta.county
  if (meta.postcode) out.postcode = meta.postcode
  if (meta.country) out.country = meta.country
  if (typeof meta.lat === 'number' && typeof meta.lng === 'number') {
    out.latitude = meta.lat
    out.longitude = meta.lng
  }
  return out
}

/** Apply a Google suggestion to the edit form (structured parts replace the old ones). */
export function applyGoogleAddress(
  form: BranchFormState,
  address: string,
  meta: GoogleAddressMeta | undefined,
): BranchFormState {
  if (!meta) return { ...form, address }
  const parts = addressPartsFromGoogle(meta)
  const hasCoords = typeof parts.latitude === 'number' && typeof parts.longitude === 'number'
  return {
    ...form,
    address,
    addressLine1: parts.addressLine1 ?? '',
    addressLine2: parts.addressLine2 ?? '',
    town: parts.town ?? '',
    county: parts.county ?? '',
    postcode: parts.postcode ?? '',
    country: parts.country ?? form.country,
    latitude: hasCoords ? (parts.latitude as number) : form.latitude,
    longitude: hasCoords ? (parts.longitude as number) : form.longitude,
    coordinatesFromGoogle: form.coordinatesFromGoogle || hasCoords,
  }
}

/**
 * PATCH body for the Edit branch dialog. Every editable field is sent (blank clears);
 * coordinates are only sent when a Google suggestion supplied them. visitRefCode / code are never sent.
 */
export function branchFormToPayload(form: BranchFormState): UpdateLocationBranchPayload {
  const text = (v: string) => v.trim()
  const payload: UpdateLocationBranchPayload = {
    name: form.name.trim(),
    address: text(form.address),
    addressLine1: text(form.addressLine1),
    addressLine2: text(form.addressLine2),
    town: text(form.town),
    county: text(form.county),
    postcode: text(form.postcode).toUpperCase(),
    country: text(form.country),
    localAuthority: text(form.localAuthority),
    phone: text(form.phone),
    email: text(form.email),
    website: text(form.website),
    cqcLocationId: text(form.cqcLocationId),
    officialCqcName: text(form.officialCqcName),
    serviceTypes: cleanList(form.serviceTypes),
    regulatedActivities: cleanList(form.regulatedActivities),
    registeredManagers: cleanList(form.registeredManagers),
    nominatedIndividual: text(form.nominatedIndividual),
    cqcRegistrationDate: form.cqcRegistrationDate.trim() || null,
    ...ratingFieldsFromChoice(form.rating),
    status: form.status,
  }
  const countryCode = form.countryCode.trim().toUpperCase()
  if (countryCode) payload.countryCode = countryCode
  const timezone = form.timezone.trim()
  if (timezone) payload.timezone = timezone
  const currency = form.currency.trim().toUpperCase()
  if (currency) payload.currency = currency
  const locale = form.locale.trim()
  if (locale) payload.locale = locale
  if (form.coordinatesFromGoogle && form.latitude !== null && form.longitude !== null) {
    payload.latitude = form.latitude
    payload.longitude = form.longitude
  }
  return payload
}

/** Optional CQC fields on the Add branch dialog. */
export type AddBranchCqcDraft = {
  cqcLocationId: string
  officialCqcName: string
  localAuthority: string
  rating: BranchRatingChoice
  registeredManagers: string[]
}

export const EMPTY_ADD_BRANCH_CQC: AddBranchCqcDraft = {
  cqcLocationId: '',
  officialCqcName: '',
  localAuthority: '',
  rating: '',
  registeredManagers: [],
}

/** Only non-empty optional fields are sent on create. */
export function addBranchDetailsPayload(
  address: string,
  googleMeta: GoogleAddressMeta | undefined,
  cqc: AddBranchCqcDraft,
): LocationBranchDetailsPayload {
  const out: LocationBranchDetailsPayload = {}
  const addr = address.trim()
  if (addr) {
    out.address = addr
    Object.assign(out, addressPartsFromGoogle(googleMeta))
  }
  if (cqc.cqcLocationId.trim()) out.cqcLocationId = cqc.cqcLocationId.trim()
  if (cqc.officialCqcName.trim()) out.officialCqcName = cqc.officialCqcName.trim()
  if (cqc.localAuthority.trim()) out.localAuthority = cqc.localAuthority.trim()
  if (cqc.rating) Object.assign(out, ratingFieldsFromChoice(cqc.rating))
  const managers = cleanList(cqc.registeredManagers)
  if (managers.length) out.registeredManagers = managers
  return out
}
