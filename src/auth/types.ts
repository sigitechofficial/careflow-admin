export type RoleId = 'super_admin' | 'admin' | 'manager' | 'staff' | 'auditor' | 'temporary_inspector'

/** SPA + CareAdmin Nest (`/auth/me` permission keys). Legacy `employee.*` kept for demo-only roles. */
export type Permission =
  | 'users.read'
  | 'users.write'
  | 'users.create'
  | 'schedule.read'
  | 'schedule.write'
  | 'employee.read'
  | 'employee.write'
  | 'employees.read'
  | 'employees.create'
  | 'employees.update'
  | 'employees.delete'
  | 'employees.status.update'
  | 'employees.documents.read'
  | 'employees.documents.upload'
  | 'employees.documents.delete'
  | 'employees.compliance.read'
  | 'employees.compliance.update'
  | 'employees.reports.read'
  | 'lookups.read'
  | 'roles.manage'
  | 'permissions.manage'
  | 'audit.read'
  | 'audit_logs.read'
  | 'incidents.read'
  | 'incidents.write'
  | 'security.admin'
  | 'sso.configure'
  | 'temporary_inspector.session'

export interface AuthUser {
  id: string
  email: string
  displayName: string
  role: RoleId
  permissions: Permission[]
  jobTitle?: string
  avatarUrl?: string
}

export interface AuthSession {
  id: string
  startedAt: number
  lastSeenAt: number
  ip: string
  userAgent: string
  label: string
  current: boolean
}

export interface TrustedDevice {
  id: string
  name: string
  browser: string
  os: string
  ip: string
  lastSeenAt: number
  trusted: boolean
}

export interface IpRule {
  id: string
  cidr: string
  note?: string
  enabled: boolean
}

export interface SsoProvider {
  id: 'microsoft' | 'google' | 'okta'
  name: string
  enabled: boolean
  clientIdMasked: string
}

export interface LockedAccount {
  userId: string
  email: string
  failedAttempts: number
  lockedUntil: number | null
  reason: string
}

export interface AuditEvent {
  id: string
  at: number
  actorId: string | null
  actorEmail: string | null
  action: string
  resource?: string
  ip: string
  meta?: Record<string, unknown>
}
