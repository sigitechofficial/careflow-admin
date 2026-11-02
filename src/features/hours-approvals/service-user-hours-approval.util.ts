/** Whether changing the hours from `previous` to `next` needs a manager (the first value never does). */
export function serviceUserHoursChangeNeedsApproval(
  changeNeedsApproval: boolean,
  previous: number | null,
  next: number,
): boolean {
  if (previous == null) return false
  if (next === previous) return false
  return changeNeedsApproval
}
