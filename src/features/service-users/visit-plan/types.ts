export type VisitPlanStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'ENDED'

/** Medication administration round code — same catalogue as Settings → Time slots. */
export type VisitPlanSlotCode = string

export type VisitPlanScheduleFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY'

export type VisitPlanRepeatUnit = 'DAYS' | 'WEEKS' | 'MONTHS'

export type VisitPlanMonthlyDayMode = 'BY_DATE' | 'BY_PATTERN'

export type VisitPlanMonthlyOrdinal = 'FIRST' | 'SECOND' | 'THIRD' | 'FOURTH' | 'LAST'

export type VisitPlanSlotKind = 'STANDARD' | 'OVERNIGHT' | 'ONE_OFF'

export type VisitPlanNightDuty = 'NONE' | 'SLEEPING_NIGHT' | 'WAKING_NIGHT'

export type VisitPlanSlotCarerRole = 'LEAD' | 'SECONDARY'

export type VisitPlanSlotExceptionType = 'SKIP' | 'EXTRA'

export type ScheduleImpactSummary = {
  jobsCancelled?: number
  jobsUnallocated?: number
  jobsRescheduled?: number
  jobIds?: string[]
  truncated?: boolean
}

export type AmendmentImpactAction = {
  type: string
  visitPlanSlotId: string
  slotLabel: string
  /** The visit's time before the change (HH:MM). */
  startTime?: string
  endTime?: string
  removedWeekdays?: number[]
  newStartTime?: string
  newEndTime?: string
  exceptionDate?: string
  jobCount?: number
}

export type AmendmentImpactPreview = {
  actions: AmendmentImpactAction[]
  scheduleImpact: ScheduleImpactSummary
  truncated: boolean
}

export type VisitPlanCarerPatternConflict = {
  employeeId: string
  employeeName: string
  slotCode: string
  slotLabel: string
  unavailableDayLabels: string[]
  timeOutsidePattern: boolean
  summary: string
}

export type VisitPlanCarerSyncPatternPreview = {
  conflicts: VisitPlanCarerPatternConflict[]
  visitsSkippedIfRespecting: number
}

export type GenerateSchedulePreview = {
  visitsToCreate: number
  visitsSkippedAbsent: number
  visitsSkippedSkip: number
  visitsSkippedBankHoliday: number
  /** Days/slots in range that are not on the call pattern (wrong weekday, outside slot dates, etc.). */
  visitsSkippedOffPattern: number
  /** Backfill days skipped because no enabled call has Max backfill days saved. */
  visitsSkippedNoBackfillAllow?: number
  visitsAlreadyExist: number
  backfillDays: number
  /** Highest Max backfill days on enabled calls (from saved plan). */
  maxSlotBackfillDays?: number
  truncated: boolean
  /** Weeks of this run over the service user's weekly contracted hours, in words (null when none). */
  weeklyHoursWarning?: string | null
  /** Settings → Dom Rules refuses generating by hand while the plan is over the hours. */
  weeklyHoursBlocked?: boolean
}

export type ActivateImpactPreview = {
  otherActivePlans: Array<{
    id: string
    effectiveFrom: string
    effectiveTo: string | null
    enabledSlotCount: number
  }>
  scheduleImpact: ScheduleImpactSummary
}

export type ReturnImpactPreview = {
  planSuspended: boolean
  planId?: string
  noActivePlan?: boolean
  returnDate?: string
  generatePreview: GenerateSchedulePreview | null
}

export type SuspensionReviewOverdueRow = {
  planId: string
  serviceUserId: string
  serviceUserName: string
  suspendedAt: string | null
  suspensionReviewDueAt: string | null
  expectedResumeAt: string | null
  pauseReason: { id: string; name: string; code: string } | null
}

export type VisitPlanSlotCarerAssignment = {
  id?: string
  dayOfWeek: number | null
  employeeId: string
  role: VisitPlanSlotCarerRole
  /** Carers required for this row's day(s); null = use the slot default. */
  requiredCarers?: number | null
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
  nightDuty: VisitPlanNightDuty
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
    timeMismatchDays?: number[]
    timeMismatchMessages?: string[]
    timeWindowOk: boolean
    summary: string
  }
  skills: {
    matched: string[]
    missing: string[]
  }
  complianceIssues: number
  /** True when org policy is BLOCK and this carer has blocking compliance. */
  complianceBlocksAllocation?: boolean
  /** An allocation rule in Settings set to "Don't allow" applies: hide from assign lists. */
  ruleBlocked?: boolean
  ruleBlockReasons?: string[]
  /** Carer's contracted weekly hours (from employment), null when unset. */
  contractedWeeklyHours?: number | null
  /** The carer's weekly limit: contracted weekly hours. */
  allowedWeeklyHours?: number | null
  /**
   * Hours the carer already has in `weeklyHoursWeekStart` (Monday–Sunday), counted like the hours
   * approvals: rota visits (plan, extra, special) and plan visits not on the rota yet.
   */
  assignedWeeklyHours?: number
  /** The week shown: the visit's own week, or the busiest coming week for a plan visit. */
  weeklyHoursWeekStart?: string | null
  /** Hours of COMPLETED visits in the current rota week (org timezone, Sunday start). */
  completedWeeklyHours?: number
  /** assignedWeeklyHours + this visit's hours in that week. */
  projectedWeeklyHours?: number
  /** That week goes over the contracted weekly hours (+ grace, Settings → Dom Rules). */
  exceedsContractedHours?: boolean
  /** No contracted weekly hours: can't be given visits until hours are set. */
  noContractedHours?: boolean
  /** Nearest upcoming leave/holiday overlapping the next 8 weeks. `blocks` = org rule is "Don't allow". */
  timeOff?: {
    kind: 'leave' | 'holiday'
    label: string
    from: string
    to: string
    blocks: boolean
  } | null
  warnings: string[]
}

export type VisitPlanCarerSuggestions = {
  candidates: VisitPlanCarerCandidate[]
  preferredCarerIds: string[]
  blockedCarerIds: string[]
  requiredSkillKeywords: string[]
  requiredCarers: number
  locationFilterApplied?: boolean
  serviceUserLocationIds?: string[]
}

export type VisitPlanAmendment = {
  id: string
  reason: string
  amendedAt: string
  amendedById: string | null
}

export type VisitPlanPauseReason = {
  id: string
  name: string
  code: string
  suggestsUseAbsence?: boolean
}

export type VisitPlanStatusEvent = {
  id: string
  eventType: 'SUSPENDED' | 'REACTIVATED' | 'ENDED' | 'SCHEDULED_END'
  reason: string
  pauseReasonCatalogId: string | null
  pauseReasonCatalog: { id: string; name: string; code: string } | null
  expectedResumeAt: string | null
  reviewDueAt: string | null
  contingencyNotes: string
  cancelFutureVisits: boolean | null
  effectiveFrom: string | null
  effectiveTo: string | null
  retrospectiveReason: string
  createdAt: string
  createdById: string | null
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
  suspendedAt: string | null
  suspendedById: string | null
  pauseReasonCatalogId: string | null
  pauseReasonCatalog: VisitPlanPauseReason | null
  expectedResumeAt: string | null
  suspensionReviewDueAt: string | null
  suspensionContingencyNotes: string
  respectWorkingPatternOnSync: boolean
  createdAt: string
  updatedAt: string
  slots: VisitPlanSlot[]
  amendments: VisitPlanAmendment[]
  statusEvents: VisitPlanStatusEvent[]
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
