export enum AssessmentCompletionSource {
  INITIAL_ASSESSMENT = 'INITIAL_ASSESSMENT',
  MANUAL = 'MANUAL',
  CARE_PLAN = 'CARE_PLAN',
}

export type AssessmentCompletionUser = {
  id?: string | null
  firstName?: string | null
  lastName?: string | null
  name?: string | null
  email?: string | null
}

export type AssessmentReviewQueueItem = {
  serviceUserId: string
  serviceUserName: string | null
  assessmentId: string
  assessmentKey: string
  assessmentTitle: string
  latestCompletionId: string | null
  latestCompletedAt: string | null
  review: AssessmentReviewState
  queueReasons: string[]
}

export type AssessmentReviewQueueMeta = {
  total: number
  overdueCount: number
  dueSoonCount: number
}

export type AssessmentReviewState = {
  status: 'not_started' | 'ok' | 'due_soon' | 'overdue' | 'event_driven'
  scheduleKind: 'interval' | 'event_driven'
  effectiveIntervalDays: number | null
  nextReviewDueAt: string | null
  lastCompletedAt: string | null
  guidanceSource: string
  guidanceSummary: string
  alertActive: boolean
}

export type ServiceUserAssessmentLine = {
  assessmentKey: string
  title: string
  summary?: string | null
  latestCompletionId?: string | null
  latestCompletedAt?: string | null
  latestCompletedBy?: AssessmentCompletionUser | string | null
  latestCompletionSource?: AssessmentCompletionSource | null
  review?: AssessmentReviewState | null
}

export type AssessmentCompletion = {
  id: string
  assessmentKey: string
  assessmentTitle?: string | null
  summary?: string | null
  source: AssessmentCompletionSource
  completedAt?: string | null
  completedBy?: AssessmentCompletionUser | string | null
  data?: Record<string, unknown> | null
  sourceSectionId?: number | null
  carePlanLinks?: AssessmentCarePlanLink[]
}

export type AssessmentCarePlanLink = {
  id: string
  carePlanFormId: string
  carePlanFormName?: string | null
  linkedAt?: string | null
  autoLinked?: boolean
}

export type AssessmentCatalogueItem = {
  assessmentKey: string
  title: string
  description?: string | null
  source?: AssessmentCompletionSource | null
}

export type AssessmentCatalogue = {
  tools: AssessmentCatalogueItem[]
  carePathwayForms: AssessmentCatalogueItem[]
}

export type CarePlanAssessmentLink = {
  id: string
  completionId: string
  carePlanFormId: string
  serviceUserId: string
  linkedAt: string
  linkedById?: string | null
  completion?: AssessmentCompletion | null
}
