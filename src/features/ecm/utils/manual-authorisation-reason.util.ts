export function canSubmitManualAuthorisation(
  reason: { requiresNotes: boolean } | null,
  note: string,
): boolean {
  if (!reason) return false
  if (reason.requiresNotes) return note.trim().length > 0
  return true
}

export function sortManualAuthorisationReasons<
  T extends { code: string; sortOrder: number; label: string },
>(rows: T[], otherCode = 'OTHER'): T[] {
  return [...rows].sort((a, b) => {
    if (a.code === otherCode) return 1
    if (b.code === otherCode) return -1
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return a.label.localeCompare(b.label)
  })
}
