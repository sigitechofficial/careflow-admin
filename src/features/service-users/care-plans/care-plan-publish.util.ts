/** True when at least one care plan field has a non-empty saved value. */
export function hasPublishableCarePlanValues(
  values: Record<string, string | boolean> | null | undefined,
): boolean {
  if (!values || typeof values !== 'object') return false
  return Object.values(values).some((value) => {
    if (typeof value === 'boolean') return true
    if (typeof value === 'string') return value.trim().length > 0
    return value != null
  })
}
