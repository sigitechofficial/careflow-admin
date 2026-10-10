export type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages?: number
  hasNextPage?: boolean
  hasPrevPage?: boolean
}

export type PaginatedResult<T> = {
  rows: T[]
  meta?: PaginationMeta
}

export type LearningCourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'SUPERSEDED' | 'UNDER_REVIEW'
export type LearningCourseType =
  | 'COURSE'
  | 'POLICY'
  | 'ASSESSMENT'
  | 'PRACTICAL_COMPETENCY'
  | 'EXTERNAL_TRAINING'
  | 'CLASSROOM'
  | 'WEBINAR'
  | 'BLENDED'
export type LearningDeliveryMethod = 'ONLINE' | 'FACE_TO_FACE' | 'VIRTUAL' | 'WORKPLACE' | 'BLENDED'
export type LearningDifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
export type LearningContentType =
  | 'TEXT'
  | 'IMAGE'
  | 'VIDEO'
  | 'AUDIO'
  | 'PDF'
  | 'DOCUMENT'
  | 'EXTERNAL_LINK'
  | 'CHECKLIST'
  | 'SCENARIO'
  | 'ACKNOWLEDGEMENT'
  | 'DOWNLOAD'
export type LearningCompletionRule = 'OPEN' | 'VIEW' | 'ACKNOWLEDGE' | 'DOWNLOAD' | 'TIME_SPENT'
export type LearningQuestionType =
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'TRUE_FALSE'
  | 'SHORT_TEXT'
  | 'LONG_TEXT'
export type LearningAssignmentType = 'INDIVIDUAL' | 'BULK' | 'PATHWAY' | 'REFRESHER' | 'MANDATORY'
export type LearningAssignmentStatus =
  | 'ASSIGNED'
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'AWAITING_ASSESSMENT'
  | 'AWAITING_APPROVAL'
  | 'COMPLETED'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'EXEMPT'
export type LearningAssignmentPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'
export type LearningComplianceStatus =
  | 'COMPLIANT'
  | 'NON_COMPLIANT'
  | 'DUE_SOON'
  | 'OVERDUE'
  | 'EXPIRED'
  | 'EXEMPT'
  | 'NOT_ASSIGNED'
export type LearningCertificateStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED'
export type LearningBookingStatus = 'CONFIRMED' | 'WAITLIST' | 'CANCELLED'
export type LearningAttendanceStatus = 'REGISTERED' | 'ATTENDED' | 'NO_SHOW' | 'PARTIAL'
export type LearningExternalTrainingVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'

export type LearningListParams = {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
  locationId?: string
}

export type LearningCategoryListParams = LearningListParams
export type LearningCourseListParams = LearningListParams & {
  status?: LearningCourseStatus
  categoryId?: string
}
export type LearningAssignmentListParams = LearningListParams
export type LearningComplianceListParams = {
  page?: number
  limit?: number
  employeeId?: string
  courseId?: string
  search?: string
}
export type LearningCertificateListParams = {
  page?: number
  limit?: number
  employeeId?: string
  search?: string
}
export type LearningExternalTrainingListParams = LearningListParams & {
  employeeId?: string
}
export type LearningReportListParams = {
  page?: number
  limit?: number
  employeeId?: string
  courseId?: string
  from?: string
  to?: string
}

export type LearningDashboardSummary = {
  categories: number
  courses: number
  publishedCourses: number
  assignments: number
  overdueAssignments: number
  activeCertificates: number
  competencies: number
  upcomingTrainingEvents: number
  externalTrainingPending: number
  /** Added for the module dashboard; optional so older API builds still type-check at runtime. */
  assignmentsByStatus?: Record<string, number>
  /** Assignments still owed (not cancelled or exempt). */
  owedAssignments?: number
  completedAssignments?: number
  awaitingSignOff?: number
  failedAssignments?: number
  expiredAssignments?: number
  mandatoryOwed?: number
  mandatoryCompleted?: number
  dueNext30?: number
  certificatesExpiring30?: number
  certificatesExpired?: number
  /** Legacy 'policy' courses: read-and-sign now lives in the Policy Library. */
  policyTypeCourses?: number
}

export type LearningCategory = {
  id: string
  name: string
  code: string
  description?: string | null
  displayOrder?: number
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export type LearningCategoryInput = {
  name: string
  code: string
  description?: string
  displayOrder?: number
  isActive?: boolean
}

export type LearningCourse = {
  id: string
  categoryId?: string | null
  title: string
  code: string
  shortDescription?: string | null
  description?: string | null
  thumbnailFileId?: string | null
  courseType?: LearningCourseType | null
  deliveryMethod?: LearningDeliveryMethod | null
  difficultyLevel?: LearningDifficultyLevel | null
  estimatedDurationMinutes?: number | null
  cpdMinutes?: number | null
  isMandatory?: boolean
  requiresAssessment?: boolean
  requiresPracticalAssessment?: boolean
  requiresManagerApproval?: boolean
  requiresTrainingEvent?: boolean
  passingScore?: number | null
  maximumAttempts?: number | null
  certificateEnabled?: boolean
  certificateValidityDays?: number | null
  refresherFrequencyDays?: number | null
  effectiveFrom?: string | null
  reviewDate?: string | null
  status: LearningCourseStatus
  currentVersionId?: string | null
  archivedAt?: string | null
  createdAt?: string
  updatedAt?: string
  initialVersion?: LearningCourseVersion
}

export type LearningCourseInput = {
  categoryId?: string
  title: string
  code: string
  shortDescription?: string
  description?: string
  courseType?: LearningCourseType
  deliveryMethod?: LearningDeliveryMethod
  difficultyLevel?: LearningDifficultyLevel
  estimatedDurationMinutes?: number
  cpdMinutes?: number
  isMandatory?: boolean
  requiresAssessment?: boolean
  requiresPracticalAssessment?: boolean
  requiresManagerApproval?: boolean
  requiresTrainingEvent?: boolean
  passingScore?: number
  maximumAttempts?: number
  certificateEnabled?: boolean
  certificateValidityDays?: number
  refresherFrequencyDays?: number
}

export type LearningCourseVersion = {
  id: string
  courseId: string
  versionNumber: number
  versionLabel?: string | null
  titleSnapshot?: string | null
  descriptionSnapshot?: string | null
  passingScore?: number | null
  maximumAttempts?: number | null
  estimatedDurationMinutes?: number | null
  cpdMinutes?: number | null
  certificateValidityDays?: number | null
  refresherFrequencyDays?: number | null
  publishedAt?: string | null
  publishedById?: string | null
  changeSummary?: string | null
  status: LearningCourseStatus
  createdAt?: string
  updatedAt?: string
  sections?: LearningSection[]
  assessments?: LearningAssessment[]
}

export type LearningSection = {
  id: string
  title: string
  description?: string | null
  displayOrder?: number
  isRequired?: boolean
  estimatedDurationMinutes?: number | null
  contentItems?: LearningContentItem[]
}

export type LearningSectionInput = {
  title: string
  description?: string
  displayOrder?: number
  isRequired?: boolean
  estimatedDurationMinutes?: number
}

export type LearningContentItem = {
  id: string
  contentType: LearningContentType
  title: string
  description?: string | null
  contentBody?: string | null
  fileId?: string | null
  videoUrl?: string | null
  externalUrl?: string | null
  displayOrder?: number
  isRequired?: boolean
  completionRule?: LearningCompletionRule | null
  minimumTimeSpentSeconds?: number | null
}

export type LearningContentItemInput = {
  contentType: LearningContentType
  title: string
  description?: string
  contentBody?: string
  fileId?: string
  videoUrl?: string
  externalUrl?: string
  displayOrder?: number
  isRequired?: boolean
  completionRule?: LearningCompletionRule
  minimumTimeSpentSeconds?: number
}

export type LearningAssessment = {
  id: string
  title: string
  instructions?: string | null
  passingScore: number
  maximumAttempts?: number | null
  timeLimitMinutes?: number | null
  randomiseQuestions?: boolean
  randomiseAnswers?: boolean
  isRequired?: boolean
  questions?: LearningAssessmentQuestion[]
}

export type LearningAssessmentInput = {
  title: string
  instructions?: string
  passingScore: number
  maximumAttempts?: number
  timeLimitMinutes?: number
  randomiseQuestions?: boolean
  randomiseAnswers?: boolean
  isRequired?: boolean
}

export type LearningAssessmentQuestion = {
  id: string
  questionType: LearningQuestionType
  questionText: string
  explanation?: string | null
  points?: number
  displayOrder?: number
  options?: LearningAssessmentOption[]
}

export type LearningAssessmentOption = {
  id: string
  optionText: string
  isCorrect?: boolean
  displayOrder?: number
}

export type LearningAssessmentQuestionInput = {
  questionType: LearningQuestionType
  questionText: string
  explanation?: string
  points?: number
  displayOrder?: number
  options?: Array<{ optionText: string; isCorrect?: boolean; displayOrder?: number }>
}

export type LearningAssignment = {
  id: string
  assignmentType: LearningAssignmentType
  courseId: string
  courseTitle?: string | null
  courseCode?: string | null
  courseVersionId?: string | null
  pathwayId?: string | null
  employeeId?: string | null
  employeeName?: string | null
  locationId?: string | null
  workAreaId?: string | null
  roleId?: string | null
  assignedAt: string
  availableFrom?: string | null
  dueAt?: string | null
  priority?: LearningAssignmentPriority | null
  isMandatory?: boolean
  assignmentReason?: string | null
  status: LearningAssignmentStatus
  completedAt?: string | null
  cancelledAt?: string | null
  exemptAt?: string | null
}

export type LearningAssignmentInput = {
  assignmentType: LearningAssignmentType
  courseId: string
  courseVersionId?: string
  pathwayId?: string
  employeeId?: string
  availableFrom?: string
  dueAt?: string
  priority?: LearningAssignmentPriority
  isMandatory?: boolean
  assignmentReason?: string
}

export type BulkLearningAssignmentInput = {
  courseId: string
  courseVersionId?: string
  employeeIds?: string[]
  roleIds?: string[]
  locationIds?: string[]
  workAreaIds?: string[]
  dueAt?: string
  assignmentReason?: string
}

export type BulkLearningAssignmentResult = {
  parentAssignmentId: string
  createdCount: number
  skipped: Array<{ employeeId: string; reason: string }>
}

export type LearningComplianceSnapshot = {
  id: string
  employeeId: string
  courseId: string
  employeeName?: string | null
  courseTitle?: string | null
  courseCode?: string | null
  complianceStatus: LearningComplianceStatus | string
  assignmentId?: string | null
  dueAt?: string | null
  expiresAt?: string | null
  isExempt?: boolean
  statusReason?: string | null
  lastCalculatedAt: string
}

export type LearningCertificate = {
  id: string
  employeeId: string
  employeeName?: string | null
  courseId: string
  courseTitle?: string | null
  courseCode?: string | null
  cpdMinutes?: number | null
  assignmentId?: string | null
  certificateNumber?: string | null
  verificationCode?: string | null
  issuedAt: string
  expiresAt?: string | null
  status: LearningCertificateStatus
  revokedAt?: string | null
  revocationReason?: string | null
  issuedById?: string | null
  issueNotes?: string | null
}

export type LearningTrainingEvent = {
  id: string
  title: string
  courseId?: string | null
  courseVersionId?: string | null
  trainerName?: string | null
  trainerEmployeeId?: string | null
  deliveryMethod?: LearningDeliveryMethod | null
  location?: string | null
  virtualMeetingUrl?: string | null
  startAt: string
  endAt: string
  registrationDeadline?: string | null
  capacity?: number | null
  status?: string
  attendees?: LearningTrainingEventAttendee[]
  createdAt?: string
}

export type LearningTrainingEventAttendee = {
  id: string
  employeeId: string
  bookingStatus?: LearningBookingStatus
  attendanceStatus?: LearningAttendanceStatus | null
}

export type LearningTrainingEventInput = {
  title: string
  courseId?: string
  courseVersionId?: string
  trainerName?: string
  trainerEmployeeId?: string
  deliveryMethod?: LearningDeliveryMethod
  location?: string
  virtualMeetingUrl?: string
  startAt: string
  endAt: string
  registrationDeadline?: string
  capacity?: number
}

export type LearningExternalTraining = {
  id: string
  employeeId: string
  courseName: string
  trainingProvider?: string | null
  qualificationName?: string | null
  completedAt: string
  expiresAt?: string | null
  cpdMinutes?: number | null
  verificationStatus: LearningExternalTrainingVerificationStatus
  verificationNotes?: string | null
  createdAt?: string
}

export type LearningExternalTrainingInput = {
  employeeId: string
  courseName: string
  trainingProvider?: string
  qualificationName?: string
  completedAt: string
  expiresAt?: string
  cpdMinutes?: number
}

export type LearningSettings = {
  id?: string
  defaultExpiryWarningDays?: number
  defaultAssignmentDueDays?: number
  allowEmployeeExternalTrainingSubmission?: boolean
  requireManagerApprovalForExternalTraining?: boolean
  automaticRefresherAssignment?: boolean
  automaticOverdueEscalation?: boolean
  defaultCertificateValidityDays?: number
  allowCourseAccessAfterExpiry?: boolean
  allowCourseRetakeAfterPass?: boolean
  complianceCalculationMode?: string
}

export type EmployeeLearningEligibility = {
  eligible: boolean
  warnings: string[]
  restrictions: string[]
}

export const LEARNING_COURSE_TYPE_OPTIONS: Array<{ value: LearningCourseType; label: string }> = [
  { value: 'COURSE', label: 'Course' },
  { value: 'POLICY', label: 'Policy' },
  { value: 'ASSESSMENT', label: 'Assessment' },
  { value: 'PRACTICAL_COMPETENCY', label: 'Practical competency' },
  { value: 'EXTERNAL_TRAINING', label: 'External training' },
  { value: 'CLASSROOM', label: 'Classroom' },
  { value: 'WEBINAR', label: 'Webinar' },
  { value: 'BLENDED', label: 'Blended' },
]

export const LEARNING_DELIVERY_METHOD_OPTIONS: Array<{ value: LearningDeliveryMethod; label: string }> = [
  { value: 'ONLINE', label: 'Online' },
  { value: 'FACE_TO_FACE', label: 'Face to face' },
  { value: 'VIRTUAL', label: 'Virtual' },
  { value: 'WORKPLACE', label: 'Workplace' },
  { value: 'BLENDED', label: 'Blended' },
]

export const LEARNING_CONTENT_TYPE_OPTIONS: Array<{ value: LearningContentType; label: string }> = [
  { value: 'TEXT', label: 'Text' },
  { value: 'IMAGE', label: 'Image' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'AUDIO', label: 'Audio' },
  { value: 'PDF', label: 'PDF' },
  { value: 'DOCUMENT', label: 'Document' },
  { value: 'EXTERNAL_LINK', label: 'External link' },
  { value: 'CHECKLIST', label: 'Checklist' },
  { value: 'SCENARIO', label: 'Scenario' },
  { value: 'ACKNOWLEDGEMENT', label: 'Acknowledgement' },
  { value: 'DOWNLOAD', label: 'Download' },
]

export const LEARNING_QUESTION_TYPE_OPTIONS: Array<{ value: LearningQuestionType; label: string }> = [
  { value: 'SINGLE_CHOICE', label: 'Single choice' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple choice' },
  { value: 'TRUE_FALSE', label: 'True / false' },
  { value: 'SHORT_TEXT', label: 'Short text' },
  { value: 'LONG_TEXT', label: 'Long text' },
]
