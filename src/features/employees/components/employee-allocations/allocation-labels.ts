import type {
  AllocationItemCategory,
  EmployeeAllocationRow,
  EmployeeAllocationStatus,
} from '@/features/employees/types'

export const ALLOCATION_CATEGORY_LABEL: Record<AllocationItemCategory, string> = {
  EQUIPMENT: 'Equipment',
  PPE: 'PPE',
  UNIFORM: 'Uniform & apparel',
  OTHER: 'Other',
}

export const ALLOCATION_CATEGORIES = Object.keys(ALLOCATION_CATEGORY_LABEL) as AllocationItemCategory[]

export const ALLOCATION_STATUS_LABEL: Record<EmployeeAllocationStatus, string> = {
  ISSUED: 'With employee',
  RETURNED: 'Returned',
  LOST: 'Lost',
  DAMAGED: 'Damaged',
}

export const ALLOCATION_STATUSES = Object.keys(ALLOCATION_STATUS_LABEL) as EmployeeAllocationStatus[]

export function allocationStatusVariant(status: EmployeeAllocationStatus) {
  if (status === 'ISSUED') return 'info' as const
  if (status === 'RETURNED') return 'muted' as const
  return 'destructive' as const
}

/** Still with the employee and past its return-due date. */
export function isAllocationReturnOverdue(row: EmployeeAllocationRow, todayIso: string): boolean {
  return row.status === 'ISSUED' && Boolean(row.expectedReturnAt) && row.expectedReturnAt!.slice(0, 10) < todayIso
}

/** Return-due dates are civil dates; stored as UTC noon so they never shift a day. */
export function returnDueDateToIso(date: string): string | null {
  return date ? `${date}T12:00:00.000Z` : null
}

export function returnDueIsoToDate(iso: string | null): string {
  return iso ? iso.slice(0, 10) : ''
}
