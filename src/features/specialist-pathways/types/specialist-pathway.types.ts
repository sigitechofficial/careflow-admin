export type SpecialistPathwayType =
  | 'LEARNING_DISABILITY'
  | 'DEMENTIA'
  | 'END_OF_LIFE'
  | 'CHILDREN'
  | 'SUPPORTED_LIVING'

export type SpecialistPathwayStatus = 'OPEN' | 'ACTIVE' | 'CLOSED'

export type SpecialistPathwayPlanStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'RETURNED'
  | 'SUPERSEDED'

/** One assessment section's stored answers. */
export type PathwaySectionAnswer = {
  fields: Record<string, string>
  verifiedById?: string | null
  verifiedAt?: string | null
}

/** Keyed by section key (see pathway-specs.ts). */
export type PathwaySections = Record<string, PathwaySectionAnswer>

/** One row of the structured care plan: need → outcome → support. */
export type PlanNeed = {
  area: string
  need: string
  outcome: string
  support: string
  whoHelps: string
  frequency: string
}

export type PlanConsent = {
  agreed: boolean
  agreedBy: string
  relationship: string
  date: string
  method: string
}

/** Care-plan body. `goals` / `support` are the v1 (legacy) free-text fields. */
export type PathwayPlanContent = {
  summary?: string
  needs?: PlanNeed[]
  consent?: PlanConsent
  reviewDate?: string
  goals?: string
  support?: string
}

export type PathwayCarePlan = {
  id: string
  caseId: string
  version: number
  status: SpecialistPathwayPlanStatus
  content: PathwayPlanContent
  comment: string | null
  submittedById: string | null
  submittedByName: string | null
  submittedAt: string | null
  decidedById: string | null
  decidedByName: string | null
  decidedAt: string | null
  createdById: string | null
  createdAt: string
  updatedAt: string
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'
export type RiskStatus = 'OPEN' | 'CLOSED'

export type PathwayRisk = {
  id: string
  title: string
  category: string | null
  description: string | null
  likelihood: number
  impact: number
  score: number
  level: RiskLevel
  controls: string | null
  reviewDate: string | null
  status: RiskStatus
  createdAt: string
  updatedAt: string
}

export type ReviewOutcome = 'NO_CHANGE' | 'PLAN_UPDATE_NEEDED' | 'ESCALATED' | 'CASE_CLOSED'

export type PathwayReview = {
  id: string
  reviewedAt: string
  reviewedById: string | null
  reviewedByName: string | null
  outcome: ReviewOutcome
  notes: string | null
  nextReviewDate: string | null
  createdAt: string
}

export type PathwayEvent = {
  id: string
  action: string
  note: string | null
  userId: string | null
  userName: string | null
  at: string
}

export type PathwayCase = {
  id: string
  serviceUserId: string
  serviceUserName: string | null
  pathwayType: SpecialistPathwayType
  ref: string
  status: SpecialistPathwayStatus
  reviewDueDate: string | null
  reviewOverdue: boolean
  sections: PathwaySections
  closedReason: string | null
  createdAt: string
  updatedAt: string
  plans: PathwayCarePlan[]
  risks: PathwayRisk[]
  highestRiskScore: number | null
  reviews: PathwayReview[]
  events: PathwayEvent[]
  professionals: PathwayProfessional[]
  documents: PathwayDocument[]
}

export type PathwayProfessional = {
  id: string
  name: string
  role: string
  organisation: string | null
  phone: string | null
  email: string | null
  notes: string | null
  createdAt: string
}

export type ProfessionalInput = {
  name: string
  role: string
  organisation?: string
  phone?: string
  email?: string
  notes?: string
}

export type PathwayDocument = {
  id: string
  title: string
  category: string | null
  originalName: string
  mimeType: string
  fileSize: number
  uploadedById: string | null
  uploadedByName: string | null
  createdAt: string
}

export type PathwaySummaryCounts = {
  open: number
  closed: number
  reviewsOverdue: number
  plansAwaitingApproval: number
  highRisks: number
}

export type PathwaySummary = {
  totals: PathwaySummaryCounts
  byPathway: Record<SpecialistPathwayType, PathwaySummaryCounts>
}

export type ListPathwayCasesParams = {
  type?: SpecialistPathwayType
  status?: SpecialistPathwayStatus
  serviceUserId?: string
  /** Header branch filter. */
  locationId?: string
}

export type CreatePathwayCaseInput = {
  serviceUserId: string
  pathwayType: SpecialistPathwayType
  sections?: PathwaySections
  reviewDueDate?: string
}

export type UpdatePathwayCaseInput = {
  sections?: PathwaySections
  status?: SpecialistPathwayStatus
  reviewDueDate?: string | null
  closedReason?: string
}

export type RiskInput = {
  title: string
  category?: string
  description?: string
  likelihood: number
  impact: number
  controls?: string
  reviewDate?: string
}

export type ReviewInput = {
  reviewedAt: string
  outcome: ReviewOutcome
  notes?: string
  nextReviewDate?: string
}

export type PlanDecision = 'APPROVE' | 'RETURN'
