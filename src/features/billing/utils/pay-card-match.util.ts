import type { PayCard, PayCardAssignmentLevel } from '@/features/billing/types/billing-cards.types'

/** Employment fields used to decide whether a pay card may be assigned to a carer. */
export type EmploymentPayCardMatchInput = {
  employeeId?: string | null
  roleId?: string | null
  locationId?: string | null
  baseLocationId?: string | null
  contractTypeId?: string | null
  isAgencyStaff?: boolean | null
  isBankStaff?: boolean | null
}

type PayCardMatchTarget = Pick<
  PayCard,
  'assignmentLevel' | 'assignmentTargetId' | 'assignmentTargetKey'
>

/**
 * Mirrors backend `employmentMatchesPayCard`.
 * Used to filter employee pay-card pickers so branch/role/etc. stay consistent.
 */
export function employmentMatchesPayCard(
  employment: EmploymentPayCardMatchInput,
  card: PayCardMatchTarget,
): boolean {
  switch (card.assignmentLevel as PayCardAssignmentLevel) {
    case 'ROLE':
      return Boolean(card.assignmentTargetId) && employment.roleId === card.assignmentTargetId
    case 'BRANCH':
      return (
        Boolean(card.assignmentTargetId) &&
        (employment.locationId === card.assignmentTargetId ||
          employment.baseLocationId === card.assignmentTargetId)
      )
    case 'EMPLOYMENT_TYPE':
      return (
        Boolean(card.assignmentTargetId) &&
        employment.contractTypeId === card.assignmentTargetId
      )
    case 'WORKER_TYPE': {
      if (!card.assignmentTargetKey) return false
      if (card.assignmentTargetKey === 'AGENCY') return Boolean(employment.isAgencyStaff)
      if (card.assignmentTargetKey === 'BANK') return Boolean(employment.isBankStaff)
      return !employment.isAgencyStaff && !employment.isBankStaff
    }
    case 'INDIVIDUAL':
      return (
        Boolean(card.assignmentTargetId) && employment.employeeId === card.assignmentTargetId
      )
    case 'CLIENT_FUNDER':
      // Resolved at visit/funding level — not a valid employee default.
      return false
    case 'ORGANISATION_DEFAULT':
      return true
    default:
      return false
  }
}

export function isPayCardAssignableToEmployment(
  card: PayCardMatchTarget,
  employment: EmploymentPayCardMatchInput | null | undefined,
): boolean {
  if (!employment) return false
  return employmentMatchesPayCard(employment, card)
}
