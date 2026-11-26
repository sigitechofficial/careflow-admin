import type { MissingItem } from '@/features/service-users/dashboard/service-user-missing-items'

export type ChecklistGroup = 'Profile' | 'Care' | 'Billing & funding' | 'Clinical' | 'People' | 'Home & access'

export const CHECKLIST_GROUP_ORDER: ChecklistGroup[] = [
  'Profile',
  'Care',
  'Clinical',
  'Billing & funding',
  'People',
  'Home & access',
]

export type ChecklistTarget =
  | { to: '/service-users/$serviceUserId/profile'; search: { tab: string; focus?: string } }
  | {
      to:
        | '/service-users/$serviceUserId/medication'
        | '/service-users/$serviceUserId/visit-plan'
        | '/service-users/$serviceUserId/care-plan'
      search?: undefined
    }

export type ChecklistItem = {
  id: string
  group: ChecklistGroup
  title: string
  done: boolean
  /** What is recorded (done) or what is missing. */
  detail: string
  linkLabel: string
} & ChecklistTarget

const profile = (tab: string, focus?: string): ChecklistTarget => ({
  to: '/service-users/$serviceUserId/profile',
  search: focus ? { tab, focus } : { tab },
})

/** Checks backed by `serviceUserMissingItems`: done when none of their missing-item ids is present. */
const RECORD_CHECKS: { ids: string[]; group: ChecklistGroup; title: string; target: ChecklistTarget }[] = [
  { ids: ['dob'], group: 'Profile', title: 'Date of birth', target: profile('personal', 'Date of Birth') },
  { ids: ['nhs'], group: 'Profile', title: 'NHS number', target: profile('personal', 'NHS Number') },
  { ids: ['gender'], group: 'Profile', title: 'Gender', target: profile('personal', 'Gender') },
  { ids: ['phone'], group: 'Profile', title: 'Phone number', target: profile('personal', 'Contact Details') },
  { ids: ['photo'], group: 'Profile', title: 'Profile photo', target: profile('photos') },
  { ids: ['care-type'], group: 'Care', title: 'Category of care', target: profile('personal', 'Category of Care') },
  { ids: ['service-start'], group: 'Care', title: 'Service start date', target: profile('personal', 'Service Start Date/Time') },
  { ids: ['funding', 'funding-review'], group: 'Billing & funding', title: 'Funding route & review', target: profile('funding') },
  { ids: ['risk-level'], group: 'Clinical', title: 'Risk level', target: profile('personal', 'Risk level') },
  { ids: ['allergies'], group: 'Clinical', title: 'Allergies', target: profile('allergies') },
  { ids: ['medication'], group: 'Clinical', title: 'Medication', target: { to: '/service-users/$serviceUserId/medication' } },
  { ids: ['key-worker'], group: 'People', title: 'Key worker', target: profile('personal', 'Key Worker (search employees)') },
  { ids: ['contacts', 'emergency-contact'], group: 'People', title: 'Emergency contact', target: profile('contacts') },
  { ids: ['address'], group: 'Home & access', title: 'Home address', target: profile('dom', 'Service location') },
  { ids: ['access-method', 'key-safe'], group: 'Home & access', title: 'Access method & key safe', target: profile('dom', 'How to enter the home') },
  { ids: ['access-instructions'], group: 'Home & access', title: 'How to enter', target: profile('dom', 'How to enter the home') },
]

/**
 * Everything the service user's record should have, each marked done or not. Record fields come from
 * `serviceUserMissingItems`; funders, charge card, assessment, care plan and visit plan are passed in.
 * A check passed as `undefined` (its data could not be loaded, e.g. no permission) is left out.
 */
export function serviceUserChecklist(input: {
  missingItems: MissingItem[]
  /** Names of the funders on active funding records. */
  funderNames: string[] | undefined
  /** Charge card used for billing, or null when none applies. */
  chargeCard: { name: string; matched: boolean } | null | undefined
  hasInitialAssessment: boolean | undefined
  /** Accepted + published care plans. */
  carePlanCount: number | undefined
  visitPlanStatus: string | null | undefined
}): ChecklistItem[] {
  const missingById = new Map(input.missingItems.map(item => [item.id, item]))
  const items: ChecklistItem[] = RECORD_CHECKS.map(check => {
    const missing = check.ids.map(id => missingById.get(id)).find(Boolean)
    return {
      id: check.ids[0]!,
      group: check.group,
      title: check.title,
      done: !missing,
      detail: missing ? missing.detail : 'Added',
      // Short labels for the compact list ("Open allergies" → "Add").
      linkLabel: missing ? (missing.linkLabel.startsWith('Open') ? 'Add' : missing.linkLabel) : 'View',
      ...check.target,
    }
  })

  const add = (item: ChecklistItem) => items.push(item)

  if (input.funderNames !== undefined) {
    const done = input.funderNames.length > 0
    add({
      id: 'funders',
      group: 'Billing & funding',
      title: 'Funders',
      done,
      detail: done ? input.funderNames.join(', ') : 'No funder on an active funding record',
      linkLabel: done ? 'View' : 'Add',
      ...profile('funding'),
    })
  }
  if (input.chargeCard !== undefined) {
    const card = input.chargeCard
    add({
      id: 'charge-card',
      group: 'Billing & funding',
      title: 'Charge card',
      done: Boolean(card),
      detail: card ? `${card.name}${card.matched ? ' (matched automatically)' : ''}` : 'No charge card applies — visits cannot be billed',
      linkLabel: card ? 'View' : 'Assign',
      ...profile('charge-card'),
    })
  }
  if (input.hasInitialAssessment !== undefined) {
    add({
      id: 'initial-assessment',
      group: 'Care',
      title: 'Initial assessment',
      done: input.hasInitialAssessment,
      detail: input.hasInitialAssessment ? 'On file' : 'Not on file',
      linkLabel: input.hasInitialAssessment ? 'View' : 'Start',
      ...profile('assessment'),
    })
  }
  if (input.carePlanCount !== undefined) {
    const done = input.carePlanCount > 0
    add({
      id: 'care-plan',
      group: 'Care',
      title: 'Care plan',
      done,
      detail: done ? `${input.carePlanCount} published` : 'None published',
      linkLabel: done ? 'View' : 'Add',
      to: '/service-users/$serviceUserId/care-plan',
    })
  }
  if (input.visitPlanStatus !== undefined) {
    const status = input.visitPlanStatus
    const done = status === 'ACTIVE'
    add({
      id: 'visit-plan',
      group: 'Care',
      title: 'Visit plan',
      done,
      detail: done ? 'Active' : status ? `${status.charAt(0)}${status.slice(1).toLowerCase()} — not active` : 'Not set up',
      linkLabel: done ? 'View' : status ? 'Open' : 'Set up',
      to: '/service-users/$serviceUserId/visit-plan',
    })
  }

  return items
}
