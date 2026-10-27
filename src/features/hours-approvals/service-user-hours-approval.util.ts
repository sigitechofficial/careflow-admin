import type { ServiceUserHoursChangeApproval } from '@/features/hours-approvals/types'

/** Whether changing the hours from `previous` to `next` needs a manager (the first value never does). */
export function serviceUserHoursChangeNeedsApproval(
  rule: ServiceUserHoursChangeApproval,
  previous: number | null,
  next: number,
): boolean {
  if (previous == null) return false
  if (rule === 'ALWAYS') return true
  if (rule === 'NEVER') return false
  if (rule === 'INCREASE_ONLY') return next > previous
  return next < previous
}
