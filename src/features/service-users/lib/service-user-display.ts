import type { ServiceUserDetail } from '@/features/service-users/types'

export function formatServiceUserDob(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}-${mm}-${yyyy}`
}

export function serviceUserDisplayName(d: ServiceUserDetail | null | undefined): string {
  if (!d) return 'Service user'
  return serviceUserLegalDisplayName(d)
}

export function serviceUserLegalDisplayName(d: {
  firstName?: string | null
  lastName?: string | null
  preferredName?: string | null
}): string {
  const legal = [d.firstName, d.lastName].filter(Boolean).join(' ').trim()
  if (d.preferredName?.trim()) {
    return legal ? `${legal} (${d.preferredName.trim()})` : d.preferredName.trim()
  }
  return legal || 'Service user'
}

export function serviceUserGivenName(d: ServiceUserDetail | null | undefined): string {
  if (!d) return 'this service user'
  return d.preferredName?.trim() || d.firstName?.trim() || 'this service user'
}
