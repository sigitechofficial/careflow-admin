export type IncidentStatus =
  | 'REPORTED'
  | 'AWAITING_REVIEW'
  | 'UNDER_INVESTIGATION'
  | 'ACTIONS_REQUIRED'
  | 'AWAITING_CLOSURE'
  | 'CLOSED'
  | 'REOPENED'

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type IncidentPrivacyLevel = 'NORMAL' | 'RESTRICTED' | 'HIGHLY_CONFIDENTIAL'

export type IncidentSubtypeOption = {
  id: string
  key: string
  label: string
  sortOrder: number
}

export type IncidentCategoryOption = {
  id: string
  key: string
  label: string
  description: string | null
  sortOrder: number
  subtypes: IncidentSubtypeOption[]
}

export type IncidentListItem = {
  id: string
  referenceNumber: string
  status: IncidentStatus
  statusLabel: string
  severity: IncidentSeverity
  severityLabel: string
  privacyLevel: IncidentPrivacyLevel
  shareWithHandover: boolean
  category: { id: string; key: string; label: string }
  subtype: { id: string; key: string; label: string } | null
  occurredAt: string
  reportedAt: string
  locationId: string | null
  specificArea: string | null
  primaryServiceUserId: string | null
  primaryEmployeeId: string | null
  primaryPersonKind: IncidentPersonKind | null
  primaryPersonName: string | null
  affectedPersonKinds: IncidentPersonKind[]
  scheduledJobId: string | null
  reportedById: string | null
  ownerId: string | null
  description: string
  contextBefore: string | null
  contextAfter: string | null
  immediateActions: string | null
  immediateActionCodes: string[]
  injuryOccurred: boolean
  injuryDetails: string | null
  peopleInvolved: string | null
  whoInformedKeys: string[]
  carerSafeguardingConcern: boolean | null
  followUpRequired: boolean
  emergencyServicesDetails: string | null
  familyInformed: boolean
  carerNotes: string | null
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

export type IncidentTimelineEvent = {
  at: string
  kind: string
  detail: string
  byId: string | null
  /** Display name of the user who performed the action (when known). */
  byName?: string | null
}

export type IncidentPreventability = 'YES' | 'NO' | 'PARTIALLY' | 'UNKNOWN'

export type IncidentReview = {
  id: string
  incidentId: string
  confirmedSeverity: IncidentSeverity | null
  investigationRequired: boolean | null
  safeguardingConcern: boolean | null
  possibleAbuseOrNeglect: boolean | null
  furtherMedicalAttention: boolean | null
  externalNotificationRequired: boolean | null
  escalationRequired: boolean | null
  managementNotes: string | null
  reviewedById: string | null
  reviewedAt: string | null
  updatedAt: string
}

export type IncidentInvestigationScope = 'INTERNAL' | 'EXTERNAL'
export type IncidentExternalInvestigationType = 'POLICE' | 'AGENCY' | 'COMBINED'

export type IncidentInvestigation = {
  id: string
  incidentId: string
  investigationScope: IncidentInvestigationScope | null
  externalType: IncidentExternalInvestigationType | null
  whatHappened: string | null
  whyHappened: string | null
  contributingFactors: string[]
  rootCause: string | null
  preventable: IncidentPreventability | null
  conclusion: string | null
  completedAt: string | null
  updatedAt: string
}

export type IncidentCarerSuspension = {
  id: string
  incidentId: string
  employeeId: string
  reason: string
  suspendFrom: string
  suspendTo: string
  suspendedAt: string
  createdAt: string
}

export type IncidentCarerCourseRecommendation = {
  id: string
  incidentId: string
  employeeId: string
  courseId: string
  courseTitle: string | null
  courseCode: string | null
  learningAssignmentId: string | null
  reason: string | null
  dueAt: string | null
  recommendedAt: string
  createdAt: string
}

export type IncidentPersonKind =
  | 'SERVICE_USER'
  | 'EMPLOYEE'
  | 'FAMILY'
  | 'VISITOR'
  | 'HEALTHCARE_PROFESSIONAL'
  | 'CONTRACTOR'
  | 'OTHER'

export type IncidentInjurySeverity = 'MINOR' | 'MODERATE' | 'SERIOUS' | 'FATAL'

export type IncidentInjury = {
  id: string
  incidentId: string
  personKind: IncidentPersonKind
  personServiceUserId: string | null
  personEmployeeId: string | null
  personName: string | null
  injurySeverity: IncidentInjurySeverity
  injuryType: string
  bodyRegion: string | null
  side: string | null
  notes: string | null
  measurements: string | null
  bodyMapRecordId: string | null
  createdAt: string
}

export type IncidentWitness = {
  id: string
  incidentId: string
  personKind: IncidentPersonKind
  personName: string | null
  statement: string | null
  statementDate: string | null
  createdAt: string
}

export type IncidentRelatedRecordType =
  | 'CARE_PLAN'
  | 'RISK_ASSESSMENT'
  | 'MEDICATION'
  | 'BODY_MAP'
  | 'DAILY_NOTES'
  | 'VISIT'
  | 'BEHAVIOUR'
  | 'OTHER'

export type IncidentRelatedRecordStatus = 'REVIEW_REQUIRED' | 'UPDATED'

export type IncidentRelatedCareRecord = {
  id: string
  incidentId: string
  recordType: IncidentRelatedRecordType
  referenceLabel: string
  externalId: string | null
  status: IncidentRelatedRecordStatus
  note: string | null
  updatedByLabel: string | null
  resolvedAt: string | null
  createdAt: string
}

export type IncidentRelatedLink = {
  linkId: string
  note: string | null
  relatedIncidentId: string
  referenceNumber: string
  categoryLabel: string | null
  severity: IncidentSeverity | null
  status: IncidentStatus | null
  occurredAt: string | null
  restricted: boolean
}

export type IncidentAttachmentItem = {
  id: string
  incidentId: string
  category: string
  originalName: string
  mimeType: string
  fileSize: number
  caption: string | null
  createdAt: string
  downloadUrl: string
}

export type ServiceUserIncidentHistory = {
  total: number
  trends: { level: 'info' | 'warning'; label: string }[]
  incidents: {
    id: string
    referenceNumber: string
    severity: IncidentSeverity
    severityLabel: string
    status: IncidentStatus
    occurredAt: string
    categoryLabel: string
    subtypeLabel: string | null
  }[]
}

export type IncidentOutcome = {
  id: string
  incidentId: string
  finalOutcome: string | null
  lessonsLearned: string | null
  preventability: IncidentPreventability | null
  changesMade: string[]
  informationSharedWithStaff: boolean | null
  serviceUserInformed: boolean | null
  nokInformed: boolean | null
  finalManagementComments: string | null
  updatedAt: string
}

export type UpsertIncidentOutcomeInput = {
  finalOutcome?: string
  lessonsLearned?: string
  preventability?: IncidentPreventability
  changesMade?: string[]
  informationSharedWithStaff?: boolean
  serviceUserInformed?: boolean
  nokInformed?: boolean
  finalManagementComments?: string
}

export const INCIDENT_OUTCOME_CHANGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'CARE_PLAN', label: 'Care plan' },
  { value: 'RISK_ASSESSMENT', label: 'Risk assessment' },
  { value: 'POLICY', label: 'Policy' },
  { value: 'PROCEDURE', label: 'Procedure' },
  { value: 'STAFF_TRAINING', label: 'Staff training' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'STAFFING', label: 'Staffing' },
  { value: 'ENVIRONMENT', label: 'Environment' },
  { value: 'OTHER', label: 'Other' },
]

export type IncidentAnalytics = {
  totals: {
    total: number
    open: number
    closed: number
    awaitingReview: number
    underInvestigation: number
    highCritical: number
    falls: number
    medication: number
    nearMiss: number
    involvingEmployees: number
    overdueActions: number
    repeatServiceUsers: number
    averageClosureHours: number | null
  }
  bySeverity: Record<IncidentSeverity, number>
  byStatus: Partial<Record<IncidentStatus, number>>
  byCategory: { key: string; label: string; count: number }[]
  bySubtype: { key: string; label: string; count: number }[]
  byLocation: { id: string; name: string; count: number }[]
  byServiceUser: { id: string; name: string; count: number }[]
  byTimeOfDay: { key: string; label: string; count: number }[]
  byDayOfWeek: { day: string; count: number }[]
  injuryTypes: { type: string; count: number }[]
  monthlyTrend: { month: string; count: number }[]
  warnings: { level: 'info' | 'warning'; label: string }[]
}

export type IncidentAnalyticsFilters = {
  dateFrom?: string
  dateTo?: string
  categoryId?: string
  severity?: IncidentSeverity
  status?: IncidentStatus
  serviceUserId?: string
  locationId?: string
}

export type IncidentDetail = IncidentListItem & {
  history: IncidentTimelineEvent[]
  review: IncidentReview | null
  investigation: IncidentInvestigation | null
  outcome: IncidentOutcome | null
  actions: IncidentAction[]
  carerSuspensions: IncidentCarerSuspension[]
  courseRecommendations: IncidentCarerCourseRecommendation[]
  injuries: IncidentInjury[]
  witnesses: IncidentWitness[]
  relatedCareRecords: IncidentRelatedCareRecord[]
  attachmentCount: number
  relatedIncidentCount: number
  closedAt: string | null
  closedById: string | null
}

export const INCIDENT_PERSON_KIND_OPTIONS: { value: IncidentPersonKind; label: string }[] = [
  { value: 'SERVICE_USER', label: 'Service User' },
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'FAMILY', label: 'Family Member' },
  { value: 'VISITOR', label: 'Visitor' },
  { value: 'HEALTHCARE_PROFESSIONAL', label: 'Healthcare Professional' },
  { value: 'CONTRACTOR', label: 'Contractor' },
  { value: 'OTHER', label: 'Other' },
]

export const INCIDENT_INJURY_SEVERITY_OPTIONS: { value: IncidentInjurySeverity; label: string }[] = [
  { value: 'MINOR', label: 'Minor' },
  { value: 'MODERATE', label: 'Moderate' },
  { value: 'SERIOUS', label: 'Serious' },
  { value: 'FATAL', label: 'Fatal' },
]

export const INCIDENT_RELATED_RECORD_TYPE_OPTIONS: { value: IncidentRelatedRecordType; label: string }[] = [
  { value: 'CARE_PLAN', label: 'Care Plan' },
  { value: 'RISK_ASSESSMENT', label: 'Risk Assessment' },
  { value: 'MEDICATION', label: 'Medication' },
  { value: 'BODY_MAP', label: 'Body Map' },
  { value: 'DAILY_NOTES', label: 'Daily Notes' },
  { value: 'VISIT', label: 'Visit' },
  { value: 'BEHAVIOUR', label: 'Behaviour' },
  { value: 'OTHER', label: 'Other' },
]

export type IncidentStats = {
  total: number
  open: number
  closedThisMonth: number
  overdueActions: number
  awaitingReview: number
  underInvestigation: number
  actionsRequired: number
  highOrCritical: number
  byStatus: Partial<Record<IncidentStatus, number>>
  bySeverity: Partial<Record<IncidentSeverity, number>>
}

export type IncidentActionPriority = 'LOW' | 'MEDIUM' | 'HIGH'
export type IncidentActionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type IncidentActionDisplayStatus = IncidentActionStatus | 'OVERDUE'

export type IncidentAction = {
  id: string
  incidentId: string
  title: string
  description: string | null
  priority: IncidentActionPriority
  status: IncidentActionStatus
  displayStatus: IncidentActionDisplayStatus
  isOverdue: boolean
  isMandatory: boolean
  dueDate: string | null
  assignedEmployeeId: string | null
  completionNotes: string | null
  completedById: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type MyActionItem = IncidentAction & { incidentReference: string }

export type CreateIncidentActionInput = {
  title: string
  description?: string
  priority?: IncidentActionPriority
  dueDate?: string
  assignedEmployeeId?: string
  isMandatory?: boolean
}

export type UpdateIncidentActionInput = Partial<
  Omit<CreateIncidentActionInput, 'assignedEmployeeId' | 'dueDate' | 'description'>
> & {
  status?: IncidentActionStatus
  description?: string | null
  dueDate?: string | null
  /** Null or empty string clears the assignee. */
  assignedEmployeeId?: string | null
}

export const INCIDENT_ACTION_STATUS_BADGE: Record<
  IncidentActionDisplayStatus,
  'muted' | 'info' | 'warning' | 'success' | 'destructive'
> = {
  NOT_STARTED: 'muted',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'muted',
  OVERDUE: 'destructive',
}

export const INCIDENT_ACTION_STATUS_LABELS: Record<IncidentActionDisplayStatus, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  OVERDUE: 'Overdue',
}

export type UpsertIncidentReviewInput = {
  confirmedSeverity?: IncidentSeverity
  investigationRequired?: boolean
  safeguardingConcern?: boolean
  possibleAbuseOrNeglect?: boolean
  furtherMedicalAttention?: boolean
  externalNotificationRequired?: boolean
  escalationRequired?: boolean
  managementNotes?: string
}

export type UpsertIncidentInvestigationInput = {
  investigationScope?: IncidentInvestigationScope
  externalType?: IncidentExternalInvestigationType | null
  whatHappened?: string
  whyHappened?: string
  contributingFactors?: string[]
  rootCause?: string
  preventable?: IncidentPreventability
  conclusion?: string
  markComplete?: boolean
}

export const INCIDENT_INVESTIGATION_SCOPE_OPTIONS: {
  value: IncidentInvestigationScope
  label: string
}[] = [
  { value: 'INTERNAL', label: 'Internal' },
  { value: 'EXTERNAL', label: 'External' },
]

export const INCIDENT_EXTERNAL_INVESTIGATION_TYPE_OPTIONS: {
  value: IncidentExternalInvestigationType
  label: string
}[] = [
  { value: 'POLICE', label: 'Police' },
  { value: 'AGENCY', label: 'Agency' },
  { value: 'COMBINED', label: 'Combined' },
]

export const INCIDENT_CONTRIBUTING_FACTOR_OPTIONS: { value: string; label: string }[] = [
  { value: 'CARE_PLAN', label: 'Care plan' },
  { value: 'RISK_ASSESSMENT', label: 'Risk assessment' },
  { value: 'STAFFING', label: 'Staffing' },
  { value: 'TRAINING', label: 'Training' },
  { value: 'COMMUNICATION', label: 'Communication' },
  { value: 'ENVIRONMENT', label: 'Environment' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'MEDICATION', label: 'Medication' },
  { value: 'HUMAN_ERROR', label: 'Human error' },
  { value: 'PROCEDURE_NOT_FOLLOWED', label: 'Procedure not followed' },
  { value: 'BEHAVIOURAL_TRIGGER', label: 'Behavioural trigger' },
  { value: 'HEALTH_DETERIORATION', label: 'Health deterioration' },
  { value: 'UNKNOWN', label: 'Unknown' },
  { value: 'OTHER', label: 'Other' },
]

export const INCIDENT_PREVENTABILITY_OPTIONS: { value: IncidentPreventability; label: string }[] = [
  { value: 'YES', label: 'Yes' },
  { value: 'NO', label: 'No' },
  { value: 'PARTIALLY', label: 'Partially' },
  { value: 'UNKNOWN', label: 'Unknown' },
]

export type IncidentListResponse = {
  items: IncidentListItem[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export type CreateIncidentInput = {
  categoryId: string
  subtypeId?: string
  occurredAt: string
  locationId?: string
  specificArea?: string
  primaryServiceUserId?: string
  primaryEmployeeId?: string
  primaryPersonKind?: IncidentPersonKind
  primaryPersonName?: string
  affectedPersonKinds?: IncidentPersonKind[]
  reporterEmployeeId?: string
  description: string
  contextBefore?: string
  contextAfter?: string
  immediateActions?: string
  immediateActionCodes?: string[]
  injuryOccurred?: boolean
  severity?: IncidentSeverity
  privacyLevel?: IncidentPrivacyLevel
  shareWithHandover?: boolean
}

export type IncidentListFilters = {
  search?: string
  status?: IncidentStatus
  severity?: IncidentSeverity
  categoryId?: string
  serviceUserId?: string
  locationId?: string
  openOnly?: boolean
  page?: number
  limit?: number
}

export const INCIDENT_SEVERITY_BADGE: Record<
  IncidentSeverity,
  'info' | 'warning' | 'destructive' | 'solid-destructive'
> = {
  LOW: 'info',
  MEDIUM: 'warning',
  HIGH: 'destructive',
  CRITICAL: 'solid-destructive',
}

export const INCIDENT_STATUS_BADGE: Record<
  IncidentStatus,
  'default' | 'info' | 'warning' | 'success' | 'muted' | 'destructive'
> = {
  REPORTED: 'info',
  AWAITING_REVIEW: 'warning',
  UNDER_INVESTIGATION: 'warning',
  ACTIONS_REQUIRED: 'destructive',
  AWAITING_CLOSURE: 'default',
  CLOSED: 'success',
  REOPENED: 'destructive',
}

/** Mirrors the backend workflow rules for UX (backend still enforces authoritatively). */
export const INCIDENT_STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  REPORTED: ['UNDER_INVESTIGATION', 'AWAITING_REVIEW'],
  AWAITING_REVIEW: ['UNDER_INVESTIGATION', 'ACTIONS_REQUIRED', 'AWAITING_CLOSURE'],
  UNDER_INVESTIGATION: ['AWAITING_CLOSURE', 'ACTIONS_REQUIRED'],
  ACTIONS_REQUIRED: ['UNDER_INVESTIGATION', 'AWAITING_CLOSURE'],
  AWAITING_CLOSURE: ['CLOSED', 'UNDER_INVESTIGATION', 'ACTIONS_REQUIRED'],
  CLOSED: ['UNDER_INVESTIGATION', 'REOPENED'],
  REOPENED: ['UNDER_INVESTIGATION', 'AWAITING_CLOSURE', 'ACTIONS_REQUIRED'],
}

/** Statuses from which moving to UNDER_INVESTIGATION is a re-investigate. */
export const REINVESTIGATE_FROM_STATUSES: IncidentStatus[] = [
  'CLOSED',
  'AWAITING_CLOSURE',
  'REOPENED',
]

export function isReinvestigateTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  return to === 'UNDER_INVESTIGATION' && REINVESTIGATE_FROM_STATUSES.includes(from)
}

export type IncidentWorkflowStage = 'raise' | 'investigate' | 'close' | 'outcome'

export const INCIDENT_WORKFLOW_STEPS: { id: IncidentWorkflowStage; label: string }[] = [
  { id: 'raise', label: 'Raise' },
  { id: 'investigate', label: 'Investigate' },
  { id: 'close', label: 'Close' },
  { id: 'outcome', label: 'Outcome' },
]

/** Map status (+ outcome) onto the Raise → Investigate → Close → Outcome stepper. */
export function incidentWorkflowStageIndex(
  status: IncidentStatus,
  hasFinalOutcome: boolean,
): number {
  if (status === 'REPORTED') return 0
  if (
    status === 'AWAITING_REVIEW' ||
    status === 'UNDER_INVESTIGATION' ||
    status === 'ACTIONS_REQUIRED' ||
    status === 'REOPENED'
  ) {
    return 1
  }
  if (status === 'AWAITING_CLOSURE') return hasFinalOutcome ? 3 : 2
  if (status === 'CLOSED') return 3
  return 0
}

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  REPORTED: 'Reported',
  AWAITING_REVIEW: 'Awaiting Review',
  UNDER_INVESTIGATION: 'Under Investigation',
  ACTIONS_REQUIRED: 'Actions Required',
  AWAITING_CLOSURE: 'Awaiting Closure',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
}

export const IMMEDIATE_ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: 'FIRST_AID', label: 'First aid provided' },
  { value: 'EMERGENCY_SERVICES', label: 'Emergency services contacted' },
  { value: 'GP_CONTACTED', label: 'GP contacted' },
  { value: 'MANAGER_CONTACTED', label: 'Manager contacted' },
  { value: 'FAMILY_INFORMED', label: 'Family / NOK informed' },
  { value: 'AREA_MADE_SAFE', label: 'Area made safe' },
  { value: 'MEDICATION_WITHHELD', label: 'Medication withheld' },
  { value: 'OTHER', label: 'Other' },
]

export const WHO_INFORMED_LABELS: Record<string, string> = {
  office: 'Office',
  on_call_manager: 'On-call manager',
  family_nok: 'Family / NOK',
  gp: 'GP',
  emergency_999: '999',
  safeguarding_lead: 'Safeguarding lead',
  local_authority: 'Local authority',
}
