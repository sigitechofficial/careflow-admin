import type { BadgeProps } from '@/shared/ui/badge'
import type { AuditFrequency, AuditState, AuditStatus, AuditTab, ComplianceLevel } from './types'

export const STATUS_LABEL: Record<AuditStatus, string> = {
  DUE: 'Due',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  MISSED: 'Missed',
  CANCELLED: 'Cancelled',
}

export const TAB_LABEL: Record<AuditTab, string> = {
  OVERDUE: 'Overdue',
  DUE: 'Due',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  MISSED: 'Missed',
}

export const FREQUENCY_LABEL: Record<AuditFrequency, string> = {
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  BIANNUAL: 'Every 6 months',
  ANNUAL: 'Yearly',
}
export const FREQUENCIES = Object.keys(FREQUENCY_LABEL) as AuditFrequency[]

export const LEVEL_LABEL: Record<ComplianceLevel, string> = {
  COMPLIANT: 'Compliant',
  PARTIALLY_COMPLIANT: 'Partially compliant',
  NOT_COMPLIANT: 'Not compliant',
}

export function levelVariant(level: ComplianceLevel | null): BadgeProps['variant'] {
  if (level === 'COMPLIANT') return 'success'
  if (level === 'PARTIALLY_COMPLIANT') return 'warning'
  if (level === 'NOT_COMPLIANT') return 'destructive'
  return 'muted'
}

export function statusVariant(status: AuditStatus, state: AuditState | null = null): BadgeProps['variant'] {
  if (status === 'COMPLETED') return 'success'
  if (status === 'MISSED') return 'destructive'
  if (status === 'CANCELLED') return 'muted'
  if (state === 'OVERDUE') return 'warning'
  return 'info'
}

/** The status shown on a row: open audits past their due date say Overdue. */
export function statusText(status: AuditStatus, state: AuditState | null): string {
  if ((status === 'DUE' || status === 'IN_PROGRESS') && state === 'OVERDUE') return 'Overdue'
  return STATUS_LABEL[status]
}

/** "3 days", "Due today", "2 days late". */
export function remainingText(daysToDue: number | null, state: AuditState | null): string {
  if (daysToDue === null) return ''
  if (state === 'OVERDUE') return `${-daysToDue} day${daysToDue === -1 ? '' : 's'} late`
  if (daysToDue === 0) return 'Due today'
  return `${daysToDue} day${daysToDue === 1 ? '' : 's'}`
}

/** "2026-11" → "Nov 26". */
export function shortMonth(month: string): string {
  const [y = 1970, m = 1] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1))
    .toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' })
    .replace(' ', " '")
}

/** Initials for a person chip. */
export function initials(name: string | null | undefined): string {
  if (!name?.trim()) return '?'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}
