export type CarePlanInstanceDisplayStatus =
  | 'NOT_STARTED'
  | 'DRAFT'
  | 'PUBLISHED'
  | 'PUBLISHED_WITH_DRAFT'

export type CarePlanDraftApproval = {
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED'
  /** Fingerprint of the submitted content; the approver confirms it when approving. */
  contentHash?: string | null
  submittedAt?: string | null
  submittedById?: string | null
  decidedAt?: string | null
  decidedById?: string | null
  /** Reason given when a manager requested changes. */
  reason?: string | null
}

export type CarePlanRiskSummary = {
  id: string
  submissionId: string
  riskType: string
  description: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  severity: string
  controlMeasures: string | null
  status: 'OPEN' | 'CONTROLLED' | 'CLOSED'
  supersedeReviewRequired: boolean
  supersededBySubmissionId: string | null
}

/** IA risks linked to a care plan, risks available to link, and reassessment review flags. */
export type CarePlanRisks = {
  instanceId: string
  links: Array<{
    id: string
    status: 'LINKED' | 'REVIEW_REQUIRED'
    reviewReason: string | null
    linkedAt: string
    reviewedAt: string | null
    snapshot: unknown
    risk: CarePlanRiskSummary
  }>
  availableRisks: CarePlanRiskSummary[]
  reassessmentFlags: Array<{
    id: string
    status: 'OPEN' | 'RESOLVED'
    changeTypes: string[]
    reason: string
    triggeringSubmissionId: string
    createdAt: string
    resolvedAt: string | null
    resolutionNote: string | null
  }>
}

export type CarePlanTaskReconciliationState = 'LINKED' | 'UNLINKED' | 'REVIEW_REQUIRED' | 'NOT_APPLICABLE'

/** Published care plan vs the service user's existing visit tasks (manager-confirmed links only). */
export type CarePlanTaskReconciliation = {
  instanceId: string
  carePathwayFormId: string
  formName: string
  lifecycleStatus: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'
  publishedVersion: { id: string; versionNumber: number }
  hasStructuredRequirements: boolean
  requirements: Array<{
    key: string
    label: string
    expectedDisplay: string
    state: CarePlanTaskReconciliationState
    linkIds: string[]
  }>
  links: Array<{
    id: string
    requirementKey: string
    requirementLabel: string | null
    state: CarePlanTaskReconciliationState
    reason: string | null
    visitTaskAssignmentId: string | null
    task: { name: string; medicationRoundCode: string; dueTime: string | null } | null
    assignmentInactive: boolean
    requirementGone: boolean
    suggestedReuse: boolean
    confirmedForVersionId: string
    confirmedForVersionNumber: number | null
    confirmedForCurrentVersion: boolean
  }>
  unlinkedAssignments: Array<{ id: string; taskName: string; medicationRoundCode: string; dueTime: string | null }>
  activeAssignments: Array<{ id: string; taskName: string; medicationRoundCode: string; dueTime: string | null }>
  counts: { linked: number; reviewRequired: number; notApplicable: number; unlinkedRequirements: number }
}

/** Operational lifecycle: only ACTIVE published plans are current instructions for carers. */
export type CarePlanLifecycle = {
  status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'
  reason?: string | null
  changedAt?: string | null
  changedById?: string | null
}

export type CarePlanDraftPayload = {
  values: Record<string, string | boolean>
  composedFrom?: Record<string, unknown> | null
  gaps?: unknown[] | null
  updatedAt?: string | null
  updatedById?: string | null
  approval?: CarePlanDraftApproval | null
}

export type CarePlanPublishedVersionSummary = {
  id: string
  versionNumber: number
  summary?: string | null
  publishedAt: string
  publishedById?: string | null
  supersededAt?: string | null
  isCurrent?: boolean
  /** Published for an incident "Care plan update" measure. */
  incident?: { incidentId: string; referenceNumber: string; measureTitle: string } | null
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
  reviewFrequencyMonths?: number | null
  defaultNextReviewDate?: string | null
  createdAt: string
  updatedAt: string
  draft?: CarePlanDraftPayload | null
  latestPublishedVersion?: CarePlanPublishedVersionSummary | null
  formName?: string | null
  pictureUrl?: string | null
  review?: CarePlanReviewState | null
  /** Organisation setting: publishing needs a manager-approved draft. */
  carePlanApprovalRequired?: boolean
  lifecycle?: CarePlanLifecycle | null
  /** Open reassessment review flags / risk links needing review (additive). */
  reassessmentReview?: { required: boolean; riskLinksNeedingReview: number; flags: Array<{ id: string; reason: string }> } | null
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
  intervalMonths: number | null
  intervalDays?: number | null
  guidanceSummary: string | null
}

export type CarePlanReviewSummary = {
  carePlanReviewRequired: boolean
  overdueCount: number
  dueSoonCount: number
  upToDateCount: number
}

export type CarePlanReviewQueueItem = {
  instanceId: string
  serviceUserId: string
  serviceUserName: string
  carePathwayFormId: string
  carePlanName: string
  nextReviewDueAt: string | null
  review: CarePlanReviewState
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
  suggestionMode?: 'explicit' | 'hybrid'
  provenance?: Record<string, CarePlanFieldProvenance>
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
  autoPrefilled?: boolean
}
