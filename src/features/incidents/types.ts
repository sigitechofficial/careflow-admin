export type IncidentStatus =
  | 'REPORTED'
  | 'UNDER_REVIEW'
  | 'UNDER_INVESTIGATION'
  | 'ACTIONS_REQUIRED'
  | 'AWAITING_CLOSURE'
  | 'CLOSED'
  /** Legacy — reopening is now an event (reopenCount / lastReopenedAt), never set by new changes. */
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

export type IncidentReportedBy = {
  name: string | null
  /** OFFICE = raised by a logged-in user in admin; CARER_APP = raised by a carer during a visit. */
  source: 'OFFICE' | 'CARER_APP' | null
  /** Office user's role names (empty for carer-app reports). */
  roles: string[]
  /** Office user who keyed it in on the carer's behalf (null for carer-app reports). */
  recordedByName?: string | null
}

/** A visit a new incident can be linked to (GET /incidents/visit-options). */
export type IncidentVisitOption = {
  scheduledJobId: string
  scheduledVisitId: string
  visitName: string
  /** Operational day YYYY-MM-DD */
  date: string
  startsAt: string
  endsAt: string | null
  actualStartsAt: string | null
  actualEndsAt: string | null
  /** A carer SOS was raised during this visit (ECM). */
  sosRaised: boolean
  status: string
  visitRef: string | null
  serviceUserName: string
  carers: { employeeId: string; name: string }[]
}

export type IncidentListItem = {
  id: string
  /** Duty of Candour overdue (organisation setting). */
  candourOverdue?: boolean
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
  /** Where it happened (office raise form), e.g. HOME_BATHROOM. */
  locationKey?: string | null
  /** Text when locationKey is OTHER. */
  locationDetail?: string | null
  primaryServiceUserId: string | null
  primaryEmployeeId: string | null
  primaryPersonKind: IncidentPersonKind | null
  primaryPersonName: string | null
  affectedPersonKinds: IncidentPersonKind[]
  scheduledJobId: string | null
  reportedById: string | null
  reporterEmployeeId?: string | null
  involvedEmployeeIds?: string[]
  /** Office user who keyed it in (null for carer-app reports). */
  createdById?: string | null
  /** When a manager started the review (Reported → Under Review). */
  reviewStartedAt?: string | null
  /** Reopening is an event: how many times, and when last. */
  reopenCount?: number
  lastReopenedAt?: string | null
  ambulanceAttended?: boolean | null
  takenToAe?: boolean | null
  admittedToHospital?: boolean | null
  categoryDetails?: Record<string, unknown> | null
  /** Resolved reporter — returned by the list endpoint only. */
  reportedBy?: IncidentReportedBy
  /** Readable visit reference (VIS-…) when raised during a visit — list endpoint only. */
  visitRef?: string | null
  /** Primary service user's name — list endpoint only. */
  serviceUserName?: string | null
  /** Branch name — list endpoint only. */
  locationName?: string | null
  ownerId: string | null
  description: string
  contextBefore: string | null
  contextAfter: string | null
  immediateActions: string | null
  immediateActionCodes: string[]
  injuryOccurred: boolean
  injuryDetails: string | null
  /** Carer-app witness text, kept exactly as the carer wrote it. */
  witnessDetails: string | null
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
  immediateRisk?: boolean | null
  protectiveAction?: string | null
  managementNotes: string | null
  reviewedById: string | null
  reviewedAt: string | null
  /** INVESTIGATE / NO_INVESTIGATION, stored with the review (null = not decided). */
  decision?: 'INVESTIGATE' | 'NO_INVESTIGATION' | null
  decisionReason?: string | null
  decidedAt?: string | null
  /** 1 for the first review; a reopened incident starts the next number. */
  cycleNumber?: number
  updatedAt: string
  updatedById?: string | null
  /** Who first reviewed it, and who last changed it. */
  reviewedByName?: string | null
  updatedByName?: string | null
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
  contributingFactorDetails?: ContributingFactorDetails | null
  rootCause: string | null
  preventable: IncidentPreventability | null
  conclusion: string | null
  completedAt: string | null
  updatedAt: string
  /** When the investigation record was created (start date). */
  createdAt: string
  /** Start date as a day key in the organisation timezone. */
  startedOn?: string
  investigationLevel?: InvestigationLevel | null
  leadInvestigatorEmployeeId?: string | null
  leadInvestigatorName?: string | null
  investigatorInvolved?: InvestigatorInvolvement | null
  investigatorInvolvedReason?: string | null
  /** YYYY-MM-DD */
  targetDate?: string | null
  termsOfReference?: string | null
  investigationStatus?: InvestigationStatus
  /** Target date passed and not completed (organisation timezone). */
  overdue?: boolean
  currentPause?: { reason: string; pausedAt: string; nextReviewDate: string | null } | null
  pauses?: IncidentInvestigationPause[]
  /** Evidence: kinds of records reviewed, with linked records and notes. */
  recordsReviewed?: string[]
  recordsReviewedDetails?: ContributingFactorDetails | null
  evidenceNotes?: string | null
  outstandingEvidence?: string | null
}

/** The investigation shape shared by incidents and complaints (complaints have no scope fields). */
export type InvestigationRecord = Omit<
  IncidentInvestigation,
  'incidentId' | 'investigationScope' | 'externalType'
> &
  Partial<Pick<IncidentInvestigation, 'investigationScope' | 'externalType'>>

export type InvestigationLevel = 'STANDARD' | 'ENHANCED' | 'COMPREHENSIVE'
export type InvestigatorInvolvement = 'NO' | 'YES' | 'NOT_KNOWN'
/** COMPLETED is only reached by completing the investigation. */
export type InvestigationStatus = 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED'

export type IncidentInvestigationPause = {
  id: string
  reason: string
  pausedAt: string
  pausedByName: string | null
  nextReviewDate: string | null
  resumedAt: string | null
  resumedByName: string | null
}

/** A staff member (employee) who can lead an investigation: an active carer or manager. */
export type IncidentInvestigatorOption = {
  id: string
  name: string
  /** Job title, or null when none is set. */
  designation: string | null
}

export const INVESTIGATION_LEVEL_OPTIONS: {
  value: InvestigationLevel
  label: string
  hint: string
}[] = [
  {
    value: 'STANDARD',
    label: 'Standard',
    hint: 'Lower-risk incidents: a proportionate review of what happened and why.',
  },
  {
    value: 'ENHANCED',
    label: 'Enhanced',
    hint: 'Higher-risk or repeated incidents: more records, people and contributing factors examined.',
  },
  {
    value: 'COMPREHENSIVE',
    label: 'Comprehensive',
    hint: 'Serious harm, death or complex incidents: a full, in-depth investigation.',
  },
]

/** Evidence: kinds of records the investigator reviewed, and what to link for each. */
export const INVESTIGATION_RECORDS_REVIEWED_OPTIONS: {
  value: string
  label: string
  pick: ContributingFactorPick
  question: string
}[] = [
  { value: 'CARE_PLAN', label: 'Care plan', pick: 'carePlan', question: 'Which care plan?' },
  { value: 'RISK_ASSESSMENT', label: 'Risk assessment', pick: 'riskAssessment', question: 'Which risk assessment?' },
  { value: 'MAR', label: 'MAR', pick: 'medication', question: 'Which medication’s MAR?' },
  { value: 'VISIT_LOGS', label: 'Visit logs', pick: 'note', question: 'Which visits?' },
  { value: 'ROTA', label: 'Rota', pick: 'note', question: 'Which rota / dates?' },
  { value: 'TRAINING_RECORDS', label: 'Training records', pick: 'staff', question: 'Whose training records?' },
  { value: 'SUPERVISION_RECORDS', label: 'Supervision records', pick: 'staff', question: 'Whose supervision records?' },
  { value: 'POLICIES', label: 'Policies / procedures', pick: 'policy', question: 'Which policy or procedure?' },
  { value: 'OTHER', label: 'Other', pick: 'note', question: 'Which records?' },
]

export const INVESTIGATOR_INVOLVEMENT_OPTIONS: { value: InvestigatorInvolvement; label: string }[] = [
  { value: 'NO', label: 'No' },
  { value: 'YES', label: 'Yes' },
  { value: 'NOT_KNOWN', label: 'Not known' },
]

export const INVESTIGATION_STATUS_LABELS: Record<InvestigationStatus, string> = {
  IN_PROGRESS: 'In progress',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
}

/** Per contributing factor: the records it relates to (name kept as at save time) and a note. */
export type ContributingFactorDetail = {
  items?: { id: string; label: string }[]
  note?: string
}
export type ContributingFactorDetails = Record<string, ContributingFactorDetail>

export type IncidentExternalBodyType =
  | 'LOCAL_AUTHORITY_SAFEGUARDING'
  | 'POLICE'
  | 'CQC'
  | 'HSE'
  | 'CORONER'
  | 'COMMISSIONER'
  | 'OTHER'
export type IncidentExternalBodyRole = 'LEAD' | 'SUPPORTING' | 'INFORMED'
export type IncidentExternalBodyStatus = 'REFERRED' | 'IN_PROGRESS' | 'CONCLUDED' | 'NO_FURTHER_ACTION'

/** An outside body involved alongside the internal investigation (police, LA safeguarding…). */
export type IncidentExternalBody = {
  id: string
  incidentId: string
  bodyType: IncidentExternalBodyType
  organisationName: string | null
  referredOn: string
  referenceNumber: string | null
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
  role: IncidentExternalBodyRole
  status: IncidentExternalBodyStatus
  outcome: string | null
  outcomeDate: string | null
  /** What we gave them (records, statements…) and when. */
  informationProvided: string | null
  /** What we got from them (updates, findings, instructions). */
  informationReceived: string | null
  createdAt: string
  updatedAt: string
}

export type IncidentExternalBodyInput = Omit<IncidentExternalBody, 'id' | 'incidentId' | 'createdAt' | 'updatedAt'>

export const INCIDENT_EXTERNAL_BODY_TYPE_OPTIONS: { value: IncidentExternalBodyType; label: string; hint: string }[] = [
  { value: 'LOCAL_AUTHORITY_SAFEGUARDING', label: 'Local authority safeguarding', hint: 'Safeguarding referral / Section 42 enquiry (including concerns about staff)' },
  { value: 'POLICE', label: 'Police', hint: 'A possible crime — theft, assault, abuse' },
  { value: 'CQC', label: 'CQC', hint: 'When CQC is looking into the incident itself' },
  { value: 'HSE', label: 'HSE', hint: 'Health and Safety Executive (e.g. after a RIDDOR report)' },
  { value: 'CORONER', label: 'Coroner', hint: 'After a death' },
  { value: 'COMMISSIONER', label: 'Commissioner / ICB', hint: 'The council or NHS body that funds the care' },
  { value: 'OTHER', label: 'Other', hint: 'Name the organisation' },
]

export const INCIDENT_EXTERNAL_BODY_ROLE_OPTIONS: { value: IncidentExternalBodyRole; label: string }[] = [
  { value: 'LEAD', label: 'They lead, we support' },
  { value: 'SUPPORTING', label: 'Joint investigation' },
  { value: 'INFORMED', label: 'Information only' },
]

export const INCIDENT_EXTERNAL_BODY_STATUS_OPTIONS: { value: IncidentExternalBodyStatus; label: string }[] = [
  { value: 'REFERRED', label: 'Referred' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'CONCLUDED', label: 'Concluded' },
  { value: 'NO_FURTHER_ACTION', label: 'No further action' },
]

/** Still running — closing the incident while one is open needs a reason. */
export const isExternalBodyOpen = (status: IncidentExternalBodyStatus) =>
  status === 'REFERRED' || status === 'IN_PROGRESS'

export type IncidentCarerSuspension = {
  id: string
  incidentId: string
  employeeId: string
  reason: string
  suspendFrom: string
  suspendTo: string
  suspendedAt: string
  createdAt: string
  /** SCHEDULED (starts on suspendFrom) / ACTIVE / LIFTED. */
  status: 'SCHEDULED' | 'ACTIVE' | 'LIFTED'
  /** Active and past its end date. */
  reviewDue: boolean
  liftedAt: string | null
  liftReason: string | null
  /** Decided at Outcome & close: the suspension continues beyond the incident. */
  continuedAt?: string | null
  continueReason?: string | null
}

/** Duty of Candour (Regulation 20). */
export type CandourDecisionValue = 'YES' | 'NO' | 'NOT_KNOWN' | 'NOT_APPLICABLE'
export type CandourStatus = 'NOT_DECIDED' | 'NOT_KNOWN' | 'NOT_REQUIRED' | 'IN_PROGRESS' | 'COMPLETE'

export const CANDOUR_HARM_OPTIONS: { value: string; label: string }[] = [
  { value: 'DEATH', label: 'Death caused by the incident (not the natural course of an illness)' },
  { value: 'IMPAIRMENT_28_DAYS', label: 'Impairment of sensory, motor or intellectual function for 28 days or more' },
  { value: 'BODY_STRUCTURE_CHANGE', label: 'Change to the structure of the body (e.g. fracture)' },
  { value: 'PROLONGED_PAIN', label: 'Pain for a continuous 28 days or more' },
  { value: 'PROLONGED_PSYCH_HARM', label: 'Psychological harm for a continuous 28 days or more' },
  { value: 'SHORTENED_LIFE', label: 'Shortened life expectancy' },
  { value: 'TREATMENT_TO_PREVENT', label: 'Treatment needed to prevent one of these' },
]
export const CANDOUR_LETTER_METHOD_OPTIONS = [
  { value: 'POST', label: 'Post' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'HANDED', label: 'Handed in person' },
]
export const CANDOUR_UNABLE_REASON_OPTIONS = [
  { value: 'DECLINED', label: 'Declined to speak' },
  { value: 'NOT_CONTACTABLE', label: 'Could not be contacted' },
  { value: 'NO_REPRESENTATIVE', label: 'No one can act for them' },
]
export const CANDOUR_ATTEMPT_METHOD_OPTIONS = [
  { value: 'PHONE', label: 'Phone' },
  { value: 'VISIT', label: 'Visit' },
  { value: 'LETTER', label: 'Letter' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'OTHER', label: 'Other' },
]

type CandourPersonRef = { id: string; name: string } | null

export type CandourRecordDetail = {
  id: string
  decision: CandourDecisionValue
  decisionReason: string | null
  harmTypes: string[]
  healthProfessionalName: string | null
  healthProfessionalRole: string | null
  healthProfessional: CandourPersonRef
  decidedAt: string | null
  dutyStartedAt: string | null
  toldOn: string | null
  toldBy: CandourPersonRef
  toldPersonKind: 'SERVICE_USER' | 'REPRESENTATIVE' | null
  toldPersonName: string | null
  toldRelationship: string | null
  factsExplained: boolean
  enquiriesExplained: boolean
  apologyGiven: boolean
  supportOffered: string | null
  writtenSentOn: string | null
  writtenBy: CandourPersonRef
  writtenMethod: string | null
  writtenAttachment: { id: string; name: string } | null
  resultsSharedOn: string | null
  resultsMethod: string | null
  resultsAttachment: { id: string; name: string } | null
  noFurtherEnquiriesReason: string | null
  unableToNotify: boolean
  unableReason: string | null
  unableNote: string | null
  attempts: { id: string; attemptedOn: string; method: string; by: CandourPersonRef; outcome: string }[]
}

export type CandourPersonEntry = {
  serviceUserId: string
  serviceUserName: string
  /** False when the person is no longer on the incident (kept as history). */
  onIncident: boolean
  deceased: boolean
  status: CandourStatus
  missing: string[]
  overdue: boolean
  record: CandourRecordDetail | null
}

export type IncidentCandourPanel = {
  applies: boolean
  overdueDays: number | null
  hintReasons: string[]
  hasInvestigation: boolean
  records: CandourPersonEntry[]
  /** "Outcome shared with" rows that come from results letters. */
  outcomeRows?: OutcomeSharingEntry[]
}

/** "Care plan update" measure: the plans to open and the published versions that can complete it. */
export type CarePlanMeasureEvidence = {
  newRecordNeeded: boolean
  measureCreatedAt: string
  serviceUserIds: string[]
  plans: { instanceId: string; serviceUserId: string; carePathwayFormId: string; formName: string }[]
  versions: {
    id: string
    instanceId: string
    serviceUserId: string
    carePathwayFormId: string
    formName: string
    versionNumber: number
    summary: string | null
    publishedAt: string
    publishedByName: string | null
    linkedToThisMeasure: boolean
  }[]
}

/** Outcome & close → Staff actions: what was decided for a staff member. */
export type IncidentStaffActionType =
  | 'NO_ACTION'
  | 'INFORMAL_DISCUSSION'
  | 'VERBAL_WARNING'
  | 'WRITTEN_WARNING'
  | 'FINAL_WRITTEN_WARNING'
  | 'FINE'
  | 'DISMISSAL'
  | 'HR_PROCESS'

export const STAFF_ACTION_TYPE_OPTIONS: { value: IncidentStaffActionType; label: string }[] = [
  { value: 'NO_ACTION', label: 'No action' },
  { value: 'INFORMAL_DISCUSSION', label: 'Informal discussion' },
  { value: 'VERBAL_WARNING', label: 'Verbal warning' },
  { value: 'WRITTEN_WARNING', label: 'Written warning' },
  { value: 'FINAL_WRITTEN_WARNING', label: 'Final written warning' },
  { value: 'FINE', label: 'Fine (deducted from salary)' },
  { value: 'DISMISSAL', label: 'Dismissal' },
  { value: 'HR_PROCESS', label: 'Referred to HR process' },
]

export type IncidentStaffAction = {
  id: string
  employeeId: string
  actionType: IncidentStaffActionType
  actionLabel: string
  reason: string
  /** YYYY-MM-DD the staff member was told, or null = not told yet. */
  staffInformedOn: string | null
  fineAmount: number | null
  /** YYYY-MM. */
  fineSalaryMonth: string | null
  deductionAllowedConfirmed: boolean
  salaryDeductionId: string | null
  createdAt: string
  updatedAt: string
}

export type IncidentStaffActionInput = {
  actionType: IncidentStaffActionType
  reason: string
  staffInformedOn: string | null
  fineAmount?: number | null
  fineSalaryMonth?: string | null
  deductionAllowedConfirmed?: boolean
}

/** A carer's suspension as listed on their employee record. */
export type EmployeeIncidentSuspension = IncidentCarerSuspension & {
  incidentReference: string
  incidentStatus: IncidentStatus
  suspendedByName: string | null
  liftedByName: string | null
  continuedByName: string | null
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
  personServiceUserId?: string | null
  personEmployeeId?: string | null
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
  changesMadeDetails?: ContributingFactorDetails | null
  informationSharedWithStaff: boolean | null
  serviceUserInformed: boolean | null
  nokInformed: boolean | null
  finalManagementComments: string | null
  updatedAt: string
  /** Who the outcome was shared with (one row per person). */
  outcomeSharing?: OutcomeSharingEntry[] | null
  /** YYYY-MM-DD */
  learningSharedOn?: string | null
  learningSharedMethod?: string | null
  learningSharedNote?: string | null
}

export type OutcomePersonKind = 'SERVICE_USER' | 'REPRESENTATIVE' | 'STAFF' | 'OTHER'

export type OutcomeSharingEntry = {
  key: string
  personKind: OutcomePersonKind
  name: string
  shared: boolean
  sharedOn: string | null
  method: string | null
  notSharedReason: string | null
  note: string | null
  /** Set by the server: filled from the Duty of Candour results letter (read-only here). */
  source?: 'CANDOUR' | null
  attachmentId?: string | null
}

export const OUTCOME_SHARING_METHOD_OPTIONS = [
  { value: 'IN_PERSON', label: 'In person' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'VIDEO', label: 'Video call' },
  { value: 'LETTER', label: 'Letter' },
  { value: 'EMAIL', label: 'Email' },
]

export const OUTCOME_NOT_SHARED_REASON_OPTIONS = [
  { value: 'PASSED_AWAY', label: 'Passed away' },
  { value: 'LACKS_CAPACITY', label: 'Lacks capacity — representative told' },
  { value: 'NOT_NEEDED', label: 'Not needed' },
  { value: 'DECLINED', label: 'Declined to be told' },
  { value: 'COULD_NOT_CONTACT', label: 'Could not be contacted' },
  { value: 'NOT_APPROPRIATE', label: 'Not appropriate (e.g. safeguarding)' },
]

export const LEARNING_SHARED_METHOD_OPTIONS = [
  { value: 'TEAM_MEETING', label: 'Team meeting' },
  { value: 'SUPERVISION', label: 'Supervision' },
  { value: 'MEMO', label: 'Memo / bulletin' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'TRAINING_SESSION', label: 'Training session' },
  { value: 'OTHER', label: 'Other' },
]

export type UpsertIncidentOutcomeInput = {
  finalOutcome?: string
  lessonsLearned?: string
  preventability?: IncidentPreventability
  changesMade?: string[]
  changesMadeDetails?: ContributingFactorDetails
  informationSharedWithStaff?: boolean
  serviceUserInformed?: boolean
  nokInformed?: boolean
  finalManagementComments?: string
  outcomeSharing?: OutcomeSharingEntry[]
  learningSharedOn?: string | null
  learningSharedMethod?: string | null
  learningSharedNote?: string | null
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

/** What each "change made" asks for once ticked (same pickers as contributing factors). */
export const INCIDENT_OUTCOME_CHANGE_DETAIL: Record<
  string,
  { pick: ContributingFactorPick; question: string }
> = {
  CARE_PLAN: { pick: 'carePlan', question: 'Which care plan was updated?' },
  RISK_ASSESSMENT: { pick: 'riskAssessment', question: 'Which risk assessment was updated?' },
  POLICY: { pick: 'policy', question: 'Which policy changed?' },
  PROCEDURE: { pick: 'policy', question: 'Which procedure changed?' },
  STAFF_TRAINING: { pick: 'staff', question: 'Which staff were trained?' },
  STAFFING: { pick: 'staff', question: 'Which staff does the change involve?' },
  EQUIPMENT: { pick: 'note', question: 'What equipment was added or changed?' },
  ENVIRONMENT: { pick: 'note', question: 'What changed in the environment?' },
  OTHER: { pick: 'note', question: 'Describe the change' },
}

export type IncidentAnalytics = {
  totals: {
    total: number
    open: number
    closed: number
    underReview: number
    notPickedUp: number
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
  /** Carers who reported the most incidents. */
  byReporter: { id: string; name: string; count: number }[]
  /** Reported from the carer app vs recorded by the office. */
  bySource: { carerApp: number; office: number }
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
  primaryServiceUser: { id: string; name: string | null; serviceUserNumber: string | null } | null
  primaryEmployee: { id: string; name: string | null } | null
  /** Everyone involved, primary first. */
  involvedServiceUsers?: { id: string; name: string | null; serviceUserNumber: string | null }[]
  involvedEmployees?: { id: string; name: string | null }[]
  location: { id: string; name: string } | null
  history: IncidentTimelineEvent[]
  review: IncidentReview | null
  investigation: IncidentInvestigation | null
  outcome: IncidentOutcome | null
  actions: IncidentAction[]
  carerSuspensions: IncidentCarerSuspension[]
  /** Outcome & close → Staff actions (warning, fine, …). */
  staffActions?: IncidentStaffAction[]
  /** Duty of Candour (Regulation 20); null for older responses. */
  candour?: IncidentCandourPanel | null
  externalBodies?: IncidentExternalBody[]
  courseRecommendations: IncidentCarerCourseRecommendation[]
  injuries: IncidentInjury[]
  witnesses: IncidentWitness[]
  relatedCareRecords: IncidentRelatedCareRecord[]
  attachmentCount: number
  relatedIncidentCount: number
  closedAt: string | null
  closedById: string | null
  /** Readable visit ref (VIS-…) for scheduledJobId. */
  visitRef?: string | null
  /** Corrections to raised details, oldest first (each keeps the old value and the reason). */
  corrections?: IncidentCorrectionEntry[]
  /** Manager notes added to the reporter's own account (the original text never changes). */
  clarifications?: IncidentClarificationNote[]
  /** The severity decision made at review (null until the review decides it). */
  reviewSeverity?: IncidentReviewSeverityDecision | null
  /** Every severity step from what was reported to now (confirmations left out). */
  severityChanges?: IncidentSeverityStep[]
  /** Earlier review cycles, archived when the incident was reopened (never change). */
  reviewCycles?: IncidentReviewCycle[]
}

export type IncidentReviewCycle = {
  id: string
  cycleNumber: number
  confirmedSeverity: IncidentSeverity | null
  safeguardingConcern: boolean | null
  possibleAbuseOrNeglect: boolean | null
  furtherMedicalAttention: boolean | null
  externalNotificationRequired: boolean | null
  escalationRequired: boolean | null
  immediateRisk: boolean | null
  protectiveAction: string | null
  managementNotes: string | null
  investigationRequired: boolean | null
  decision: 'INVESTIGATE' | 'NO_INVESTIGATION' | null
  decisionReason: string | null
  decidedAt: string | null
  reviewedAt: string | null
  reviewedByName: string | null
  lastUpdatedAt: string | null
  lastUpdatedByName: string | null
  archivedAt: string
  archivedByName: string | null
  reopenReason: string | null
}

export type IncidentSeverityStep = {
  fromSeverity: IncidentSeverity | null
  toSeverity: IncidentSeverity
  source: 'REPORTED' | 'CORRECTION' | 'REVIEW' | 'OTHER'
  reason: string | null
  byName: string | null
  at: string
}

export type IncidentReviewSeverityDecision = {
  fromSeverity: IncidentSeverity | null
  toSeverity: IncidentSeverity
  changed: boolean
  reason: string | null
  byName: string | null
  at: string
}

export type IncidentCorrectionEntry = {
  id: string
  batchId: string
  /** Incident field key (occurredAt, categoryId, involvedServiceUserIds, …). */
  fieldKey: string
  fieldLabel: string
  fromLabel: string | null
  toLabel: string | null
  reason: string
  correctedByName: string | null
  createdAt: string
}

export type IncidentClarificationField =
  | 'DESCRIPTION'
  | 'CONTEXT_BEFORE'
  | 'CONTEXT_AFTER'
  | 'IMMEDIATE_ACTIONS'
  | 'PEOPLE_INVOLVED'
  | 'EMERGENCY_SERVICES'
  | 'WITNESS_DETAILS'

export type IncidentClarificationNote = {
  id: string
  field: IncidentClarificationField
  note: string
  createdByName: string | null
  createdAt: string
}

/** Correct raised details: only the fields sent change (null clears); the reason is required. */
export type CorrectIncidentInput = {
  reason: string
  occurredAt?: string
  categoryId?: string
  subtypeId?: string | null
  affectedPersonKinds?: IncidentPersonKind[]
  primaryServiceUserId?: string | null
  primaryEmployeeId?: string | null
  primaryPersonName?: string | null
  /** Everyone else involved (the affected person is added first by the API). */
  serviceUserIds?: string[]
  employeeIds?: string[]
  locationId?: string | null
  locationKey?: string | null
  locationDetail?: string | null
  scheduledJobId?: string | null
  categoryDetails?: Record<string, unknown> | null
  ambulanceAttended?: boolean | null
  takenToAe?: boolean | null
  admittedToHospital?: boolean | null
  immediateActionCodes?: string[]
  whoInformedKeys?: string[]
  severity?: IncidentSeverity
}

export const INCIDENT_PERSON_KIND_OPTIONS: { value: IncidentPersonKind; label: string }[] = [
  { value: 'SERVICE_USER', label: 'Service User' },
  { value: 'EMPLOYEE', label: 'Staff member' },
  { value: 'FAMILY', label: 'Family Member' },
  { value: 'VISITOR', label: 'Visitor' },
  { value: 'HEALTHCARE_PROFESSIONAL', label: 'Healthcare Professional' },
  { value: 'CONTRACTOR', label: 'Contractor' },
  { value: 'OTHER', label: 'Other' },
]

/** Display labels for every stored value (FATAL only exists on older / carer-app records). */
export const INCIDENT_INJURY_SEVERITY_LABELS: Record<IncidentInjurySeverity, string> = {
  MINOR: 'Minor',
  MODERATE: 'Moderate',
  SERIOUS: 'Serious',
  FATAL: 'Fatal',
}

/**
 * Severities offered when recording an injury. A death is an incident outcome, not an injury
 * grade, so FATAL is deliberately not offered.
 */
export const INCIDENT_INJURY_SEVERITY_OPTIONS: { value: IncidentInjurySeverity; label: string }[] = (
  ['MINOR', 'MODERATE', 'SERIOUS'] as const
).map((value) => ({ value, label: INCIDENT_INJURY_SEVERITY_LABELS[value] }))

/** Injury types offered on the raise form ("Other" asks for a description). */
export const INCIDENT_INJURY_TYPE_OPTIONS: string[] = [
  'Bruise',
  'Graze / abrasion',
  'Cut / laceration',
  'Skin tear',
  'Burn / scald',
  'Suspected fracture',
  'Head injury',
  'Sprain / strain',
  'Swelling',
  'Pain (no visible injury)',
  'Bite',
  'Pressure ulcer',
  'Moisture damage',
  'Wound',
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
  /** Reported and not yet picked up by a manager. */
  notPickedUp: number
  underReview: number
  underInvestigation: number
  actionsRequired: number
  highOrCritical: number
  /** Open incidents with Duty of Candour overdue. */
  candourOverdue?: number
  /** First day of the current organisation month (YYYY-MM-DD). */
  monthStart?: string
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
  /** Null for measures added before measure types existed. */
  measureType?: IncidentMeasureType | null
  /** Records the measure relates to (name as at save time). */
  linkedRecords?: { id: string; label: string }[]
  /** ROOT_CAUSE and/or contributing factor codes. */
  addresses?: string[]
  courseRecommendationId?: string | null
  /** A new care plan / risk assessment / policy is needed (nothing to update yet). */
  newRecordNeeded?: boolean
  /** Set on completion: the record(s) actually updated or added. */
  completedRecords?: { id: string; label: string }[]
}

export type IncidentMeasureType =
  | 'CARE_PLAN_UPDATE'
  | 'RISK_ASSESSMENT_UPDATE'
  | 'VISIT_PLAN_CHANGE'
  | 'COURSE'
  | 'COMPETENCY_CHECK'
  | 'SUPERVISION'
  | 'POLICY_UPDATE'
  | 'OTHER'

/** Measure types, what to link for each (course has its own carer + course pickers). */
export const INCIDENT_MEASURE_TYPE_OPTIONS: {
  value: IncidentMeasureType
  label: string
  pick: ContributingFactorPick | 'course'
  question: string
  /** One plain-English line shown under the type. */
  hint: string
  /** Record-changing types: the choice when there is nothing to update yet. */
  newLabel?: string
  /** No record to link, so the description must say what will change. */
  needsDescription?: boolean
}[] = [
  { value: 'CARE_PLAN_UPDATE', label: 'Care plan update', pick: 'carePlan', question: 'Which care plan?', newLabel: 'New care plan needed', hint: 'Change the service user’s care plan so carers follow the safer way.' },
  { value: 'RISK_ASSESSMENT_UPDATE', label: 'Risk assessment update', pick: 'riskAssessment', question: 'Which risk assessment?', newLabel: 'New risk assessment needed', hint: 'Look at the risk again and update the risk assessment (or write a new one).' },
  { value: 'VISIT_PLAN_CHANGE', label: 'Visit plan change', pick: 'none', question: '', needsDescription: true, hint: 'Change the visits — e.g. 2 carers, a longer or extra visit, or a different time.' },
  { value: 'COURSE', label: 'Course for carer', pick: 'course', question: '', hint: 'Give the carer a training course to complete in Learning.' },
  { value: 'COMPETENCY_CHECK', label: 'Competency check', pick: 'staff', question: 'Whose competency?', hint: 'Watch the carer do the task to confirm they can do it safely.' },
  { value: 'SUPERVISION', label: 'Supervision', pick: 'staff', question: 'Who needs supervision?', hint: 'A 1-to-1 meeting with the carer to talk about what happened and agree what changes.' },
  { value: 'POLICY_UPDATE', label: 'Policy update', pick: 'policy', question: 'Which policy or procedure?', newLabel: 'New policy / procedure needed', hint: 'Change a policy or procedure, or write a new one.' },
  { value: 'OTHER', label: 'Other', pick: 'none', question: '', needsDescription: true, hint: 'Anything else — e.g. fix equipment, make the home safer, or brief the team.' },
]

/** Care plan / risk assessment / policy measures are completed by naming the record changed. */
export const measureNeedsCompletedRecord = (v: string | null | undefined) =>
  !!INCIDENT_MEASURE_TYPE_OPTIONS.find((o) => o.value === v)?.newLabel

export const incidentMeasureTypeLabel = (v: string | null | undefined) =>
  INCIDENT_MEASURE_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? null

export type MyActionItem = IncidentAction & { incidentReference: string }

export type CreateIncidentActionInput = {
  title: string
  description?: string
  priority?: IncidentActionPriority
  dueDate?: string
  assignedEmployeeId?: string
  isMandatory?: boolean
  measureType?: IncidentMeasureType
  linkedRecords?: { id: string; label: string }[]
  addresses?: string[]
  newRecordNeeded?: boolean
  /** COURSE: the carer and the published course. */
  courseEmployeeId?: string
  courseId?: string
}

export type UpdateIncidentActionInput = Partial<
  Omit<
    CreateIncidentActionInput,
    'assignedEmployeeId' | 'dueDate' | 'description' | 'measureType' | 'courseEmployeeId' | 'courseId'
  >
> & {
  status?: IncidentActionStatus
  description?: string | null
  dueDate?: string | null
  /** Null or empty string clears the assignee. */
  assignedEmployeeId?: string | null
  /** Required when cancelling a mandatory measure or making it optional. */
  reason?: string
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
  /** Required on the first review: same as the current severity confirms it, different changes it. */
  confirmedSeverity?: IncidentSeverity
  /** Required when the severity is changed at review. */
  severityReason?: string
  /** The review decision: moves the incident to Under Investigation or Awaiting Closure. */
  decision?: 'INVESTIGATE' | 'NO_INVESTIGATION'
  /** Required for NO_INVESTIGATION. */
  decisionReason?: string
  /** Required when the review is changed after its decision was made. */
  changeReason?: string
  /** Is anyone currently at immediate or ongoing risk? */
  immediateRisk?: boolean
  /** Required when immediateRisk is true. */
  protectiveAction?: string
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
  contributingFactorDetails?: ContributingFactorDetails
  rootCause?: string
  preventable?: IncidentPreventability
  conclusion?: string
  investigationLevel?: InvestigationLevel | null
  leadInvestigatorEmployeeId?: string | null
  investigatorInvolved?: InvestigatorInvolvement | null
  investigatorInvolvedReason?: string | null
  /** YYYY-MM-DD */
  targetDate?: string | null
  termsOfReference?: string | null
  recordsReviewed?: string[]
  recordsReviewedDetails?: ContributingFactorDetails
  evidenceNotes?: string | null
  outstandingEvidence?: string | null
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

/** What each contributing factor asks for once ticked. */
export type ContributingFactorPick =
  | 'carePlan'
  | 'riskAssessment'
  | 'medication'
  | 'staff'
  | 'policy'
  | 'note'
  | 'none'

export const INCIDENT_CONTRIBUTING_FACTOR_DETAIL: Record<
  string,
  { pick: ContributingFactorPick; question: string }
> = {
  CARE_PLAN: { pick: 'carePlan', question: 'Which care plan?' },
  RISK_ASSESSMENT: { pick: 'riskAssessment', question: 'Which risk assessment?' },
  MEDICATION: { pick: 'medication', question: 'Which medication?' },
  STAFFING: { pick: 'staff', question: 'Which staff?' },
  TRAINING: { pick: 'staff', question: 'Which staff needed training?' },
  HUMAN_ERROR: { pick: 'staff', question: 'Who made the error?' },
  PROCEDURE_NOT_FOLLOWED: { pick: 'policy', question: 'Which procedure or policy?' },
  COMMUNICATION: { pick: 'note', question: 'What went wrong with communication?' },
  ENVIRONMENT: { pick: 'note', question: 'What in the environment contributed?' },
  EQUIPMENT: { pick: 'note', question: 'Which equipment, and what was wrong?' },
  BEHAVIOURAL_TRIGGER: { pick: 'note', question: 'What was the trigger?' },
  HEALTH_DETERIORATION: { pick: 'note', question: 'What changed in their health?' },
  OTHER: { pick: 'note', question: 'Describe the other factor' },
  UNKNOWN: { pick: 'none', question: '' },
}

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
  locationKey?: string
  locationDetail?: string
  primaryServiceUserId?: string
  primaryEmployeeId?: string
  /** Everyone involved; the first is the primary person. */
  serviceUserIds?: string[]
  employeeIds?: string[]
  primaryPersonKind?: IncidentPersonKind
  primaryPersonName?: string
  affectedPersonKinds?: IncidentPersonKind[]
  /** Carer who reported it — required; the office only records on their behalf. */
  reporterEmployeeId?: string
  /** Visit during which it happened or was discovered. */
  scheduledJobId?: string
  /** Category-specific answers (see category-details.ts). */
  categoryDetails?: Record<string, unknown>
  /** Hospital outcome — null = not known. */
  ambulanceAttended?: boolean | null
  takenToAe?: boolean | null
  admittedToHospital?: boolean | null
  description: string
  contextBefore?: string
  contextAfter?: string
  immediateActions?: string
  immediateActionCodes?: string[]
  whoInformedKeys?: string[]
  injuryOccurred?: boolean
  severity?: IncidentSeverity
  privacyLevel?: IncidentPrivacyLevel
  shareWithHandover?: boolean
}

export type IncidentListFilters = {
  search?: string
  status?: IncidentStatus
  severity?: IncidentSeverity
  /** Any of these severities (e.g. High + Critical). */
  severities?: IncidentSeverity[]
  /** Closed on or after this organisation day (YYYY-MM-DD). */
  closedFrom?: string
  hasOverdueActions?: boolean
  categoryId?: string
  serviceUserId?: string
  /** Staff member recorded as affected. */
  employeeId?: string
  /** Carer who reported it. */
  reporterEmployeeId?: string
  /** Duty of Candour overdue only. */
  candour?: 'overdue'
  locationId?: string
  openOnly?: boolean
  /** Which date the range filter and newest-first sort use (API default: occurredAt). */
  dateField?: 'occurredAt' | 'reportedAt'
  /** Date from (YYYY-MM-DD, inclusive). */
  dateFrom?: string
  /** Date to (YYYY-MM-DD, inclusive). */
  dateTo?: string
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
  UNDER_REVIEW: 'warning',
  UNDER_INVESTIGATION: 'warning',
  ACTIONS_REQUIRED: 'destructive',
  AWAITING_CLOSURE: 'default',
  CLOSED: 'success',
  REOPENED: 'destructive',
}

/** Mirrors the backend workflow rules for UX (backend still enforces authoritatively). */
export const INCIDENT_STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  REPORTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['UNDER_INVESTIGATION', 'AWAITING_CLOSURE'],
  UNDER_INVESTIGATION: ['ACTIONS_REQUIRED', 'AWAITING_CLOSURE'],
  ACTIONS_REQUIRED: ['AWAITING_CLOSURE', 'UNDER_INVESTIGATION'],
  AWAITING_CLOSURE: ['CLOSED', 'UNDER_INVESTIGATION'],
  CLOSED: ['UNDER_REVIEW'],
  REOPENED: ['UNDER_INVESTIGATION', 'AWAITING_CLOSURE'],
}

/** Closed → Under Review (needs incidents.reopen + a reason). */
export function isReopenTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  return from === 'CLOSED' && to === 'UNDER_REVIEW'
}

/** Back to Under Investigation from a later stage (reason required). */
export function isSendBackTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  return to === 'UNDER_INVESTIGATION' && (from === 'AWAITING_CLOSURE' || from === 'ACTIONS_REQUIRED')
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
    status === 'UNDER_REVIEW' ||
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
  UNDER_REVIEW: 'Under Review',
  UNDER_INVESTIGATION: 'Under Investigation',
  ACTIONS_REQUIRED: 'Actions Required',
  AWAITING_CLOSURE: 'Awaiting Closure',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
}

/** "What was done?" — must match IMMEDIATE_ACTION_CODES in careflow-api incident-workflow.util.ts. */
export const IMMEDIATE_ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: 'FIRST_AID', label: 'First aid given' },
  { value: 'INJURY_CHECK', label: 'Person checked for injuries' },
  { value: 'AREA_MADE_SAFE', label: 'Area made safe' },
  { value: 'EQUIPMENT_OUT_OF_USE', label: 'Equipment taken out of use' },
  { value: 'MEDICATION_WITHHELD', label: 'Medication withheld' },
  { value: 'EVIDENCE_PRESERVED', label: 'Evidence preserved' },
  { value: 'NO_ACTION_NEEDED', label: 'No action needed' },
  { value: 'OTHER', label: 'Other' },
]

export const WHO_INFORMED_LABELS: Record<string, string> = {
  office: 'Office',
  on_call_manager: 'On-call manager',
  family_nok: 'Family / NOK',
  gp: 'GP',
  emergency_999: '999 / ambulance',
  safeguarding_lead: 'Safeguarding lead',
  local_authority: 'Local authority',
  nhs_111: '111',
  police: 'Police',
  no_one_yet: 'No one informed yet',
}

/** Office raise form "Who was informed?" (static for now) — must match OFFICE_WHO_INFORMED_KEYS in the API. */
/** "Where did it happen?" — must match INCIDENT_LOCATION_KEYS in the API. */
export const INCIDENT_LOCATION_GROUPS: { label: string; options: { value: string; label: string }[] }[] = [
  {
    label: "Service user's home",
    options: [
      { value: 'HOME_BATHROOM', label: 'Bathroom' },
      { value: 'HOME_BEDROOM', label: 'Bedroom' },
      { value: 'HOME_KITCHEN', label: 'Kitchen' },
      { value: 'HOME_LIVING_ROOM', label: 'Living room' },
      { value: 'HOME_STAIRS', label: 'Stairs / hallway' },
      { value: 'HOME_GARDEN', label: 'Garden / outside' },
      { value: 'HOME_ENTRANCE', label: 'Entrance / doorstep' },
    ],
  },
  {
    label: 'Elsewhere',
    options: [
      { value: 'COMMUNITY', label: 'Community / outdoors' },
      { value: 'VEHICLE', label: 'Vehicle' },
      { value: 'OFFICE', label: 'Office' },
      { value: 'OTHER', label: 'Other' },
    ],
  },
]

/** "Service user's home – bathroom" / "Other: …" for display. */
export function incidentLocationLabel(key: string | null | undefined, detail?: string | null): string | null {
  if (!key) return null
  for (const g of INCIDENT_LOCATION_GROUPS) {
    const o = g.options.find((x) => x.value === key)
    if (o) {
      if (key === 'OTHER') return detail ? `Other: ${detail}` : 'Other'
      return g.label === 'Elsewhere' ? o.label : `${g.label} – ${o.label.toLowerCase()}`
    }
  }
  return key
}

export const OFFICE_WHO_INFORMED_OPTIONS: { value: string; label: string }[] = [
  { value: 'office', label: 'Office' },
  { value: 'on_call_manager', label: 'On-call manager' },
  { value: 'family_nok', label: 'Family / NOK' },
  { value: 'gp', label: 'GP' },
  { value: 'emergency_999', label: '999 / ambulance' },
  { value: 'nhs_111', label: '111' },
  { value: 'police', label: 'Police' },
  { value: 'safeguarding_lead', label: 'Safeguarding lead' },
  { value: 'local_authority', label: 'Local authority' },
  { value: 'no_one_yet', label: 'No one informed yet' },
]
