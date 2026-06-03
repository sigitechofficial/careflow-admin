export type InitialAssessmentStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'REVIEWED'
  | 'ARCHIVED'
  | 'CANCELLED'

export type InitialAssessmentQuestionType =
  | 'CHECKBOX'
  | 'YES_NO'
  | 'SINGLE_SELECT'
  | 'MULTI_SELECT'
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'DATE'
  | 'TIME'

export type InitialAssessmentQuestion = {
  id: string
  questionText: string
  helpText?: string | null
  questionType: InitialAssessmentQuestionType
  options?: unknown
  isRequired: boolean
  allowNotes?: boolean
  riskFlag: boolean
  carePlanTrigger: boolean
  sortOrder: number
  metadata?: Record<string, unknown> | null
}

export type InitialAssessmentSection = {
  id: string
  sectionNumber: number
  title: string
  description?: string | null
  carePlanArea?: string | null
  sortOrder: number
  questions: InitialAssessmentQuestion[]
}

export type InitialAssessmentTemplate = {
  id: string
  name: string
  description?: string | null
  version: number
  isDefault: boolean
  sections: InitialAssessmentSection[]
}

export type InitialAssessmentSubmission = {
  id: string
  serviceUserId: string
  templateId: string
  status: InitialAssessmentStatus
  startedAt: string | null
  completedAt: string | null
  submittedAt: string | null
  reviewedAt: string | null
  reviewNotes: string | null
  overallNotes: string | null
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  template?: { id: string; name: string; version: number }
  submittedBy?: InitialAssessmentSubmissionUserRef | null
  reviewedBy?: InitialAssessmentSubmissionUserRef | null
  createdBy?: InitialAssessmentSubmissionUserRef | null
  updatedBy?: InitialAssessmentSubmissionUserRef | null
}

export type InitialAssessmentSubmissionUserRef = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
}

export type InitialAssessmentAnswer = {
  id: string
  questionId: string
  checked: boolean | null
  booleanValue: boolean | null
  textValue: string | null
  secureMasked?: boolean
  hasSecureValue?: boolean
  numberValue: number | null
  dateValue: string | null
  timeValue: string | null
  selectedOptions: unknown
  notes: string | null
  riskFlag: boolean
  carePlanTrigger: boolean
  question?: Pick<
    InitialAssessmentQuestion,
    'id' | 'questionText' | 'questionType' | 'riskFlag' | 'carePlanTrigger'
  >
}

export type InitialAssessmentAnswerInput = {
  questionId: string
  checked?: boolean
  booleanValue?: boolean
  textValue?: string
  secureMasked?: boolean
  hasSecureValue?: boolean
  numberValue?: number
  dateValue?: string
  timeValue?: string
  selectedOptions?: unknown[] | string | Record<string, unknown>
  notes?: string
}

export type InitialAssessmentFlaggedItem = {
  answerId: string
  questionId: string
  questionText: string
  notes: string | null
  textValue: string | null
  section?: { id: string; title: string; sectionNumber: number; carePlanArea?: string | null }
}

export type InitialAssessmentValidationIssue = {
  message: string
  sectionNumber: number
  blocking: boolean
}

export type InitialAssessmentValidationResult = {
  blocks: InitialAssessmentValidationIssue[]
  warnings: InitialAssessmentValidationIssue[]
  canSubmit: boolean
  canSubmitIncomplete?: boolean
  overallPercent: number
}

export type InitialAssessmentAgencySettings = {
  blockWithoutEmergencyContact: boolean
  blockWithoutNoResponseProcedure: boolean
  managerReviewWaterlowThreshold: number
  notifyManagersOnHighRiskSubmit: boolean
  requireAssessorSignOff: boolean
  requireNextReviewDate: boolean
}

export type CarePlanRecommendation = {
  id: string
  carePlanArea: string
  sectionNumber: number
  sectionTitle: string
  title: string
  triggerCount: number
  triggers: Array<{ questionId: string; questionText: string; specRef?: string }>
  status: 'pending' | 'accepted' | 'declined'
  declineReason?: string | null
  decidedAt?: string | null
  carePathwayFormId?: string
  carePathwayFormName?: string
  source?: 'rule' | 'legacy'
  ruleId?: string
}

export type InitialAssessmentReviewQueueItem = {
  id: string
  serviceUserId: string
  serviceUserName: string
  serviceUserNumber: string | null
  status: InitialAssessmentStatus
  submittedAt: string | null
  managerReviewRequired: boolean
  openActionsCount: number
  openRiskCount: number
  templateVersion: number
  queueReasons: string[]
}

export type InitialAssessmentClinicalSnapshot = {
  frozen: boolean
  vitals: {
    recordedAt: string
    competentAssessor: boolean | null
    clinicalObservationsCompleted: boolean | null
    readings: {
      temperature?: number
      pulse?: number
      respirations?: number
      bpSystolic?: number
      bpDiastolic?: number
      spo2?: number
      bloodGlucose?: number
    }
    observationIds: string[]
    sourceSubmissionId?: string
  } | null
  medications: {
    capturedAt: string
    verified: boolean
    verifiedDate: string | null
    listAvailable: boolean | null
    itemCount: number
    items: Array<{
      id: string
      medicationName: string
      dose: string | null
      strength: string | null
      status: string
      route: string | null
      isControlledMedication: boolean
    }>
  } | null
  falls: {
    fallsLast12Months: boolean | null
    numberOfFalls: number | null
    mostRecentFallDate: string | null
    injuryCaused: boolean | null
    assessmentCompleted: boolean | null
    assessmentDate: string | null
    riskScore: number
    riskLevel: InitialAssessmentRiskLevel | null
    adlMobilityScore: number | null
    observationId?: string
  } | null
}

export type InitialAssessmentSubmissionSummary = {
  submission: InitialAssessmentSubmission
  answeredCount: number
  sectionCount: number
  status: InitialAssessmentStatus
  riskCount: number
  carePlanTriggerCount: number
  openActionsCount: number
  managerReviewRequired: boolean
  clinical?: {
    vitals: InitialAssessmentClinicalSnapshot['vitals']
    medications: InitialAssessmentClinicalSnapshot['medications']
    falls: InitialAssessmentClinicalSnapshot['falls']
  }
  carePlanRecommendations: CarePlanRecommendation[]
  agencySettings: InitialAssessmentAgencySettings
  careActivation: CareActivationStatus
}

export type CareActivationStatus = {
  eligible: boolean
  approvedForCareStart: boolean
  careStartConditions: string | null
  blockers: string[]
}

export type InitialAssessmentActionPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type InitialAssessmentActionStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type InitialAssessmentActionType =
  | 'GP_REVIEW'
  | 'SPECIALIST_NURSE'
  | 'SALT_REFERRAL'
  | 'DIETITIAN_REFERRAL'
  | 'CONTINENCE_REFERRAL'
  | 'EQUIPMENT_ORDER'
  | 'FIRE_SAFETY_FOLLOW_UP'
  | 'SAFEGUARDING_REFERRAL'
  | 'MCA_ASSESSMENT'
  | 'WOUND_ASSESSMENT'
  | 'FALLS_ASSESSMENT'
  | 'MEDICATION_VERIFICATION'
  | 'EMAR_SETUP'
  | 'MANAGER_REVIEW'
  | 'OTHER'

export type InitialAssessmentAction = {
  id: string
  submissionId: string
  serviceUserId: string
  title: string
  actionType: InitialAssessmentActionType
  priority: InitialAssessmentActionPriority
  status: InitialAssessmentActionStatus
  dueDate: string | null
  notes: string | null
  sourceSectionNumber: number | null
  sourceQuestionId: string | null
  sourceQuestionText: string | null
  assignedToId: string | null
  autoGenerated: boolean
  createdAt: string
  updatedAt: string
  assignedTo?: { id: string; email: string; firstName: string | null; lastName: string | null } | null
}

export type InitialAssessmentAttachmentCategory =
  | 'ASSESSMENT_PICTURE'
  | 'MCA_DOCUMENT'
  | 'DISCHARGE_SUMMARY'
  | 'MEDICATION_LIST'
  | 'WOUND_PHOTO'
  | 'EMERGENCY_DOCUMENT'
  | 'OTHER'

export type InitialAssessmentAttachment = {
  id: string
  submissionId: string
  serviceUserId: string
  category: InitialAssessmentAttachmentCategory
  label: string | null
  sectionNumber: number | null
  fileName: string
  originalName: string
  fileUrl: string
  mimeType: string
  fileSize: number
  uploadedById: string
  createdAt: string
  updatedAt: string
  uploadedBy?: { id: string; email: string; firstName: string | null; lastName: string | null } | null
}

export type InitialAssessmentRiskType =
  | 'FALLS'
  | 'MEDICATION'
  | 'SKIN_INTEGRITY'
  | 'CHOKING'
  | 'NUTRITION'
  | 'HYDRATION'
  | 'FIRE'
  | 'HOME_ENVIRONMENT'
  | 'MOVING_HANDLING'
  | 'SAFEGUARDING'
  | 'FINANCE'
  | 'LONE_WORKER'
  | 'INFECTION_CONTROL'
  | 'OTHER'

export type InitialAssessmentRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'
export type InitialAssessmentRiskStatus = 'OPEN' | 'CONTROLLED' | 'CLOSED'

export type InitialAssessmentRiskRecord = {
  id: string
  submissionId: string
  serviceUserId: string
  riskType: InitialAssessmentRiskType
  description: string
  likelihood: InitialAssessmentRiskLevel
  severity: InitialAssessmentRiskLevel
  riskLevel: InitialAssessmentRiskLevel
  controlMeasures: string | null
  residualRisk: InitialAssessmentRiskLevel | null
  reviewDate: string | null
  status: InitialAssessmentRiskStatus
  sourceSectionNumber: number | null
  sourceQuestionId: string | null
  sourceQuestionText: string | null
  responsiblePersonId: string | null
  autoGenerated: boolean
  createdAt: string
  updatedAt: string
  responsiblePerson?: { id: string; email: string; firstName: string | null; lastName: string | null } | null
}
