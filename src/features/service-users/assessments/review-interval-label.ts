/** "Every month", "Every 2 weeks", "Every 45 days" for an assessment review interval in days. */
export function formatReviewIntervalLabel(days: number | null | undefined): string | null {
  if (days == null) return null
  if (days % 7 === 0 && days >= 7) {
    const weeks = days / 7
    return weeks === 1 ? 'Every week' : `Every ${weeks} weeks`
  }
  if (days === 30 || days === 31) return 'Every month'
  if (days === 365 || days === 366) return 'Every year'
  return days === 1 ? 'Every day' : `Every ${days} days`
}
