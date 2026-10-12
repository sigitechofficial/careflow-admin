import type {
  ComplaintOutcome,
  ComplaintSeverity,
  FeedbackChannel,
  FeedbackFromKind,
  FeedbackRow,
  FeedbackStatus,
} from '@/features/complaints/types'

export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  RECEIVED: 'Received',
  ACKNOWLEDGED: 'Acknowledged',
  INVESTIGATING: 'Investigating',
  RESPONDED: 'Responded',
  CLOSED: 'Closed',
}

export const FEEDBACK_FROM_LABEL: Record<FeedbackFromKind, string> = {
  SERVICE_USER: 'Service user',
  FAMILY: 'Family / next of kin',
  PROFESSIONAL: 'Professional (GP, social worker…)',
  STAFF: 'Staff member',
  PUBLIC: 'Member of the public',
  ANONYMOUS: 'Anonymous',
}

export const FEEDBACK_CHANNEL_LABEL: Record<FeedbackChannel, string> = {
  PHONE: 'Phone',
  EMAIL: 'Email',
  LETTER: 'Letter / card',
  IN_PERSON: 'In person',
  PORTAL: 'Portal / online',
  SURVEY: 'Survey',
  OTHER: 'Other',
}

export const COMPLAINT_SEVERITY_LABEL: Record<ComplaintSeverity, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
}

export const COMPLAINT_OUTCOME_LABEL: Record<ComplaintOutcome, string> = {
  UPHELD: 'Upheld',
  PARTIALLY_UPHELD: 'Partially upheld',
  NOT_UPHELD: 'Not upheld',
  WITHDRAWN: 'Withdrawn',
}

export const COMPLAINT_CATEGORIES = [
  'Care quality',
  'Missed / late visit',
  'Staff conduct / attitude',
  'Communication',
  'Medication',
  'Dignity & respect',
  'Billing / charges',
  'Safeguarding concern',
  'Other',
]

export const COMPLIMENT_CATEGORIES = [
  'Individual staff member',
  'Team',
  'Quality of care',
  'Communication',
  'Office / management',
  'Other',
]

export const FEEDBACK_EVENT_LABEL: Record<string, string> = {
  RECORDED: 'Recorded',
  UPDATED: 'Details updated',
  ACKNOWLEDGED: 'Acknowledged',
  INVESTIGATION_STARTED: 'Investigation started',
  RESPONDED: 'Response sent',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
  SHARED: 'Shared with staff',
  NOTE: 'Note',
  DELETED: 'Deleted',
}

export function feedbackStatusVariant(status: FeedbackStatus) {
  if (status === 'CLOSED') return 'muted' as const
  if (status === 'RESPONDED') return 'success' as const
  if (status === 'RECEIVED') return 'warning' as const
  return 'info' as const
}

export function severityVariant(severity: ComplaintSeverity | null) {
  if (severity === 'HIGH') return 'destructive' as const
  if (severity === 'MEDIUM') return 'warning' as const
  return 'muted' as const
}

/** Who it came from, as one line. */
export function feedbackFromText(row: FeedbackRow): string {
  if (row.fromKind === 'ANONYMOUS') return 'Anonymous'
  const name = row.fromServiceUser?.name ?? row.fromEmployee?.name ?? row.fromName
  return name ? `${name} (${FEEDBACK_FROM_LABEL[row.fromKind].split(' (')[0]})` : FEEDBACK_FROM_LABEL[row.fromKind]
}

/** Who it is about, as one line. */
export function feedbackAboutText(row: FeedbackRow): string {
  const parts = [row.aboutServiceUser?.name, ...row.aboutEmployees.map(e => e.name)].filter(Boolean)
  return parts.length ? parts.join(', ') : '—'
}
