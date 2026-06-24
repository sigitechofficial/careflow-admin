import type { ServiceUserDetail } from '@/features/service-users/types'
import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'

export function employeeDisplayName(
  e: { firstName?: string | null; lastName?: string | null } | null | undefined,
): string | null {
  if (!e) return null
  const n = [e.firstName, e.lastName].filter(Boolean).join(' ').trim()
  return n || null
}

export function initialsFromName(first?: string | null, last?: string | null, fallback = 'SU'): string {
  const f = first?.trim()?.[0] ?? ''
  const l = last?.trim()?.[0] ?? ''
  const out = `${f}${l}`.toUpperCase()
  return out || fallback.slice(0, 2).toUpperCase()
}

export function formatDobLong(iso: string | null | undefined): string {
  if (!iso) return '—'
  return formatOrganisationDate(iso, { utc: true })
}

export function ageFromDob(iso: string | null | undefined): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const today = new Date()
  let age = today.getUTCFullYear() - d.getUTCFullYear()
  const m = today.getUTCMonth() - d.getUTCMonth()
  if (m < 0 || (m === 0 && today.getUTCDate() < d.getUTCDate())) age -= 1
  return age
}

export function formatShortUk(iso: string | null | undefined): string {
  if (!iso) return '—'
  return formatOrganisationDate(iso)
}

export function formatFlashUntil(iso: string): string {
  const formatted = formatOrganisationDate(iso)
  return formatted === '—' ? iso : formatted
}

export function isHighRisk(detail: ServiceUserDetail | null): boolean {
  const code = detail?.riskLevel?.code?.toUpperCase()
  return code === 'HIGH' || code === 'CRITICAL'
}

export function riskMeterPercent(detail: ServiceUserDetail | null): number {
  const code = detail?.riskLevel?.code?.toUpperCase()
  if (code === 'CRITICAL') return 100
  if (code === 'HIGH') return 75
  if (code === 'MEDIUM') return 50
  if (code === 'LOW') return 25
  return 0
}

export function hasDiabetesAllergyFlag(allergyNames: string[]): boolean {
  return allergyNames.some(n => /diabet/i.test(n))
}
