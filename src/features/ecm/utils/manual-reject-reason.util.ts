/** Keep in sync with careflow-api MANUAL_REJECT_REASONS. */
export const MANUAL_REJECT_REASONS = [
  { code: 'MOVE_INTO_AREA', label: 'Carer can reach the visit area', requiresNotes: false },
  { code: 'USE_GPS', label: 'Use GPS check-in', requiresNotes: false },
  { code: 'INSUFFICIENT_INFO', label: 'Not enough information', requiresNotes: false },
  { code: 'SAFETY_OR_POLICY', label: 'Safety or policy concern', requiresNotes: false },
  { code: 'OTHER', label: 'Other reason', requiresNotes: true },
] as const;

export function canSubmitManualReject(
  reason: { requiresNotes: boolean } | null,
  note: string,
): boolean {
  if (!reason) return false
  if (reason.requiresNotes) return note.trim().length > 0
  return true
}
