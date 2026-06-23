/** Per-plan working-pattern sync preference (stored on ServiceUserVisitPlan). */
export function visitPlanRespectWorkingPatternOnSync(
  plan?: { respectWorkingPatternOnSync?: boolean } | null,
): boolean {
  return plan?.respectWorkingPatternOnSync !== false
}

/**
 * Bulk rota: derive batch default from each plan's stored preference.
 * Returns false when any selected plan syncs carers on all assigned visit days.
 */
export function resolveBulkRespectWorkingPatternOnSync(
  plans: Array<{ respectWorkingPatternOnSync?: boolean }>,
): boolean {
  if (plans.some((p) => p.respectWorkingPatternOnSync === false)) return false
  return true
}
