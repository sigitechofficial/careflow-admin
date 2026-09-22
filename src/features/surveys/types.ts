export type SurveyTargetKind = 'EMPLOYEE' | 'SERVICE_USER'
export type SurveyStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED'
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
  questionCount: number
  recipientCount: number
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
  createdAt: string
  updatedAt: string
  recipientCount: number
  responseCount: number
  questions: SurveyQuestion[]
}

export type SurveyResults = {
  recipients: number
  completed: number
  responseRate: number
}

export type SurveyListFilters = {
  status?: SurveyStatus
  targetKind?: SurveyTargetKind
}

export type CreateSurveyInput = {
  title: string
  description?: string
  targetKind?: SurveyTargetKind
  isAnonymous?: boolean
}

export type UpdateSurveyInput = Partial<CreateSurveyInput> & {
  status?: SurveyStatus
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
  status: SurveyStatus
}
