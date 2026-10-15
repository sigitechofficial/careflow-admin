/** Standalone parental-leave feature — kept separate from the HR/Workforce module. */

export const PARENTAL_LEAVE_TYPES = ['Maternity', 'Paternity'] as const
export type ParentalLeaveType = (typeof PARENTAL_LEAVE_TYPES)[number]

/** Maximum approved length for maternity/paternity leave. */
export const MAX_PARENTAL_LEAVE_WEEKS = 52

export const PARENTAL_LEAVE_STATUSES = ['Authorised', 'Pending', 'Unauthorised'] as const
export type ParentalLeaveStatus = (typeof PARENTAL_LEAVE_STATUSES)[number]
