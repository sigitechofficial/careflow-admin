import type { LocationAuditFields } from '@/features/settings/location-management/location-management.types'
import { formatDate } from '@/shared/lib/utils'

/** Opens /admin/audit filtered to location-management mutations (action contains `location.`). */
export const LOCATION_AUDIT_HISTORY_SEARCH = {
  module: 'SCHEDULING',
  search: 'location.',
} as const

export function formatLocationAuditLine(
  audit: LocationAuditFields | null | undefined,
): string | null {
  if (!audit) return null
  const parts: string[] = []
  if (audit.createdAt) {
    const added = `Added ${formatDate(audit.createdAt)}`
    parts.push(audit.createdByName ? `${added} · ${audit.createdByName}` : added)
  }
  const updatedDistinct =
    audit.updatedAt &&
    (!audit.createdAt || new Date(audit.updatedAt).getTime() !== new Date(audit.createdAt).getTime())
  if (updatedDistinct && audit.updatedAt) {
    const updated = `Updated ${formatDate(audit.updatedAt)}`
    parts.push(audit.updatedByName ? `${updated} · ${audit.updatedByName}` : updated)
  }
  return parts.length ? parts.join(' · ') : null
}
