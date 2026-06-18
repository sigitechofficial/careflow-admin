export type VisitPlanStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'ENDED'

/** Medication administration round code — same catalogue as Settings → Time slots. */
export type VisitPlanSlotCode = string

export type VisitPlanScheduleFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY'

export type VisitPlanRepeatUnit = 'DAYS' | 'WEEKS' | 'MONTHS'

export type VisitPlanMonthlyDayMode = 'BY_DATE' | 'BY_PATTERN'

export type VisitPlanMonthlyOrdinal = 'FIRST' | 'SECOND' | 'THIRD' | 'FOURTH' | 'LAST'

export type VisitPlanSlotKind = 'STANDARD' | 'OVERNIGHT' | 'ONE_OFF'

export type VisitPlanSlotCarerRole = 'LEAD' | 'SECONDARY'

export type VisitPlanSlotExceptionType = 'SKIP' | 'EXTRA'

export type VisitPlanSlotCarerAssignment = {
  id?: string
  dayOfWeek: number | null
  employeeId: string
  role: VisitPlanSlotCarerRole
  durationMinutes: number | null
  plannedStartTime: string | null
  plannedEndTime: string | null
  sortOrder: number
}

export type VisitPlanSlotException = {
  id?: string
  exceptionDate: string
  exceptionType: VisitPlanSlotExceptionType
  plannedStartTime?: string | null
  plannedEndTime?: string | null
  durationMinutes?: number | null
  requiredCarers?: number | null
  notes?: string
}

export type VisitPlanSlot = {
  id?: string
  slotCode: VisitPlanSlotCode
  label: string
  daysOfWeek: number[]
  plannedStartTime: string
  plannedEndTime: string
  requiredCarers: number
  isEnabled: boolean
  medicationRoundCode: string | null
  notes: string
  sortOrder: number
  scheduleFrequency: VisitPlanScheduleFrequency
  repeatEvery: number
  repeatUnit: VisitPlanRepeatUnit
  timeCritical: boolean
  timeToleranceMinutes: number
  durationMinutes: number | null
  notesRequired: boolean
  photoAllowed: boolean
  shareOutcomeWithFamily: boolean
  analysisArea: string | null
  monthlyDayMode: VisitPlanMonthlyDayMode
  monthlyDaysOfMonth: number[]
  monthlyPatternOrdinal: VisitPlanMonthlyOrdinal | null
  monthlyPatternWeekday: number | null
  linkedCarePlanFormIds: string[]
  assignedEmployeeIds: string[]
  slotKind: VisitPlanSlotKind
  slotEffectiveFrom: string | null
  slotEffectiveTo: string | null
  oneOffDate: string | null
  allowBackfillDays: number
  carerAssignments: VisitPlanSlotCarerAssignment[]
  exceptions: VisitPlanSlotException[]
}

export type VisitPlanCarerFit = 'good' | 'partial' | 'poor'

export type VisitPlanCarerCandidate = {
  employeeId: string
  displayName: string
  role: string | null
  jobTitle: string | null
  fit: VisitPlanCarerFit
  isPreferred: boolean
  isBlocked: boolean
  hasRotaConflict?: boolean
  rotaConflictJobs?: string[]
  availability: {
    availableDays: number[]
    unavailableDays: number[]
    timeWindowOk: boolean
    summary: string
  }
  skills: {
    matched: string[]
    missing: string[]
  }
  complianceIssues: number
  warnings: string[]
}

export type VisitPlanCarerSuggestions = {
  candidates: VisitPlanCarerCandidate[]
  preferredCarerIds: string[]
  blockedCarerIds: string[]
  requiredSkillKeywords: string[]
  requiredCarers: number
}

export type VisitPlanAmendment = {
  id: string
  reason: string
  amendedAt: string
  amendedById: string | null
}

export type ServiceUserVisitPlan = {
  id: string
  serviceUserId: string
  status: VisitPlanStatus
  effectiveFrom: string
  effectiveTo: string | null
  weeklyContractedHours: string | null
  numberOfCarers: number
  sourceSubmissionId: string | null
  reviewDueAt: string | null
  notes: string
  approvedAt: string | null
  approvedById: string | null
  createdAt: string
  updatedAt: string
  slots: VisitPlanSlot[]
  amendments: VisitPlanAmendment[]
}

export const VISIT_PLAN_DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** @deprecated Prefer `VisitPlanSlot.label` from medication round names. */
export const VISIT_PLAN_SLOT_LABELS: Record<string, string> = {
  MORNING: 'Morning',
  MIDDAY: 'Midday',
  AFTERNOON: 'Afternoon',
  EVENING: 'Evening',
  NIGHT: 'Night',
  LUNCH: 'Midday',
  TEA: 'Afternoon',
}
