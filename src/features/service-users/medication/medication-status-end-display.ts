import type { ServiceUserMedicationRow } from '@/features/service-users/api/service-users.api'
import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'

export type MedicationStatusEndReasonValue = 'MANUAL' | 'END_DATE'

export type MedicationStatusEndedByRef = {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
} | null

function endedByDisplayName(user: MedicationStatusEndedByRef): string | null {
  if (!user) return null
  const n = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return n || user.email?.trim() || null
}

/** Human-readable label for how a prescription left active use. */
export function medicationEndSourceLabel(m: ServiceUserMedicationRow): string | null {
  if (m.status !== 'ENDED' && m.status !== 'CANCELLED') return null

  if (m.status === 'CANCELLED') {
    if (m.statusEndReason === 'MANUAL') {
      const who = endedByDisplayName(m.statusEndedBy ?? null)
      return who ? `Cancelled manually by ${who}` : 'Cancelled manually by staff'
    }
    return 'Cancelled'
  }

  if (m.statusEndReason === 'END_DATE') {
    return 'Ended automatically (prescription end date reached)'
  }
  if (m.statusEndReason === 'MANUAL') {
    const who = endedByDisplayName(m.statusEndedBy ?? null)
    return who ? `Stopped manually by ${who}` : 'Stopped manually by staff'
  }

  return 'Ended (reason not recorded)'
}

export function medicationEndSourceWhen(m: ServiceUserMedicationRow): string | null {
  const at = m.statusEndedAt ?? (m.statusEndReason === 'END_DATE' ? m.endDate : null)
  if (!at) return null
  const formatted = formatOrganisationDate(at)
  return formatted === '—' ? null : formatted
}
