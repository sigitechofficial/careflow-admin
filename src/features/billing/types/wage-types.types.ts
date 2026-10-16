import type { PayCardRule, PayStackingPolicy } from '@/features/billing/types/billing-cards.types'

export type WageTypeCode =
  | 'BASIC_HOURLY'
  | 'FIXED_SALARY'
  | 'PER_VISIT'
  | 'WEEKEND'
  | 'BANK_HOLIDAY'
  | 'NIGHT_SHIFT'
  | 'OVERTIME'
  | 'TRAVEL_TIME'
  | 'MILEAGE'
  | 'SLEEP_IN'
  | 'WAKING_NIGHT'
  | 'LIVE_IN'
  | 'ON_CALL'
  | 'TRAINING'
  | 'HOLIDAY_PAY'
  | 'SICK_PAY'
  | 'BONUS'
  | 'MANUAL_ADJUSTMENT'

export type WageTypeCategory = 'STANDARD' | 'ENHANCED' | 'TRAVEL' | 'SPECIALIST' | 'ADDITIONAL'

export type WageTypeSupportLevel = 'PAYCARD' | 'PAY_ITEM' | 'UK_PAYROLL' | 'PARTIAL' | 'PLANNED'

export type WageType = {
  id: string
  code: WageTypeCode | string
  name: string
  category: WageTypeCategory | string
  unit: string
  allowedMethods: string[]
  description?: string | null
  isSystem: boolean
  isActive: boolean
  sortOrder: number
  support: { level: WageTypeSupportLevel; note: string } | null
}

export const WAGE_TYPE_CATEGORY_LABELS: Record<WageTypeCategory, string> = {
  STANDARD: 'Standard pay',
  ENHANCED: 'Enhanced rates',
  TRAVEL: 'Travel & mileage',
  SPECIALIST: 'Specialist care',
  ADDITIONAL: 'Additional payments',
}

export const WAGE_TYPE_CATEGORY_ORDER: WageTypeCategory[] = ['STANDARD', 'ENHANCED', 'TRAVEL', 'SPECIALIST', 'ADDITIONAL']

export const WAGE_TYPE_SUPPORT_LABELS: Record<WageTypeSupportLevel, string> = {
  PAYCARD: 'On pay card',
  PAY_ITEM: 'Pay items',
  UK_PAYROLL: 'UK payroll',
  PARTIAL: 'Partial',
  PLANNED: 'Not automatic yet',
}

export const CALCULATION_METHOD_LABELS: Record<string, string> = {
  HOURLY_RATE: 'Hourly rate',
  FIXED_PER_VISIT: 'Fixed per visit',
  FIXED_PER_SHIFT: 'Fixed per shift',
  FIXED_PER_DAY: 'Fixed per day',
  FIXED_PER_WEEK: 'Fixed per week',
  FIXED_PER_MONTH: 'Fixed per month',
  ANNUAL_SALARY: 'Annual salary',
  RATE_MULTIPLIER: 'Rate multiplier',
  PER_MILE: 'Per mile',
  FIXED_AMOUNT: 'Fixed amount',
  STATUTORY_CALCULATION: 'Statutory calculation',
}

export type BankHolidayRegion = 'UK' | 'SCOTLAND' | 'NORTHERN_IRELAND'

export const BANK_HOLIDAY_REGION_OPTIONS: { value: BankHolidayRegion; label: string }[] = [
  { value: 'UK', label: 'England & Wales' },
  { value: 'SCOTLAND', label: 'Scotland' },
  { value: 'NORTHERN_IRELAND', label: 'Northern Ireland' },
]

/** A nation's bank holidays, or the organisation's own special days (kept beside them). */
export type CalendarRegion = BankHolidayRegion | 'ORGANISATION'

export const CALENDAR_REGION_OPTIONS: { value: CalendarRegion; label: string }[] = [
  ...BANK_HOLIDAY_REGION_OPTIONS,
  { value: 'ORGANISATION', label: 'Organisation special days' },
]

export type BankHoliday = {
  id: string
  holidayDate: string
  name: string
  region: CalendarRegion | string
  isActive: boolean
  /** A weekday given in place of a holiday that fell on a weekend. */
  isSubstitute?: boolean
  /** For a substitute day: the date the holiday itself fell on. */
  substituteForDate?: string | null
  source?: 'GOV_UK' | 'MANUAL' | 'LEGACY' | string
}

export type BankHolidayImportResult = {
  added: number
  alreadyPresent: number
  markedAsSubstitute?: number
  byRegion: Record<string, number>
  from: string
}

/**
 * Carer pay when a holiday falls on a weekend (policy decision D-13).
 * BOTH is how pay was calculated before the choice existed.
 */
export type HolidayPremiumBasis = 'BOTH' | 'ACTUAL_DAY' | 'STATUTORY_DAY'

export const HOLIDAY_PREMIUM_BASIS_OPTIONS: { value: HolidayPremiumBasis; title: string; description: string }[] = [
  {
    value: 'BOTH',
    title: 'Both days',
    description:
      'The date itself (25 and 26 December, 1 January) and the substitute weekday are both paid at the holiday rate. This is how pay has been calculated so far.',
  },
  {
    value: 'ACTUAL_DAY',
    title: 'The date the holiday falls on',
    description: 'The weekend date is paid at the holiday rate. The substitute weekday is an ordinary day.',
  },
  {
    value: 'STATUTORY_DAY',
    title: 'The substitute weekday',
    description: 'The substitute weekday is paid at the holiday rate. The weekend date is an ordinary weekend day.',
  },
]

/** `GET /billing/bank-holidays/status` */
export type HolidayCalendarStatus = {
  years: number[]
  basis: HolidayPremiumBasis
  complete: boolean
  organisationSpecialDays: number
  regions: Array<{
    region: BankHolidayRegion
    years: Array<{ year: number; count: number; complete: boolean; issues: string[] }>
  }>
}

export type PayPreviewInput = {
  rules: PayCardRule[]
  stackingPolicy?: PayStackingPolicy
  bankHolidayRegion?: BankHolidayRegion | null
  date: string
  startTime: string
  endTime: string
  nightDuty?: 'SLEEPING_NIGHT' | 'WAKING_NIGHT' | null
}

export type PayPreviewResult = {
  amount: number | null
  minutes: number
  method: string | null
  explanation: string | null
  segments: Array<{
    minutes: number
    rate: number
    amount: number
    explanation: string
    startLabel?: string
    endLabel?: string
    ruleLabel?: string | null
    hoursLabel?: string
    lineFormula?: string
  }>
  timeZone: string
  stackingPolicy: PayStackingPolicy
  bankHolidayRegion: string
  bankHolidays: Array<{ date: string; name: string }>
  wageTypes: WageTypeCode[]
  warnings: string[]
}
