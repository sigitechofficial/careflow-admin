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

export type LearningCourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'SUPERSEDED' | 'UNDER_REVIEW' | 'WITHDRAWN'
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
  | 'PASSED'
  | 'FAILED'
  | 'OVERDUE'
  | 'EXPIRED'
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
/** Must match the API enums (corrected 13 Nov 2026). */
export type LearningBookingStatus = 'INVITED' | 'BOOKED' | 'WAITLISTED' | 'CANCELLED'
export type LearningAttendanceStatus =
  | 'INVITED'
  | 'BOOKED'
  | 'WAITLISTED'
  | 'ATTENDED'
  | 'PARTIALLY_ATTENDED'
  | 'ABSENT'
  | 'CANCELLED'
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
/** Status tabs on the Assignments page (16 Nov 2026). */
export type LearningAssignmentStatusGroup =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'OVERDUE'
  | 'COMPLETED'
  | 'NOT_COMPLETED'
  | 'NOT_PASSED'
  | 'INCOMPLETE'
  | 'CANCELLED'
export type LearningAssignmentListParams = LearningListParams & {
  statusGroup?: LearningAssignmentStatusGroup
  /** Only courses given from another record (17 Nov 2026). */
  source?: 'INCIDENT'
  employeeId?: string
  courseId?: string
}
export type LearningAssignmentStatusCounts = Record<LearningAssignmentStatusGroup | 'ALL', number>
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
  /** Certificates page tabs (17 Nov 2026). */
  status?: 'ACTIVE' | 'EXPIRED'
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
  /** Learning dashboard (17 Nov 2026). */
  sessionsNeedAttendance?: number
  nextSessions?: Array<{
    id: string
    title: string
    courseTitle: string | null
    startAt: string
    endAt: string
    booked: number
  }>
  mandatoryCoursesLowest?: Array<{ courseId: string; title: string; owed: number; completed: number }>
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
  /** Course list only: number of the version in draft, if any (a published course's next version). */
  draftVersionNumber?: number | null
  /** Course list only: number of the live (published) version, if any. */
  publishedVersionNumber?: number | null
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
  cpdMinutes?: number | null
  isMandatory?: boolean
  requiresAssessment?: boolean
  requiresPracticalAssessment?: boolean
  requiresManagerApproval?: boolean
  requiresTrainingEvent?: boolean
  passingScore?: number
  maximumAttempts?: number
  certificateEnabled?: boolean
  /** Null = use the Learning settings default (defaultCertificateValidityDays). */
  certificateValidityDays?: number | null
  /** Set = refresher assigned when the certificate expires; null = none. */
  refresherFrequencyDays?: number | null
  /** Saved on the draft version. */
  learningObjectives?: string
  /** Practical competency on the draft version; null removes it. */
  competencyId?: string | null
}

/** Course types a new course can use, with the delivery methods allowed for each (mirrors the API). */
export const CREATABLE_COURSE_TYPES: Array<{
  value: LearningCourseType
  label: string
  description: string
  deliveryMethods: LearningDeliveryMethod[]
}> = [
  {
    value: 'COURSE',
    label: 'Training course',
    description: 'Lessons and optional quizzes',
    // Blended removed for new courses (16 Nov 2026); the label stays for existing ones.
    deliveryMethods: ['ONLINE', 'FACE_TO_FACE', 'VIRTUAL'],
  },
  {
    value: 'ASSESSMENT',
    label: 'Assessment only',
    description: 'A standalone quiz, no lessons needed',
    deliveryMethods: ['ONLINE'],
  },
  {
    value: 'PRACTICAL_COMPETENCY',
    label: 'Practical competency',
    description: 'A skill checked by an assessor',
    deliveryMethods: ['WORKPLACE', 'FACE_TO_FACE'],
  },
]

/**
 * One "Course type" in the admin (user, 17 Nov 2026): Online, Face to face or Workplace.
 * Stored as courseType COURSE + the delivery method; old Assessment only / Practical courses
 * are shown under the matching type.
 */
export type LearningCourseKind = 'ONLINE' | 'FACE_TO_FACE' | 'WORKPLACE'
export const LEARNING_COURSE_KINDS: Array<{ value: LearningCourseKind; label: string; description: string }> = [
  {
    value: 'ONLINE',
    label: 'Online',
    description: 'The carer does it in the app: lessons and/or a quiz. Certificate when passed.',
  },
  {
    value: 'FACE_TO_FACE',
    label: 'Face to face',
    description:
      'A session with a trainer. The office starts it and marks lessons and attendance. Any quiz is done in the app. A manager records the result.',
  },
  {
    value: 'WORKPLACE',
    label: 'Workplace',
    description:
      'On the job. The office starts it and marks lessons. Any quiz is done in the app. A manager records the result. No session.',
  },
]
export function courseKindOf(course: {
  courseType?: string | null
  deliveryMethod?: string | null
}): LearningCourseKind {
  if (course.deliveryMethod === 'FACE_TO_FACE') return 'FACE_TO_FACE'
  if (course.deliveryMethod === 'WORKPLACE' || course.courseType === 'PRACTICAL_COMPETENCY') return 'WORKPLACE'
  return 'ONLINE'
}
export function courseKindLabel(course: { courseType?: string | null; deliveryMethod?: string | null }): string {
  const kind = courseKindOf(course)
  return LEARNING_COURSE_KINDS.find(k => k.value === kind)?.label ?? 'Online'
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
  requiresAssessment?: boolean
  requiresPracticalAssessment?: boolean
  requiresManagerApproval?: boolean
  certificateEnabled?: boolean
  learningObjectives?: string | null
  competencyId?: string | null
  /** Competency checklist frozen at publish. */
  competencyChecklistSnapshot?: string[] | null
  publishedAt?: string | null
  publishedById?: string | null
  changeSummary?: string | null
  status: LearningCourseStatus
  createdAt?: string
  updatedAt?: string
  sections?: LearningSection[]
  assessments?: LearningAssessment[]
  /** Version history list only. */
  publishedByName?: string | null
  sectionCount?: number
  lessonCount?: number
  quizCount?: number
  assignmentCount?: number
}

export type LearningCourseStatusCounts = {
  PUBLISHED: number
  DRAFT: number
  WITHDRAWN: number
  ARCHIVED: number
}

export type LearningPublishStep =
  | 'Details'
  | 'Course outline'
  | 'Final assessment'
  | 'Finish and certificate'
  | 'Review and publish'
export type LearningPublishIssue = { code: string; message: string; step: LearningPublishStep }
export type LearningPublishCheck = {
  versionId: string
  versionNumber: number
  changeSummaryRequired: boolean
  canPublish: boolean
  blockers: LearningPublishIssue[]
  warnings: LearningPublishIssue[]
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
  /** Rough time for the carer, in minutes. */
  estimatedDurationMinutes?: number | null
  /** Uploaded file (image / PDF / Word) with a short-lived signed link. */
  file?: LearningFileInfo | null
}

export type LearningFileInfo = {
  id: string
  originalName: string
  mimeType: string
  fileSize: number
  /** Short-lived signed link (relative to the API). */
  url: string
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
  estimatedDurationMinutes?: number | null
}

export type LearningAssessment = {
  id: string
  /** Module the quiz belongs to; null = final assessment (always required). */
  sectionId?: string | null
  displayOrder?: number
  title: string
  instructions?: string | null
  passingScore: number
  maximumAttempts?: number | null
  retakeDelayMinutes?: number | null
  timeLimitMinutes?: number | null
  randomiseQuestions?: boolean
  randomiseAnswers?: boolean
  isRequired?: boolean
  questions?: LearningAssessmentQuestion[]
}

export type LearningAssessmentInput = {
  /** Create only: module of the draft version; leave out for a final assessment. */
  sectionId?: string
  title: string
  instructions?: string
  passingScore: number
  /** Null = no limit. */
  maximumAttempts?: number | null
  /** Minutes before another attempt; null = no wait. */
  retakeDelayMinutes?: number | null
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

/** Question types an admin can add (free text cannot be marked automatically). */
export const AUTHORABLE_QUESTION_TYPES: Array<{ value: LearningQuestionType; label: string; hint: string }> = [
  { value: 'SINGLE_CHOICE', label: 'One correct answer', hint: 'The carer picks one answer' },
  { value: 'MULTIPLE_CHOICE', label: 'Several correct answers', hint: 'The carer ticks every correct answer' },
  { value: 'TRUE_FALSE', label: 'True or false', hint: 'Answers are True and False' },
]

export type LearningCompetency = {
  id: string
  categoryId?: string | null
  name: string
  code: string
  description?: string | null
  validityDays?: number | null
  assessmentCriteria?: string[] | null
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export type LearningCompetencyInput = {
  name: string
  code: string
  categoryId?: string
  description?: string
  validityDays?: number | null
  assessmentCriteria: string[]
  isActive?: boolean
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
  sourceEntityType?: string | null
  sourceEntityId?: string | null
  status: LearningAssignmentStatus
  completedAt?: string | null
  completedLate?: boolean
  cancelledAt?: string | null
  exemptAt?: string | null
  /** Course delivery method (list only). */
  deliveryMethod?: LearningDeliveryMethod | null
  /** Pass / fail for finished rows (list only). */
  result?: LearningAssignmentResult | null
  /** Why course and carer can't be edited (18 Nov 2026): carer started it, or it is booked on a session. */
  courseCarerLock?: 'STARTED' | 'BOOKED' | null
}

export type LearningAssignmentResult = {
  result: 'PASSED' | 'NOT_PASSED' | 'EXPIRED'
  /** MANAGER = outcome recorded by a manager; QUIZ = final quiz; null = completed without a final quiz. */
  by: 'MANAGER' | 'MANAGER_QUIZ' | 'QUIZ' | null
  score: number | null
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
  /** Own due date per chosen carer; others get dueAt (or the settings default). */
  employeeDueDates?: Array<{ employeeId: string; dueAt: string }>
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
  course?: { id: string; title: string; code: string } | null
  bookedCount?: number
  attendedCount?: number
  cantAttendCount?: number
}

export type LearningTrainingEventAttendee = {
  id: string
  employeeId: string
  employeeName?: string
  assignmentId?: string | null
  assignmentStatus?: LearningAssignmentStatus | null
  assignmentDueAt?: string | null
  bookingStatus?: LearningBookingStatus
  attendanceStatus?: LearningAttendanceStatus | null
  cantAttendReason?: string | null
  cantAttendAt?: string | null
}

/** Carers with the session's course assigned who are not on the session yet. */
export type LearningEligibleAttendee = {
  assignmentId: string
  employeeId: string
  employeeName: string
  assignmentStatus: LearningAssignmentStatus
  dueAt: string | null
  bookedOnOtherSession: boolean
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

// ─── Overdue / late review (16 Nov 2026) ─────────────────────
export type LearningReviewOption = { code: string; label: string; group?: string; formal?: boolean }
export type LearningReviewOptions = { reasons: LearningReviewOption[]; actions: LearningReviewOption[] }

export type LearningAssignmentRecord = {
  id: string
  status: LearningAssignmentStatus
  needsOutcome: boolean
  managerApprovalStatus: string | null
  completedLate: boolean
  employeeId: string | null
  employeeName: string | null
  course: { id: string; title: string; code: string; courseType: string; deliveryMethod: string }
  assignedAt: string
  assignedByName: string | null
  assignmentReason: string | null
  /** Where the course came from, e.g. an incident's corrective measure (17 Nov 2026). */
  source?: { type: 'Incident'; id: string; reference: string | null } | null
  dueAt: string | null
  startedAt: string | null
  lastAccessedAt: string | null
  completedAt: string | null
  progressPercentage: number
  lessons: Array<{
    id: string
    moduleTitle: string
    title: string
    contentType: string
    isRequired: boolean
    completedAt: string | null
    timeSpentSeconds: number | null
    /** Office user who marked it (face to face). */
    markedByName?: string | null
  }>
  /** Face to face: the office marks lessons; the carer only views them. */
  lessonsMarkedByTrainer?: boolean
  /** Practical test checklist and its sign-offs (17 Nov 2026); null when the course has none. */
  practical?: {
    competencyName: string
    validityDays: number | null
    checklist: string[]
    signoffs: Array<{
      id: string
      assessmentDate: string
      location: string | null
      competent: boolean
      assessorName: string | null
      note: string | null
      nextSteps: string | null
      createdAt: string
      results: Array<{ criterion: string; met: boolean; comment: string | null }>
    }>
  } | null
  hasRequiredQuiz?: boolean
  /** Why the outcome can't be recorded yet (face to face), or null. */
  outcomeBlockedReason?: string | null
  quizzes: Array<{
    id: string
    title: string
    isFinal: boolean
    isRequired: boolean
    passingScore: number
    maximumAttempts: number | null
    attempts: Array<{
      id: string
      attemptNumber: number
      startedAt: string
      submittedAt: string | null
      percentage: number | null
      result: string
      correct: number
      answered: number
      questions: Array<{
        id: string
        questionText: string
        questionType: string
        explanation: string | null
        answered: boolean
        isCorrect: boolean
        textAnswer: string | null
        options: Array<{ id: string; optionText: string; isCorrect: boolean; chosen: boolean }>
      }>
    }>
  }>
  sessions: Array<{
    attendeeId: string
    title: string
    startAt: string
    endAt: string
    eventStatus: string
    bookingStatus: string
    attendanceStatus: string
    cantAttendReason: string | null
    cantAttendAt: string | null
  }>
  certificate: { id: string; certificateNumber: string; issuedAt: string; expiresAt: string | null; status: string } | null
  reviews: Array<{
    id: string
    kind:
      | 'EXTENDED'
      | 'REASON'
      | 'NOT_COMPLETED'
      | 'CARER_LATE_REASON'
      | 'OUTCOME_PASSED'
      | 'OUTCOME_PASSED_AFTER_QUIZ'
      | 'OUTCOME_NOT_PASSED'
      | 'ASSIGNED_AGAIN'
    reasonCode: string | null
    reasonLabel: string | null
    actionCodes: string[]
    actionLabels: string[]
    note: string | null
    previousDueAt: string | null
    newDueAt: string | null
    followUpAt: string | null
    policy: { versionId: string; documentId: string; title: string; version: string } | null
    createdByName: string | null
    createdAt: string
  }>
}

export type ExtendAssignmentInput = { dueAt: string; reasonCode?: string; note: string; policyVersionId?: string }
export type RecordAssignmentReviewInput = {
  kind: 'REASON' | 'NOT_COMPLETED'
  reasonCode?: string
  actionCodes?: string[]
  note?: string
  followUpAt?: string
  reassignDueAt?: string
  policyVersionId?: string
}

export type RecordOutcomeInput = {
  result: 'PASSED' | 'PASSED_AFTER_QUIZ' | 'NOT_PASSED'
  note?: string
  reassignDueAt?: string
  policyVersionId?: string
}
export type AssignAgainInput = { dueAt: string; note?: string }

/** Practical test sign-off body (17 Nov 2026). */
export type PracticalSignoffInput = {
  assessmentDate: string
  location?: string
  results: Array<{ criterion: string; met: boolean; comment?: string }>
  competent: boolean
  note?: string
  nextSteps?: string
  reassignDueAt?: string
}
