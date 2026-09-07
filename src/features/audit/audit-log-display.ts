import type { AuditLogContext, AuditLogRow } from '@/features/audit/api/audit-logs.api'
import {
  auditEventTypeLabel,
  resolveAuditEventTypeFallback,
  type AuditEventType,
} from '@/features/audit/audit-event-types'

export function auditActorLabel(user: AuditLogRow['user']): string {
  if (!user) return 'System'
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return name || user.email || 'User'
}

export function formatAuditAction(action: string): string {
  return action.replace(/[._]/g, ' ')
}

function resolveServiceUserId(row: AuditLogRow): string | null {
  if (row.context?.serviceUserId) return row.context.serviceUserId
  const meta = row.metadata ?? {}
  if (typeof meta.serviceUserId === 'string' && meta.serviceUserId) {
    return meta.serviceUserId
  }
  const nv = row.newValues ?? {}
  const ov = row.oldValues ?? {}
  if (typeof nv.serviceUserId === 'string' && nv.serviceUserId) return nv.serviceUserId
  if (typeof ov.serviceUserId === 'string' && ov.serviceUserId) return ov.serviceUserId
  if (row.recordType === 'ServiceUser' && row.recordId) return row.recordId
  if (row.recordType === 'MedicationChart' && row.recordId) return row.recordId
  return null
}

function pickSubject(row: AuditLogRow): string | null {
  if (row.context?.subject) return row.context.subject
  const meta = row.metadata ?? {}
  if (typeof meta.medicationName === 'string' && meta.medicationName.trim()) {
    return meta.medicationName.trim()
  }
  if (typeof meta.observationTypeName === 'string') {
    const typeName = meta.observationTypeName.trim()
    const value =
      typeof meta.valueLabel === 'string' && meta.valueLabel.trim()
        ? meta.valueLabel.trim()
        : null
    return value ? `${typeName}: ${value}` : typeName
  }
  const snap = row.newValues ?? row.oldValues ?? {}
  if (typeof snap.medicationName === 'string' && snap.medicationName.trim()) {
    return snap.medicationName.trim()
  }
  const obsType = snap.observationType as { name?: string } | undefined
  if (obsType?.name && snap.numericValue != null) {
    const unit = typeof snap.unit === 'string' && snap.unit.trim() ? snap.unit.trim() : ''
    return unit
      ? `${obsType.name}: ${snap.numericValue} ${unit}`
      : `${obsType.name}: ${snap.numericValue}`
  }
  if (obsType?.name) return obsType.name
  if (row.action.startsWith('location.')) {
    if (typeof snap.name === 'string' && snap.name.trim()) return snap.name.trim()
    const parts = [snap.zoneName, snap.branchName, snap.areaName, snap.postcode]
      .filter((v): v is string => typeof v === 'string' && Boolean(v.trim()))
      .map(v => v.trim())
    if (parts.length) return parts.join(' / ')
  }
  return null
}

const EVENT_LABELS: Record<string, string> = {
  service_user_observation_created: 'Recorded observation',
  service_user_observation_deleted: 'Removed observation',
  service_user_profile_viewed: 'Opened profile',
  medication_chart_viewed: 'Opened MAR chart',
  medication_restored: 'Restored medication',
  'location.zone.created': 'Created zone',
  'location.zone.updated': 'Updated zone',
  'location.branch.created': 'Created branch',
  'location.branch.updated': 'Updated branch',
  'location.branch.deleted': 'Deleted branch',
  'location.area.created': 'Created area',
  'location.area.updated': 'Updated area',
  'location.area.deleted': 'Deleted area',
  'location.area.postcodes.updated': 'Updated area postcodes',
  'location.service_user.assigned': 'Assigned service user location',
  'location.employee.assigned': 'Assigned employee location',
}

function eventLabel(row: AuditLogRow): string {
  if (row.context?.eventLabel) return row.context.eventLabel
  return EVENT_LABELS[row.action] ?? formatAuditAction(row.action)
}

function auditSummaryFallback(row: AuditLogRow): string {
  if (row.description?.trim()) return row.description.trim()
  const meta = row.metadata ?? {}
  if (meta.autoEndDate === true) {
    return 'Prescription ended automatically (end date passed)'
  }
  if (meta.restored === true || row.action === 'medication_restored') {
    const med = pickSubject(row)
    return med ? `Restored ${med} from archive` : 'Medication restored from archive'
  }
  const subject = pickSubject(row)
  const label = eventLabel(row)
  if (subject) return `${label} — ${subject}`
  return label
}

export function auditRowEventType(row: AuditLogRow): AuditEventType {
  if (row.eventType) return row.eventType
  if (row.context?.eventType) return row.context.eventType
  return resolveAuditEventTypeFallback(row.action, row.metadata)
}

export function auditRowContext(row: AuditLogRow): AuditLogContext {
  if (row.context) return row.context
  const serviceUserId = resolveServiceUserId(row)
  const subject = pickSubject(row)
  const label = eventLabel(row)
  return {
    serviceUserId,
    serviceUserName: null,
    subject,
    eventLabel: label,
    summary: auditSummaryFallback(row),
    eventType: auditRowEventType(row),
  }
}

export function auditSummary(row: AuditLogRow): string {
  return auditRowContext(row).summary
}

/** @deprecated Use auditEventTypeLabel(auditRowEventType(row)) */
export function auditKindLabel(eventType: AuditEventType): string {
  return auditEventTypeLabel(eventType)
}

export function isLocalAuditIp(ip: string): boolean {
  const n = ip.trim()
  return n === '::1' || n === '127.0.0.1' || n === '::ffff:127.0.0.1'
}

/** Always show the stored IP; annotate loopback addresses used in local development. */
export function formatAuditIp(ip: string | null | undefined): string {
  if (!ip?.trim()) return '—'
  const n = ip.trim()
  if (isLocalAuditIp(n)) return `${n} (local dev)`
  return n
}

export function auditItemHref(
  row: AuditLogRow,
  ctx: AuditLogContext,
): '/service-users/$serviceUserId/medication' | '/service-users/$serviceUserId/observations' | null {
  if (!ctx.serviceUserId || !ctx.subject) return null
  if (row.module === 'OBSERVATION' || row.recordType === 'ServiceUserObservation') {
    return '/service-users/$serviceUserId/observations'
  }
  if (row.module === 'MEDICATION' || row.recordType === 'ServiceUserMedication') {
    return '/service-users/$serviceUserId/medication'
  }
  return null
}
