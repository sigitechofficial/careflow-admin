/** Matches backend audit.AuditEventType — used for filters and display. */
export const AUDIT_EVENT_TYPES = [
  'VIEW',
  'CREATE',
  'UPDATE',
  'DELETE',
  'EXPORT',
  'SECURITY',
  'SYSTEM',
] as const

export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number]

export function auditEventTypeLabel(type: AuditEventType): string {
  switch (type) {
    case 'VIEW':
      return 'View'
    case 'CREATE':
      return 'Create'
    case 'UPDATE':
      return 'Update'
    case 'DELETE':
      return 'Delete'
    case 'EXPORT':
      return 'Export'
    case 'SECURITY':
      return 'Security'
    case 'SYSTEM':
      return 'System'
    default:
      return type
  }
}

export function auditEventTypeDescription(type: AuditEventType): string {
  switch (type) {
    case 'VIEW':
      return 'Opened or read data without changing it'
    case 'CREATE':
      return 'Created a new record'
    case 'UPDATE':
      return 'Changed an existing record'
    case 'DELETE':
      return 'Archived, removed, or cleared a record'
    case 'EXPORT':
      return 'Exported or downloaded data'
    case 'SECURITY':
      return 'Login, permissions, or account security'
    case 'SYSTEM':
      return 'Automatic system action (no user)'
    default:
      return ''
  }
}

export function resolveAuditEventTypeFallback(
  action: string,
  metadata?: Record<string, unknown> | null,
): AuditEventType {
  if (metadata?.autoEndDate === true) return 'SYSTEM'
  const a = action.toLowerCase()
  if (a.includes('export') || a.includes('exported')) return 'EXPORT'
  if (
    a.includes('login') ||
    a.includes('logout') ||
    a.includes('password') ||
    a.includes('permission') ||
    a.startsWith('role_')
  ) {
    return 'SECURITY'
  }
  if (a.includes('viewed') || a.endsWith('_view') || a.includes('downloaded')) return 'VIEW'
  if (a.includes('deleted') || a.includes('archived') || a.includes('cleared')) return 'DELETE'
  if (a.includes('created') || a.includes('added') || a.includes('registered')) return 'CREATE'
  return 'UPDATE'
}
