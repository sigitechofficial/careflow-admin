export type SafeguardingStatus =
  | 'RAISED'
  | 'SCREENING'
  | 'INVESTIGATING'
  | 'REFERRED'
  | 'CLOSED'

export type SafeguardingRisk = 'LOW' | 'MEDIUM' | 'HIGH'

export type SafeguardingCategory =
  | 'PHYSICAL'
  | 'EMOTIONAL'
  | 'SEXUAL'
  | 'FINANCIAL'
  | 'NEGLECT'
  | 'SELF_NEGLECT'
  | 'DISCRIMINATORY'
  | 'ORGANISATIONAL'
  | 'DOMESTIC_ABUSE'
  | 'MODERN_SLAVERY'
  | 'OTHER'

export type SafeguardingReferralDecision = 'NOT_REQUIRED' | 'PENDING' | 'MADE'

export type SafeguardingAction =
  | 'SCREEN'
  | 'START_INVESTIGATION'
  | 'REFER'
  | 'CLOSE'
  | 'REOPEN'

export type SafeguardingEvent = {
  id: string
  action: string
  note: string | null
  userId: string | null
  userName: string | null
  at: string
}

export type PersonSafe = 'YES' | 'NO' | 'NOT_KNOWN'
export type Capacity = 'YES' | 'NO' | 'FLUCTUATING' | 'NOT_ASSESSED'
export type MeetingHeld = 'YES' | 'NO' | 'PLANNED'

export type SafeguardingCheck = { key: string; label: string; ok: boolean | null }
export type SafeguardingAlert = { text: string; tone: 'bad' | 'warn' }

export type SafeguardingCase = {
  id: string
  referenceNumber: string
  status: SafeguardingStatus
  category: SafeguardingCategory
  riskLevel: SafeguardingRisk
  aboutServiceUserId: string | null
  personDescription: string | null
  locationId: string | null
  handlerEmployeeId: string | null
  raisedByRole: string | null
  raisedAt: string
  description: string
  immediateAction: string | null
  laReferral: SafeguardingReferralDecision
  laReference: string | null
  laReferredAt: string | null
  cqcNotified: SafeguardingReferralDecision
  cqcReference: string | null
  outcome: string | null
  lessonsLearned: string | null
  closedAt: string | null
  serviceUserName: string | null
  locationName: string | null
  leadUserId: string | null
  leadName: string | null
  reviewDate: string | null
  reviewOverdue: boolean
  reportedToManagerAt: string | null
  personSafe: PersonSafe | null
  safetyMeasures: string | null
  personWords: string | null
  evidence: string | null
  personWants: string | null
  capacity: Capacity | null
  agencies: string[]
  agenciesOther: string | null
  meetingHeld: MeetingHeld | null
  meetingDate: string | null
  protectionPlan: string | null
  checks: SafeguardingCheck[]
  checkScore: { passed: number; of: number; pct: number | null }
  alerts: SafeguardingAlert[]
  createdAt: string
  updatedAt: string
  events: SafeguardingEvent[]
}

export type SafeguardingSummary = {
  total: number
  open: number
  byStatus: Record<string, number>
  byRisk: Record<string, number>
  highRisk: number
  laPending: number
  cqcPending: number
  reviewsOverdue: number
  noLead: number
  newThisMonth: number
  auditPct: number | null
  alerts: Array<SafeguardingAlert & { caseId: string; referenceNumber: string }>
}

export type SafeguardingLead = { id: string; name: string }

export type ListSafeguardingParams = {
  status?: SafeguardingStatus
  category?: SafeguardingCategory
  riskLevel?: SafeguardingRisk
  aboutServiceUserId?: string
  /** Header branch filter. */
  locationId?: string
}

export type CreateSafeguardingInput = {
  category: SafeguardingCategory
  riskLevel?: SafeguardingRisk
  aboutServiceUserId?: string
  personDescription?: string
  raisedByRole?: string
  raisedAt?: string
  description: string
  immediateAction?: string
  leadUserId?: string
  reviewDate?: string
}

export type UpdateSafeguardingInput = Partial<
  Omit<CreateSafeguardingInput, 'leadUserId' | 'reviewDate'> & {
    laReferral: SafeguardingReferralDecision
    laReference: string
    cqcNotified: SafeguardingReferralDecision
    cqcReference: string
    outcome: string
    lessonsLearned: string
    laReferredAt: string | null
    reportedToManagerAt: string | null
    personSafe: PersonSafe | null
    safetyMeasures: string
    personWords: string
    evidence: string
    personWants: string
    capacity: Capacity | null
    agencies: string[]
    agenciesOther: string
    meetingHeld: MeetingHeld | null
    meetingDate: string | null
    protectionPlan: string
  }
> & { leadUserId?: string | null; reviewDate?: string | null }

export type TransitionInput = {
  action: SafeguardingAction
  note?: string
  outcome?: string
  lessonsLearned?: string
}
