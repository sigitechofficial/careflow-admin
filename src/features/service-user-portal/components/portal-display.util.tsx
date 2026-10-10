import type * as React from 'react'
import type { PortalEmployeeBrief } from '@/features/service-user-portal/api/portal.api'
import { formatDate, formatDateTime } from '@/shared/lib/utils'

/** Date in the organisation's date format and timezone (admin General settings). */
export function formatPortalDate(iso: string | null | undefined): string {
  if (!iso || Number.isNaN(new Date(iso).getTime())) return '—'
  return formatDate(iso)
}

/** Date + time in the organisation's formats and timezone. */
export function formatPortalDateTime(iso: string | null | undefined): string {
  if (!iso || Number.isNaN(new Date(iso).getTime())) return '—'
  return formatDateTime(iso)
}

export function toInputDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function displayValue(value: string | null | undefined): string {
  const v = value?.trim()
  return v ? v : '—'
}

export function employeeDisplayName(e: PortalEmployeeBrief): string {
  if (!e) return '—'
  const n = [e.firstName, e.lastName].filter(Boolean).join(' ').trim()
  return n || '—'
}

export function PortalSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  )
}

export function PortalReadOnlyField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{displayValue(value)}</p>
    </div>
  )
}
