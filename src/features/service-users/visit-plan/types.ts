export type VisitPlanStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'ENDED'

export type VisitPlanSlotCode = 'MORNING' | 'LUNCH' | 'TEA' | 'EVENING' | 'NIGHT'

export type VisitPlanScheduleFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY'

export type VisitPlanRepeatUnit = 'DAYS' | 'WEEKS' | 'MONTHS'

export type VisitPlanMonthlyDayMode = 'BY_DATE' | 'BY_PATTERN'

export type VisitPlanMonthlyOrdinal = 'FIRST' | 'SECOND' | 'THIRD' | 'FOURTH' | 'LAST'

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

export const VISIT_PLAN_SLOT_LABELS: Record<VisitPlanSlotCode, string> = {
  MORNING: 'Morning call',
  LUNCH: 'Lunch call',
  TEA: 'Tea call',
  EVENING: 'Evening call',
  NIGHT: 'Night call',
}
