import type { ServiceUserDetail } from '@/features/service-users/types'
import { showsKeySafeFields } from '@/features/service-users/home-access'

export type MissingItemGroup = 'Profile' | 'Home & access' | 'People' | 'Clinical' | 'Care'

export type MissingItemTarget =
  | {
      to: '/service-users/$serviceUserId/profile'
      /** Profile tab, and the field label `useFocusField` scrolls to and highlights. */
      search: { tab: string; focus?: string }
    }
  | { to: '/service-users/$serviceUserId/medication' | '/service-users/$serviceUserId/visit-plan'; search?: undefined }

export type MissingItem = {
  id: string
  group: MissingItemGroup
  title: string
  detail: string
  linkLabel: string
} & MissingItemTarget

const has = (v: string | null | undefined) => Boolean(v?.trim())

const profile = (tab: string, focus?: string): MissingItemTarget => ({
  to: '/service-users/$serviceUserId/profile',
  search: focus ? { tab, focus } : { tab },
})

/**
 * Information missing from a service user's record, each with where to add it. Only checks fields
 * the dashboard already loads; items the "Needs attention" card already shows are left to it.
 */
export function serviceUserMissingItems(input: {
  detail: ServiceUserDetail
  allergyCount: number
  activeMedicationCount: number
  visitPlanStatus: string | null | undefined
  /** Primary funding row, if any (funding route / review date). */
  primaryFunding: { fundingTypeName: string | null; reviewDate: string | null | undefined } | null
}): MissingItem[] {
  const d = input.detail
  const addr = d.address
  const items: MissingItem[] = []
  const add = (item: MissingItem) => items.push(item)

  // Profile
  if (!has(d.dateOfBirth)) {
    add({ id: 'dob', group: 'Profile', title: 'Date of birth', detail: 'Not recorded', linkLabel: 'Add', ...profile('personal', 'Date of Birth') })
  }
  if (!has(d.nhsNumber)) {
    add({ id: 'nhs', group: 'Profile', title: 'NHS number', detail: 'Not recorded', linkLabel: 'Add', ...profile('personal', 'NHS Number') })
  }
  if (!d.gender) {
    add({ id: 'gender', group: 'Profile', title: 'Gender', detail: 'Not recorded', linkLabel: 'Add', ...profile('personal', 'Gender') })
  }
  if (!has(d.phone) && !has(d.mobile)) {
    add({ id: 'phone', group: 'Profile', title: 'Phone number', detail: 'No phone or mobile number', linkLabel: 'Add', ...profile('personal', 'Contact Details') })
  }
  if (!d.profilePhotoUrl && !d.profilePhoto) {
    add({ id: 'photo', group: 'Profile', title: 'Profile photo', detail: 'Helps carers identify the person', linkLabel: 'Upload', ...profile('photos') })
  }

  // Care
  if (!d.careType) {
    add({ id: 'care-type', group: 'Care', title: 'Category of care', detail: 'Not set', linkLabel: 'Set', ...profile('personal', 'Category of Care') })
  }
  if (!has(d.serviceStartDate)) {
    add({ id: 'service-start', group: 'Care', title: 'Service start date', detail: 'Not set', linkLabel: 'Set', ...profile('personal', 'Service Start Date/Time') })
  }
  if (input.visitPlanStatus && input.visitPlanStatus !== 'ACTIVE' && input.visitPlanStatus !== 'SUSPENDED') {
    add({
      id: 'visit-plan-not-active',
      group: 'Care',
      title: 'Visit plan not active',
      detail: `Visit plan is ${input.visitPlanStatus.toLowerCase()} — activate it to schedule visits`,
      linkLabel: 'Open visit plan',
      to: '/service-users/$serviceUserId/visit-plan',
    })
  }
  if (!input.primaryFunding?.fundingTypeName && !d.fundingType) {
    add({ id: 'funding', group: 'Care', title: 'Funding route', detail: 'Not recorded', linkLabel: 'Add', ...profile('personal', 'Funding Route') })
  } else if (input.primaryFunding && !has(input.primaryFunding.reviewDate)) {
    add({ id: 'funding-review', group: 'Care', title: 'Funding review date', detail: 'No review date on the funding record', linkLabel: 'Set', ...profile('funding') })
  }

  // Clinical
  if (!d.riskLevel) {
    add({ id: 'risk-level', group: 'Clinical', title: 'Risk level', detail: 'Not set', linkLabel: 'Set', ...profile('personal', 'Risk level') })
  }
  if (input.allergyCount === 0) {
    add({ id: 'allergies', group: 'Clinical', title: 'Allergies', detail: 'None recorded — add them, or record that none are known', linkLabel: 'Open allergies', ...profile('allergies') })
  }
  if (input.activeMedicationCount === 0) {
    add({ id: 'medication', group: 'Clinical', title: 'Medication', detail: 'No active medicines on file — add them or confirm none', linkLabel: 'Open meds', to: '/service-users/$serviceUserId/medication' })
  }

  // People
  if (!d.keyWorker && !d.assignment?.keyWorker) {
    add({ id: 'key-worker', group: 'People', title: 'Key worker', detail: 'Not assigned', linkLabel: 'Assign', ...profile('personal', 'Key Worker (search employees)') })
  }
  if ((d.contacts ?? []).length === 0) {
    add({ id: 'contacts', group: 'People', title: 'Contacts', detail: 'No family or contacts recorded', linkLabel: 'Add contact', ...profile('contacts') })
  } else if (!(d.contacts ?? []).some((c) => c.isEmergencyContact)) {
    add({ id: 'emergency-contact', group: 'People', title: 'Emergency contact', detail: 'No contact is marked as the emergency contact', linkLabel: 'Open contacts', ...profile('contacts') })
  }

  // Home & access (edited on the DOM Care tab)
  if (!has(addr?.addressLine1) || !has(addr?.postcode)) {
    add({ id: 'address', group: 'Home & access', title: 'Home address', detail: !has(addr?.postcode) ? 'Postcode missing' : 'First address line missing', linkLabel: 'Add', ...profile('dom', 'Service location') })
  }
  if (!has(addr?.accessMethod)) {
    add({ id: 'access-method', group: 'Home & access', title: 'Access method', detail: 'How carers get in is not recorded', linkLabel: 'Add', ...profile('dom', 'How to enter the home') })
  } else if (showsKeySafeFields(addr?.accessMethod) && (!has(addr?.keySafeNumber) || !has(addr?.keySafeLocation))) {
    add({
      id: 'key-safe',
      group: 'Home & access',
      title: 'Key safe details',
      detail: !has(addr?.keySafeNumber) ? 'Key safe code missing' : 'Key safe location missing',
      linkLabel: 'Add',
      ...profile('dom', 'How to enter the home'),
    })
  }
  if (!has(addr?.accessInstructions)) {
    add({ id: 'access-instructions', group: 'Home & access', title: 'How to enter', detail: 'No entry instructions for carers', linkLabel: 'Add', ...profile('dom', 'How to enter the home') })
  }

  return items
}
