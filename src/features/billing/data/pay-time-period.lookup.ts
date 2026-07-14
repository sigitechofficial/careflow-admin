/**
 * Standard UK domiciliary pay time-period lookups.
 * Used by pay-card day/time premiums (not Settings name lookups — these carry day + clock defaults).
 */

import type { BillingDayType } from '@/features/billing/types/billing-cards.types'

export type PayTimePeriodCode =
  | 'WEEKDAY_DAYTIME'
  | 'WEEKDAY_EVENING'
  | 'WEEKDAY_NIGHT'
  | 'SATURDAY_DAYTIME'
  | 'SATURDAY_EVENING'
  | 'SATURDAY_NIGHT'
  | 'SUNDAY_DAYTIME'
  | 'SUNDAY_EVENING'
  | 'SUNDAY_NIGHT'
  | 'BANK_HOLIDAY'
  | 'CHRISTMAS'
  | 'BOXING_DAY'
  | 'NEW_YEAR'
  | 'EASTER'
  | 'SPECIAL'

export type PayTimePeriodLookup = {
  code: PayTimePeriodCode
  label: string
  dayType: BillingDayType
  /** Null = whole day (no clock window). */
  startTime: string | null
  endTime: string | null
  /** Higher = preferred when periods overlap (special days beat weekdays). */
  priority: number
}

/**
 * Default UK-style clock windows. Orgs can still edit times on each rule after selecting a period.
 * Night wraps midnight (22:00 → 07:00).
 */
export const PAY_TIME_PERIOD_LOOKUP: PayTimePeriodLookup[] = [
  { code: 'WEEKDAY_DAYTIME', label: 'Weekday daytime', dayType: 'WEEKDAY', startTime: '07:00', endTime: '19:00', priority: 10 },
  { code: 'WEEKDAY_EVENING', label: 'Weekday evening', dayType: 'WEEKDAY', startTime: '19:00', endTime: '22:00', priority: 20 },
  { code: 'WEEKDAY_NIGHT', label: 'Weekday night', dayType: 'WEEKDAY', startTime: '22:00', endTime: '07:00', priority: 30 },
  { code: 'SATURDAY_DAYTIME', label: 'Saturday daytime', dayType: 'SATURDAY', startTime: '07:00', endTime: '19:00', priority: 40 },
  { code: 'SATURDAY_EVENING', label: 'Saturday evening', dayType: 'SATURDAY', startTime: '19:00', endTime: '22:00', priority: 50 },
  { code: 'SATURDAY_NIGHT', label: 'Saturday night', dayType: 'SATURDAY', startTime: '22:00', endTime: '07:00', priority: 60 },
  { code: 'SUNDAY_DAYTIME', label: 'Sunday daytime', dayType: 'SUNDAY', startTime: '07:00', endTime: '19:00', priority: 70 },
  { code: 'SUNDAY_EVENING', label: 'Sunday evening', dayType: 'SUNDAY', startTime: '19:00', endTime: '22:00', priority: 80 },
  { code: 'SUNDAY_NIGHT', label: 'Sunday night', dayType: 'SUNDAY', startTime: '22:00', endTime: '07:00', priority: 90 },
  { code: 'BANK_HOLIDAY', label: 'Bank holiday', dayType: 'BANK_HOLIDAY', startTime: null, endTime: null, priority: 100 },
  { code: 'CHRISTMAS', label: 'Christmas Day', dayType: 'CHRISTMAS', startTime: null, endTime: null, priority: 110 },
  { code: 'BOXING_DAY', label: 'Boxing Day', dayType: 'BOXING_DAY', startTime: null, endTime: null, priority: 110 },
  { code: 'NEW_YEAR', label: "New Year's Day", dayType: 'NEW_YEAR', startTime: null, endTime: null, priority: 110 },
  { code: 'EASTER', label: 'Easter holidays', dayType: 'EASTER', startTime: null, endTime: null, priority: 105 },
  { code: 'SPECIAL', label: 'Organisation-defined special day', dayType: 'SPECIAL', startTime: null, endTime: null, priority: 95 },
]

export function getPayTimePeriodByCode(code: string | null | undefined): PayTimePeriodLookup | undefined {
  if (!code) return undefined
  return PAY_TIME_PERIOD_LOOKUP.find(p => p.code === code)
}

/** Match an existing rule to a standard period (label or day+times). */
export function matchPayTimePeriod(rule: {
  label?: string | null
  dayType: string
  startTime?: string | null
  endTime?: string | null
}): PayTimePeriodLookup | undefined {
  const byLabel = PAY_TIME_PERIOD_LOOKUP.find(
    p => p.label.toLowerCase() === (rule.label ?? '').trim().toLowerCase(),
  )
  if (byLabel) return byLabel

  const start = rule.startTime?.trim() || null
  const end = rule.endTime?.trim() || null
  return PAY_TIME_PERIOD_LOOKUP.find(
    p =>
      p.dayType === rule.dayType &&
      (p.startTime ?? null) === start &&
      (p.endTime ?? null) === end,
  )
}
