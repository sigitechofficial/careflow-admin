import type { PayCard, PayCardAssignmentLevel } from '@/features/billing/types/billing-cards.types'
import {
  PAY_CARD_ASSIGNMENT_OPTIONS,
  PAY_CARD_WORKER_TYPE_OPTIONS,
  formatPayCardAssignmentDisplay,
} from '@/features/billing/types/billing-cards.types'

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

/** Optional display names for match explanations. */
export type EmploymentPayCardMatchLabels = {
  roleName?: string | null
  locationName?: string | null
  baseLocationName?: string | null
  contractTypeName?: string | null
}

type PayCardMatchTarget = Pick<
  PayCard,
  'assignmentLevel' | 'assignmentTargetId' | 'assignmentTargetKey'
> & {
  assignmentLabel?: string | null
}

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

function cardTargetLabel(card: PayCardMatchTarget): string {
  return formatPayCardAssignmentDisplay(card)
}

/**
 * Human-readable reason why a pay card does / does not match a carer.
 */
export function explainPayCardMatch(
  employment: EmploymentPayCardMatchInput,
  card: PayCardMatchTarget,
  labels?: EmploymentPayCardMatchLabels | null,
): { matches: boolean; reason: string; levelLabel: string } {
  const levelLabel =
    PAY_CARD_ASSIGNMENT_OPTIONS.find(o => o.value === card.assignmentLevel)?.label ??
    card.assignmentLevel
  const target = cardTargetLabel(card)
  const matches = employmentMatchesPayCard(employment, card)

  if (!matches) {
    switch (card.assignmentLevel) {
      case 'BRANCH':
        return {
          matches: false,
          levelLabel,
          reason: `Does not match — card is for branch “${target}”, carer is on ${
            labels?.locationName || labels?.baseLocationName || 'a different branch'
          }.`,
        }
      case 'ROLE':
        return {
          matches: false,
          levelLabel,
          reason: `Does not match — card is for role “${target}”, carer role is ${
            labels?.roleName || 'different'
          }.`,
        }
      case 'EMPLOYMENT_TYPE':
        return {
          matches: false,
          levelLabel,
          reason: `Does not match — card is for employment type “${target}”, carer is ${
            labels?.contractTypeName || 'different'
          }.`,
        }
      case 'WORKER_TYPE':
        return {
          matches: false,
          levelLabel,
          reason: `Does not match — card is for ${target}; this carer’s worker type is different.`,
        }
      case 'CLIENT_FUNDER':
        return {
          matches: false,
          levelLabel,
          reason: 'Client/funder cards are not assigned as employee defaults.',
        }
      default:
        return {
          matches: false,
          levelLabel,
          reason: `Does not match this carer’s ${levelLabel.toLowerCase()} criteria.`,
        }
    }
  }

  switch (card.assignmentLevel) {
    case 'ORGANISATION_DEFAULT':
      return {
        matches: true,
        levelLabel,
        reason: 'Matches because this is an organisation default card (applies to all carers).',
      }
    case 'BRANCH': {
      const viaLocation = employment.locationId === card.assignmentTargetId
      const branchName = viaLocation
        ? labels?.locationName || target
        : labels?.baseLocationName || target
      return {
        matches: true,
        levelLabel,
        reason: viaLocation
          ? `Matches because carer’s branch is “${branchName}” (same as this card).`
          : `Matches because carer’s base location is “${branchName}” (same as this card).`,
      }
    }
    case 'ROLE':
      return {
        matches: true,
        levelLabel,
        reason: `Matches because carer’s role is “${labels?.roleName || target}”.`,
      }
    case 'EMPLOYMENT_TYPE':
      return {
        matches: true,
        levelLabel,
        reason: `Matches because carer’s employment type is “${
          labels?.contractTypeName || target
        }”.`,
      }
    case 'WORKER_TYPE': {
      const workerLabel =
        PAY_CARD_WORKER_TYPE_OPTIONS.find(o => o.value === card.assignmentTargetKey)?.label ??
        target
      return {
        matches: true,
        levelLabel,
        reason: `Matches because carer is ${workerLabel.toLowerCase()}.`,
      }
    }
    case 'INDIVIDUAL':
      return {
        matches: true,
        levelLabel,
        reason: 'Matches because this card is for this individual carer.',
      }
    default:
      return {
        matches: true,
        levelLabel,
        reason: `Matches on ${levelLabel.toLowerCase()}: ${target}.`,
      }
  }
}
