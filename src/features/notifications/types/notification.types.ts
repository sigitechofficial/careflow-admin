export type NotificationType =
  | 'COMPLIANCE_EXPIRING'
  | 'COMPLIANCE_EXPIRED'
  | 'EMPLOYEE_DOCUMENT_UPLOADED'
  | 'EMPLOYEE_STATUS_CHANGED'
  | 'SERVICE_USER_UPDATED'
  | 'CARE_PLAN_REVIEW_DUE'
  | 'MEDICATION_ALERT'
  | 'INCIDENT_REPORTED'
  | 'SCHEDULE_UNALLOCATED_VISIT'
  | 'REPORT_READY'
  | 'SECURITY_ALERT'
  | 'SYSTEM_MESSAGE'
  | 'SUPERVISION_DUE'
  | 'POLICY_ACKNOWLEDGEMENT_DUE'
  | 'POLICY_ACKNOWLEDGEMENT_SUMMARY'

export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CRITICAL'

export type NotificationModule =
  | 'AUTH'
  | 'EMPLOYEE'
  | 'EMPLOYEE_COMPLIANCE'
  | 'SERVICE_USER'
  | 'SERVICE_CARE'
  | 'SCHEDULING'
  | 'REPORT'
  | 'SECURITY'
  | 'SYSTEM'
  | 'HR'
  | 'POLICY'

export type NotificationListItem = {
  id: string
  title: string
  message: string
  type: NotificationType
  module: NotificationModule
  severity: NotificationSeverity
  recordType: string | null
  recordId: string | null
  metadata: Record<string, unknown>
  createdAt: string
  readAt: string | null
  dismissedAt: string | null
}

export type NotificationNewEvent = NotificationListItem & {
  playSound: boolean
}

export type NotificationPreferenceRow = {
  type: NotificationType
  inAppEnabled: boolean
  soundEnabled: boolean
  emailEnabled: boolean
  smsEnabled: boolean
  pushEnabled: boolean
}

export type NotificationUnreadEnvelope = { count: number }
