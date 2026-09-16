export type SosChipDef = {
  code: string
  label: string
  requiresNotes?: boolean
}

/** Keep in sync with careflow-api SOS_ACTION_CODES. */
export const SOS_ACTION_CODES: SosChipDef[] = [
  { code: 'SOS_ACTION_CALLED_CARER', label: 'Called carer' },
  { code: 'SOS_ACTION_CALLED_SERVICE_USER', label: 'Called service user' },
  { code: 'SOS_ACTION_CALLED_ON_CALL', label: 'Called on-call / manager' },
  { code: 'SOS_ACTION_SENT_BACKUP', label: 'Sent backup' },
  { code: 'SOS_ACTION_CALLED_999', label: 'Called emergency services' },
  { code: 'SOS_ACTION_WELFARE_CHECK', label: 'Welfare check' },
  { code: 'SOS_ACTION_NONE', label: 'No extra action needed' },
  { code: 'SOS_ACTION_OTHER', label: 'Other action', requiresNotes: true },
]

/** Keep in sync with careflow-api SOS_OUTCOME_CODES. */
export const SOS_OUTCOME_CODES: SosChipDef[] = [
  { code: 'SOS_ALL_SAFE_CONTINUING', label: 'All safe — visit continuing' },
  { code: 'SOS_ALL_SAFE_LEFT', label: 'All safe — visit stopped' },
  { code: 'SOS_UNABLE_TO_CONTACT', label: 'Unable to contact' },
  { code: 'SOS_FALSE_ALARM', label: 'False alarm' },
  { code: 'SOS_TEST_ALERT', label: 'Test alert' },
  { code: 'SOS_INCIDENT_RAISED', label: 'Incident raised' },
  { code: 'SOS_EMERGENCY_SERVICES_INVOLVED', label: 'Emergency services involved' },
  { code: 'SOS_OTHER', label: 'Other outcome', requiresNotes: true },
]

const SOS_LEGACY_OUTCOME_CODES: SosChipDef[] = [
  { code: 'SOS_BACKUP_DISPATCHED', label: 'Backup sent' },
  { code: 'SOS_EMERGENCY_SERVICES', label: 'Emergency services called' },
]

export function sosActionLabel(code: string | null | undefined): string | null {
  if (!code?.trim()) return null
  return SOS_ACTION_CODES.find(row => row.code === code)?.label ?? null
}

export function sosOutcomeLabel(code: string | null | undefined): string | null {
  if (!code?.trim()) return null
  return (
    SOS_OUTCOME_CODES.find(row => row.code === code)?.label ??
    SOS_LEGACY_OUTCOME_CODES.find(row => row.code === code)?.label ??
    null
  )
}

export function canSubmitSosClose(
  actionCode: string | null,
  outcomeCode: string | null,
  actionNote: string,
  outcomeNote: string,
): boolean {
  if (!actionCode || !outcomeCode) return false
  const action = SOS_ACTION_CODES.find(row => row.code === actionCode)
  const outcome = SOS_OUTCOME_CODES.find(row => row.code === outcomeCode)
  if (!action || !outcome) return false
  if (action.requiresNotes && !actionNote.trim()) return false
  if (outcome.requiresNotes && !outcomeNote.trim()) return false
  return true
}
