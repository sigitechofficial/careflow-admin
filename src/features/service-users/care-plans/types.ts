export type CarePlanInstanceDisplayStatus =
  | 'NOT_STARTED'
  | 'DRAFT'
  | 'PUBLISHED'
  | 'PUBLISHED_WITH_DRAFT'

export type CarePlanDraftPayload = {
  values: Record<string, string | boolean>
  composedFrom?: Record<string, unknown> | null
  gaps?: unknown[] | null
  updatedAt?: string | null
  updatedById?: string | null
}

export type CarePlanPublishedVersionSummary = {
  id: string
  versionNumber: number
  summary?: string | null
  publishedAt: string
  publishedById?: string | null
  supersededAt?: string | null
  isCurrent?: boolean
}

export type CarePlanInstance = {
  id: string
  serviceUserId: string
  carePathwayFormId: string
  carePathwayFormVersionId?: string | null
  status: 'DRAFT' | 'PUBLISHED'
  displayStatus: CarePlanInstanceDisplayStatus
  nextReviewDueAt?: string | null
  lastReviewedAt?: string | null
  lastReviewedById?: string | null
  createdAt: string
  updatedAt: string
  draft?: CarePlanDraftPayload | null
  latestPublishedVersion?: CarePlanPublishedVersionSummary | null
  formName?: string | null
  pictureUrl?: string | null
  review?: CarePlanReviewState | null
}

export type CarePlanPublishedVersionDetail = CarePlanPublishedVersionSummary & {
  instanceId: string
  values: Record<string, string | boolean>
  composedFrom?: Record<string, unknown> | null
  signatures?: Record<string, unknown> | null
}

export type CarePlanReviewStatus = 'none' | 'ok' | 'due_soon' | 'overdue'

export type CarePlanReviewState = {
  status: CarePlanReviewStatus
  nextReviewDueAt: string | null
  lastReviewedAt: string | null
  intervalDays: number | null
  guidanceSummary: string | null
}

export type CarePlanComposeEvidence = {
  id: string
  source: 'ia' | 'about_me' | 'profile' | 'contacts' | 'allergies' | 'emar' | 'medication_pack'
  label: string
  value: string
  route?: string
}

export type CarePlanComposeGap = {
  fieldKey: string
  label: string
  severity: 'blocking' | 'warning'
  fixes: Array<{ label: string; route: string }>
}

export type CarePlanComposeDelta = {
  fieldKey: string
  label: string
  publishedValue: string | boolean | null
  composedValue: string | boolean | null
}

export type CarePlanConditionFactsheet = {
  code: string
  title: string
  summary: string
  contentHtml: string
  plainText: string
}

export type CarePlanComposeResult = {
  carePathwayFormId: string
  formName: string
  values: Record<string, string | boolean>
  fieldSources: Record<string, string>
  gaps: CarePlanComposeGap[]
  evidence: CarePlanComposeEvidence[]
  factsheets?: CarePlanConditionFactsheet[]
  composedFrom: Record<string, unknown>
  deltas?: CarePlanComposeDelta[]
  lastPublishedVersionNumber?: number | null
  suggestionMode?: 'explicit'
  suggestions?: CarePlanFieldSuggestion[]
  previousAssessments?: CarePlanPreviousAssessment[]
  iaStatus?: 'SUBMITTED' | 'REVIEWED' | null
}

export type CarePlanSuggestionKind = 'value' | 'context'

export type CarePlanSuggestionSourceQuestion = {
  questionId: string
  questionFieldKey?: string
  specRef?: string
  sourceSection: string
  sourceLabel: string
  sourceValue: string
}

export type CarePlanFieldSuggestion = {
  id: string
  kind: CarePlanSuggestionKind
  targetFieldKey: string
  targetLabel: string
  targetFieldType: string
  suggestedValue: string | boolean | null
  displayText: string
  sourceType: 'INITIAL_ASSESSMENT'
  submissionId: string
  sourceDate: string | null
  questionId?: string
  questionFieldKey?: string
  specRef?: string
  sourceSection?: string
  sourceLabel?: string
  sourceValue?: string
  sourceQuestions: CarePlanSuggestionSourceQuestion[]
  transform: 'direct' | 'typed' | 'narrative' | 'join' | 'context'
}

export type CarePlanPreviousAssessment = {
  submissionId: string
  submittedAt: string | null
  status: 'SUBMITTED' | 'REVIEWED'
  suggestions: CarePlanFieldSuggestion[]
}

export type CarePlanFieldProvenance = {
  sourceType: 'INITIAL_ASSESSMENT'
  submissionId: string
  questionId?: string
  sourceQuestions?: CarePlanSuggestionSourceQuestion[]
  acceptedAt: string
  acceptedById?: string | null
  originalValue: string | boolean | null
  sourceDate: string | null
  userEdited?: boolean
}
