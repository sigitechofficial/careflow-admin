import type { BadgeProps } from '@/shared/ui/badge'
import type { CqcNotificationStatus, CqcSubmissionMethod } from './types'

export const STATUS_LABEL: Record<CqcNotificationStatus, string> = {
  DRAFT: 'Draft',
  READY: 'Ready to submit',
  SUBMITTED: 'Submitted',
  ACKNOWLEDGED: 'Acknowledged',
  NOT_REQUIRED: 'Not required',
  CANCELLED: 'Cancelled',
}

export const STATUS_ORDER: CqcNotificationStatus[] = [
  'DRAFT',
  'READY',
  'SUBMITTED',
  'ACKNOWLEDGED',
  'NOT_REQUIRED',
  'CANCELLED',
]

export function statusVariant(status: CqcNotificationStatus): BadgeProps['variant'] {
  switch (status) {
    case 'DRAFT':
      return 'outline'
    case 'READY':
      return 'info'
    case 'SUBMITTED':
      return 'success'
    case 'ACKNOWLEDGED':
      return 'solid-success'
    default:
      return 'muted'
  }
}

export const METHOD_LABEL: Record<CqcSubmissionMethod, string> = {
  PROVIDER_PORTAL: 'CQC provider portal',
  EMAIL_FORM: 'CQC form by email',
}

/** "2026-11-19T10:30" for <input type="datetime-local"> in the browser's time zone. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromLocalInput(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
