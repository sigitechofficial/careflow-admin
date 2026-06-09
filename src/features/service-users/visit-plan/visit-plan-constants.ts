import type {
  VisitPlanMonthlyOrdinal,
  VisitPlanRepeatUnit,
  VisitPlanScheduleFrequency,
} from '@/features/service-users/visit-plan/types'

export const VISIT_PLAN_SCHEDULE_FREQUENCIES: { value: VisitPlanScheduleFrequency; label: string }[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
]

export const VISIT_PLAN_REPEAT_UNITS: { value: VisitPlanRepeatUnit; label: string }[] = [
  { value: 'DAYS', label: 'Days' },
  { value: 'WEEKS', label: 'Weeks' },
  { value: 'MONTHS', label: 'Months' },
]

/** CareBean-style analysis area report options */
export const VISIT_PLAN_MONTHLY_ORDINALS: { value: VisitPlanMonthlyOrdinal; label: string }[] = [
  { value: 'FIRST', label: 'First' },
  { value: 'SECOND', label: 'Second' },
  { value: 'THIRD', label: 'Third' },
  { value: 'FOURTH', label: 'Fourth' },
  { value: 'LAST', label: 'Last' },
]

export const VISIT_PLAN_WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export const VISIT_PLAN_ANALYSIS_AREAS = [
  { value: '', label: 'Select analysis area' },
  { value: 'dementia', label: 'Dementia' },
  { value: 'diabetic_type2', label: 'Diabetic type2' },
  { value: 'end_of_life', label: 'End of life' },
  { value: 'falls', label: 'falls' },
  { value: 'learning_disability', label: 'learning disability' },
  { value: 'medication', label: 'medication' },
  { value: 'personal_care', label: 'Personal Care' },
] as const
