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
  | 'service_users.read'
  | 'service_users.create'
  | 'service_users.update'
  | 'service_users.delete'
  | 'service_users.status.update'
  | 'service_users.contacts.read'
  | 'service_users.contacts.create'
  | 'service_users.contacts.update'
  | 'service_users.contacts.delete'
  | 'service_users.address.read'
  | 'service_users.address.update'
  | 'service_users.assignments.read'
  | 'service_users.assignments.update'
  | 'service_users.photos.upload'
  | 'service_users.photos.delete'
  | 'service_users.inventory.read'
  | 'service_users.inventory.create'
  | 'service_users.inventory.update'
  | 'service_users.inventory.delete'
  | 'service_users.allergies.read'
  | 'service_users.allergies.create'
  | 'service_users.allergies.update'
  | 'service_users.allergies.delete'
  | 'service_users.documents.read'
  | 'service_users.documents.update'
  | 'service_users.documents.delete'
  | 'service_users.absences.read'
  | 'service_users.absences.create'
  | 'service_users.absences.update'
  | 'service_users.absences.delete'
  | 'service_users.calendar.read'
  | 'service_users.calendar.create'
  | 'service_users.calendar.update'
  | 'service_users.calendar.delete'
  | 'service_users.calendar.status.update'
  | 'service_users.calendar.export'
  | 'service_users.calendar_event_types.read'
  | 'service_users.calendar_event_types.create'
  | 'service_users.calendar_event_types.update'
  | 'service_users.calendar_event_types.delete'
  | 'service_users.dom_care.read'
  | 'service_users.dom_care.update'
  | 'service_users.initial_assessment.read'
  | 'service_users.initial_assessment.update'
  | 'service_users.funding.read'
  | 'service_users.funding.update'
  | 'service_users.funding.create'
  | 'service_users.funding.delete'
  | 'service_users.funding.status.update'
  | 'service_users.funding.approve'
  | 'service_users.funding.set_primary'
  | 'funding_types.read'
  | 'funding_types.create'
  | 'funding_types.update'
  | 'funding_types.delete'
  | 'funders.read'
  | 'funders.create'
  | 'funders.update'
  | 'funders.delete'
  | 'service_users.live_in_profile.read'
  | 'service_users.live_in_profile.create'
  | 'service_users.live_in_profile.update'
  | 'service_users.live_in_profile.delete'
  | 'service_users.live_in_profile.status.update'
  | 'service_users.live_in_profile.carers.read'
  | 'service_users.live_in_profile.carers.manage'
  | 'service_users.live_in_profile.documents.read'
  | 'service_users.live_in_profile.documents.upload'
  | 'service_users.live_in_profile.documents.download'
  | 'service_users.live_in_profile.documents.delete'
  | 'service_users.live_in_profile.lookups.read'
  | 'service_users.lookups.read'
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
  | 'notifications.read'
  | 'notifications.update'
  | 'notifications.dismiss'
  | 'notifications.preferences.read'
  | 'notifications.preferences.update'
  | 'notifications.create'

export interface AuthUser {
  id: string
  email: string
  displayName: string
  role: RoleId
  permissions: Permission[]
  firstName?: string
  lastName?: string
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
