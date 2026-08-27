export type RoleId = 'super_admin' | 'admin' | 'manager' | 'staff' | 'auditor' | 'temporary_inspector' | 'service_user'

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
  | 'employees.compliance.create'
  | 'employees.compliance.update'
  | 'employees.compliance.delete'
  | 'employees.compliance.verify'
  | 'employees.compliance.reject'
  | 'employees.compliance.documents.upload'
  | 'employees.compliance.documents.download'
  | 'employees.compliance.documents.delete'
  | 'employees.reports.read'
  | 'hr.read'
  | 'hr.profile.create'
  | 'hr.profile.update'
  | 'hr.documents.upload'
  | 'hr.documents.delete'
  | 'hr.vacancies.read'
  | 'hr.vacancies.create'
  | 'hr.vacancies.update'
  | 'hr.candidates.read'
  | 'hr.candidates.create'
  | 'hr.candidates.update'
  | 'hr.candidates.convert'
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
  | 'service_users.visit_plan.read'
  | 'service_users.visit_plan.write'
  | 'service_users.visit_plan.activate'
  | 'scheduling.generate_from_visit_plan'
  | 'schedules.build'
  | 'scheduled_visits.read'
  | 'scheduled_visits.create'
  | 'scheduled_visits.update'
  | 'scheduled_visits.delete'
  | 'scheduled_visits.status.update'
  | 'job_allocations.confirm'
  | 'service_users.initial_assessment.read'
  | 'service_users.initial_assessment.create'
  | 'service_users.initial_assessment.update'
  | 'service_users.initial_assessment.delete'
  | 'service_users.initial_assessment.submit'
  | 'service_users.initial_assessment.review'
  | 'service_users.initial_assessment.export'
  | 'service_users.assessments.read'
  | 'service_users.assessments.create'
  | 'service_users.assessments.link'
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
  | 'service_users.flash_message.read'
  | 'service_users.flash_message.update'
  | 'service_users.flash_message.delete'
  | 'service_users.flash_message.history.read'
  | 'service_users.body_map.read'
  | 'service_users.body_map.create'
  | 'service_users.body_map.update'
  | 'service_users.body_map.review'
  | 'service_users.body_map.close'
  | 'service_users.body_map.export'
  | 'lookups.read'
  | 'lookups.manage'
  | 'task_catalogue.read'
  | 'task_catalogue.manage'
  | 'care_pathway.read'
  | 'form_selection.read'
  | 'form_selection.update'
  | 'form_builder.read'
  | 'form_builder.create'
  | 'form_builder.update'
  | 'form_builder.delete'
  | 'form_builder.publish'
  | 'care_plan_text.read'
  | 'care_plan_text.create'
  | 'care_plan_text.update'
  | 'care_plan_text.delete'
  | 'care_plan_text.preview'
  | 'pathway_checklists.read'
  | 'pathway_checklists.create'
  | 'pathway_checklists.update'
  | 'pathway_checklists.delete'
  | 'pathway_checklists.items.manage'
  | 'pathway_actions.read'
  | 'pathway_actions.create'
  | 'pathway_actions.update'
  | 'pathway_actions.delete'
  | 'pathway_actions.checklists.manage'
  | 'picture_gallery.read'
  | 'picture_gallery.upload'
  | 'picture_gallery.update'
  | 'picture_gallery.delete'
  | 'settings.company.read'
  | 'settings.company.update'
  | 'compliance_types.read'
  | 'compliance_types.create'
  | 'compliance_types.update'
  | 'compliance_types.delete'
  | 'compliance_requirements.read'
  | 'compliance_requirements.create'
  | 'compliance_requirements.update'
  | 'compliance_requirements.delete'
  | 'roles.manage'
  | 'permissions.manage'
  | 'audit.read'
  | 'audit_logs.read'
  | 'audit_logs.delete'
  | 'incidents.read'
  | 'incidents.write'
  | 'incidents.create'
  | 'incidents.update'
  | 'incidents.review'
  | 'incidents.investigate'
  | 'incidents.assign'
  | 'incidents.manage_actions'
  | 'incidents.close'
  | 'incidents.reopen'
  | 'incidents.delete'
  | 'incidents.view_confidential'
  | 'incidents.view_highly_confidential'
  | 'incidents.view_analytics'
  | 'incidents.manage_settings'
  | 'security.admin'
  | 'sso.configure'
  | 'temporary_inspector.session'
  | 'service_user.portal.session'
  | 'service_users.portal.read'
  | 'service_users.portal.manage'
  | 'notifications.read'
  | 'notifications.update'
  | 'notifications.dismiss'
  | 'notifications.preferences.read'
  | 'notifications.preferences.update'
  | 'notifications.create'
  | 'billing.pay_cards.read'
  | 'billing.pay_cards.manage'
  | 'billing.charge_cards.read'
  | 'billing.charge_cards.manage'
  | 'billing.funding_contracts.read'
  | 'billing.invoice_templates.read'
  | 'billing.invoice_templates.manage'
  | 'billing.visit_reconciliations.read'
  | 'billing.visit_reconciliations.manage'
  | 'billing.payroll_runs.read'
  | 'billing.payroll_runs.manage'
  | 'billing.employee_payouts.read'
  | 'billing.employee_payouts.manage'
  | 'billing.invoice_runs.read'
  | 'billing.invoice_runs.manage'
  | 'billing.payments.read'
  | 'billing.payments.manage'
  | 'ecm.read'
  | 'ecm.monitor'
  | 'ecm.exceptions.manage'
  | 'ecm.attendance.amend'
  | 'ecm.reports.export'
  | 'ecm.settings.manage'
  | 'payroll.settings.read'
  | 'payroll.settings.manage'
  | 'payroll.employees.read'
  | 'payroll.employees.manage'
  | 'payroll.periods.read'
  | 'payroll.periods.manage'
  | 'payroll.runs.read'
  | 'payroll.runs.manage'
  | 'learning.dashboard.read'
  | 'learning.categories.read'
  | 'learning.categories.manage'
  | 'learning.courses.read'
  | 'learning.courses.manage'
  | 'learning.assignments.read'
  | 'learning.assignments.manage'
  | 'learning.compliance.read'
  | 'learning.compliance.export'
  | 'learning.training_events.read'
  | 'learning.training_events.manage'
  | 'learning.certificates.read'
  | 'learning.certificates.manage'
  | 'learning.external_training.read'
  | 'learning.external_training.manage'
  | 'learning.reports.read'
  | 'learning.reports.export'
  | 'learning.settings.manage'
  | 'learning.me.read'
  | 'learning.me.progress'

export interface AuthUser {
  id: string
  email: string
  displayName: string
  role: RoleId
  permissions: Permission[]
  accountKind?: 'user' | 'temporary_inspector' | 'service_user'
  serviceUserId?: string
  firstName?: string
  lastName?: string
  preferredName?: string | null
  profilePhotoUrl?: string | null
  jobTitle?: string
  avatarUrl?: string
  /** null/undefined = unrestricted; string[] = header location options ACL */
  assignedLocationIds?: string[] | null
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

export type { BackendMeUser, LoginHistoryRow } from '@/features/auth/api'
