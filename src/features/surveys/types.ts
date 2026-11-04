export type SurveyTargetKind = 'EMPLOYEE' | 'SERVICE_USER' | 'PUBLIC'
export type SurveyStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED'
export type SurveyRecurrence = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'

export const SURVEY_TARGET_KIND_LABELS: Record<SurveyTargetKind, string> = {
  EMPLOYEE: 'Employees',
  SERVICE_USER: 'Service users',
  PUBLIC: 'Public',
}

/** Who answered a service-user survey. */
export type SurveyRespondentRelation = 'SELF' | 'FAMILY_MEMBER' | 'REPRESENTATIVE' | 'STAFF'

export const SURVEY_RESPONDENT_RELATION_LABELS: Record<SurveyRespondentRelation, string> = {
  SELF: 'The service user',
  FAMILY_MEMBER: 'Family member',
  REPRESENTATIVE: 'Representative',
  STAFF: 'Staff on their behalf',
}

/** How a response was collected. Telephone / paper / in person are recorded by office staff. */
export type SurveyResponseChannel = 'ONLINE' | 'PORTAL' | 'TELEPHONE' | 'PAPER' | 'IN_PERSON'

export const SURVEY_RESPONSE_CHANNEL_LABELS: Record<SurveyResponseChannel, string> = {
  ONLINE: 'Online',
  PORTAL: 'Portal',
  TELEPHONE: 'Telephone',
  PAPER: 'Paper',
  IN_PERSON: 'In person',
}

export type StaffRecordedChannel = 'TELEPHONE' | 'PAPER' | 'IN_PERSON'

export const SURVEY_RECURRENCE_LABELS: Record<SurveyRecurrence, string> = {
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
}

export type SurveyQuestionType =
  | 'YES_NO'
  | 'SINGLE_SELECT'
  | 'MULTI_SELECT'
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'RATING'
  | 'LIKERT'

export const SURVEY_QUESTION_TYPE_LABELS: Record<SurveyQuestionType, string> = {
  YES_NO: 'Yes / No',
  SINGLE_SELECT: 'Single choice',
  MULTI_SELECT: 'Multiple choice',
  TEXT: 'Short text',
  TEXTAREA: 'Long text',
  NUMBER: 'Number',
  RATING: 'Rating (0–10)',
  LIKERT: 'Agree ↔ Disagree',
}

/** Question types whose answers come from a list of options. */
export const CHOICE_QUESTION_TYPES: SurveyQuestionType[] = ['SINGLE_SELECT', 'MULTI_SELECT']

export type SurveyListItem = {
  id: string
  title: string
  description: string | null
  targetKind: SurveyTargetKind
  status: SurveyStatus
  isAnonymous: boolean
  opensAt: string | null
  closesAt: string | null
  publishedAt: string | null
  distributeAt: string | null
  distributedAt: string | null
  recurrence: SurveyRecurrence | null
  clonedFromId: string | null
  locationIds: string[]
  roleIds: string[]
  isTemplate: boolean
  shareToken: string
  questionCount: number
  recipientCount: number
  completedCount: number
  responseRate: number
  createdById: string | null
  createdByName: string | null
  createdAt: string
  updatedAt: string
}

export type SurveyQuestion = {
  id: string
  questionText: string
  helpText: string | null
  questionType: SurveyQuestionType
  options: string[] | null
  config: Record<string, unknown> | null
  isRequired: boolean
  sortOrder: number
}

export type SurveyDetail = {
  id: string
  title: string
  description: string | null
  targetKind: SurveyTargetKind
  status: SurveyStatus
  isAnonymous: boolean
  opensAt: string | null
  closesAt: string | null
  publishedAt: string | null
  distributeAt: string | null
  distributedAt: string | null
  recurrence: SurveyRecurrence | null
  clonedFromId: string | null
  locationIds: string[]
  roleIds: string[]
  isTemplate: boolean
  shareToken: string
  createdById: string | null
  createdByName: string | null
  createdAt: string
  updatedAt: string
  recipientCount: number
  responseCount: number
  questions: SurveyQuestion[]
}

export type SurveyQuestionOptionSummary = {
  label: string
  count: number
  percent: number
}

export type SurveyQuestionSummary = {
  questionId: string
  questionText: string
  questionType: SurveyQuestionType
  sortOrder: number
  answerCount: number
  options?: SurveyQuestionOptionSummary[]
  numeric?: { average: number | null; min: number | null; max: number | null }
  textSamples?: string[]
}

export type SurveyResults = {
  recipients: number
  completed: number
  responseRate: number
  includesPeriodRuns?: boolean
  questionSummaries?: SurveyQuestionSummary[]
}

export type SurveyResponseAnswer = {
  questionId: string
  questionText: string
  questionType: SurveyQuestionType
  booleanValue: boolean | null
  textValue: string | null
  numberValue: number | null
  selectedOptions: string[] | null
  displayValue: string
}

export type SurveyResponseItem = {
  id: string
  submittedAt: string
  respondentLabel: string
  employeeId: string | null
  serviceUserId?: string | null
  respondentRelation?: SurveyRespondentRelation | null
  respondentName?: string | null
  channel?: SurveyResponseChannel
  /** This response is not linked to anyone. */
  isAnonymous?: boolean
  /** Office user who recorded it (telephone / paper / in person). */
  recordedByName?: string | null
  contactedAt?: string | null
  contactNumber?: string | null
  contactNotes?: string | null
  consentGiven?: boolean | null
  /** Staff-recorded responses can be corrected (with a reason). */
  canEdit?: boolean
  answerCount: number
  answers: SurveyResponseAnswer[]
}

/** A person a response can be recorded for. */
export type SurveyRecordCandidate = {
  id: string
  name: string
  recipientStatus: SurveyRecipientStatus | null
  hasResponse: boolean
}

type RecordedResponseDetails = {
  answers: SurveyAnswerInput[]
  respondentRelation?: SurveyRespondentRelation
  respondentName?: string
  contactedAt?: string
  contactNumber?: string
  contactNotes?: string
}

export type RecordSurveyResponseInput = RecordedResponseDetails & {
  channel: StaffRecordedChannel
  isAnonymous?: boolean
  personId?: string
  consentGiven?: boolean
}

export type UpdateRecordedSurveyResponseInput = RecordedResponseDetails & { reason: string }

export type SurveyResponsesPayload = {
  isAnonymous: boolean
  total: number
  responses: SurveyResponseItem[]
}

export type SurveyRecipientStatus = 'PENDING' | 'SENT' | 'STARTED' | 'COMPLETED'

export type SurveyRecipientItem = {
  id: string
  token: string
  status: SurveyRecipientStatus
  employeeId: string | null
  employeeName: string | null
  serviceUserId: string | null
  serviceUserName: string | null
  sentAt: string | null
  submittedAt: string | null
  respondentRelation: SurveyRespondentRelation | null
  respondentName: string | null
  createdAt: string
}

export type PublicSurveyQuestion = {
  id: string
  questionText: string
  helpText: string | null
  questionType: SurveyQuestionType
  options: string[] | null
  config: Record<string, unknown> | null
  isRequired: boolean
  sortOrder: number
}

export type PublicSurveyForm = {
  title: string
  description: string | null
  isAnonymous: boolean
  status: SurveyStatus
  opensAt: string | null
  closesAt: string | null
  alreadyCompleted: boolean
  canSubmit: boolean
  unavailableReason: string | null
  linkKind?: 'share' | 'recipient'
  /** Service-user links: ask who is answering (self / family member / representative). */
  askRespondent?: boolean
  /** Service-user links: whose survey this is. */
  forName?: string | null
  questions: PublicSurveyQuestion[]
}

export type SurveyAnswerInput = {
  questionId: string
  booleanValue?: boolean
  textValue?: string
  numberValue?: number
  selectedOptions?: string[]
}

export type SubmitSurveyResponseInput = {
  answers: SurveyAnswerInput[]
  respondentRelation?: SurveyRespondentRelation
  respondentName?: string
}

export type SurveyListFilters = {
  status?: SurveyStatus
  targetKind?: SurveyTargetKind
  isTemplate?: boolean
}

export type CreateSurveyInput = {
  title: string
  description?: string
  targetKind?: SurveyTargetKind
  isAnonymous?: boolean
  opensAt?: string
  closesAt?: string
  distributeAt?: string | null
  recurrence?: SurveyRecurrence | null
  locationIds?: string[]
  roleIds?: string[]
  isTemplate?: boolean
}

export type UpdateSurveyInput = Partial<Omit<CreateSurveyInput, 'opensAt' | 'closesAt' | 'description'>> & {
  status?: SurveyStatus
  description?: string | null
  opensAt?: string | null
  closesAt?: string | null
}

export type CreateQuestionInput = {
  questionText: string
  helpText?: string
  questionType: SurveyQuestionType
  options?: string[]
  config?: Record<string, unknown>
  isRequired?: boolean
  sortOrder?: number
}

export type UpdateQuestionInput = Partial<CreateQuestionInput>

export type SendSurveyResult = {
  sent: number
  skippedExisting: number
  /** Service-user surveys: people in scope without an enabled portal account. */
  skippedNoPortal?: number
  status: SurveyStatus
  scheduled?: boolean
  distributeAt?: string | null
  recurrence?: SurveyRecurrence | null
}

/** Portal: a survey sent to the signed-in service user. */
export type PortalSurveyItem = {
  token: string
  title: string
  description: string | null
  sentAt: string | null
  opensAt: string | null
  closesAt: string | null
  state: 'OPEN' | 'UNAVAILABLE' | 'COMPLETED'
  unavailableReason: string | null
  completedAt: string | null
  respondentRelation: SurveyRespondentRelation | null
}

/** Portal: the answers the signed-in service user submitted for one survey. */
export type PortalSurveyAnswers = {
  title: string
  submittedAt: string
  respondentRelation: SurveyRespondentRelation | null
  respondentName: string | null
  answers: { questionId: string; questionText: string; displayValue: string }[]
}
