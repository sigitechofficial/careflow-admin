/**
 * Standard UK domiciliary pay time-period lookups.
 * Special days (bank holiday, Boxing Day, org day, …) are normal £/hr periods
 * that take priority over weekday/weekend rules when that calendar day occurs.
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
  | 'BANK_HOLIDAY_DAYTIME'
  | 'BANK_HOLIDAY_EVENING'
  | 'BANK_HOLIDAY_NIGHT'
  | 'CHRISTMAS'
  | 'CHRISTMAS_DAYTIME'
  | 'CHRISTMAS_EVENING'
  | 'CHRISTMAS_NIGHT'
  | 'BOXING_DAY'
  | 'BOXING_DAY_DAYTIME'
  | 'BOXING_DAY_EVENING'
  | 'BOXING_DAY_NIGHT'
  | 'NEW_YEAR'
  | 'NEW_YEAR_DAYTIME'
  | 'NEW_YEAR_EVENING'
  | 'NEW_YEAR_NIGHT'
  | 'EASTER'
  | 'EASTER_DAYTIME'
  | 'EASTER_EVENING'
  | 'EASTER_NIGHT'
  | 'SPECIAL'
  | 'SPECIAL_DAYTIME'
  | 'SPECIAL_EVENING'
  | 'SPECIAL_NIGHT'

export type PayTimePeriodLookup = {
  code: PayTimePeriodCode
  label: string
  dayType: BillingDayType
  /** Null = whole day (no clock window). */
  startTime: string | null
  endTime: string | null
  /** Higher = preferred when periods overlap (special days beat weekdays). */
  priority: number
  group: 'weekday' | 'saturday' | 'sunday' | 'special'
}

const DAY = { startTime: '07:00' as const, endTime: '19:00' as const }
const EVE = { startTime: '19:00' as const, endTime: '22:00' as const }
const NIGHT = { startTime: '22:00' as const, endTime: '07:00' as const }

function specialBands(
  dayType: BillingDayType,
  baseLabel: string,
  baseCode: string,
  basePriority: number,
): PayTimePeriodLookup[] {
  return [
    {
      code: baseCode as PayTimePeriodCode,
      label: baseLabel,
      dayType,
      startTime: null,
      endTime: null,
      priority: basePriority,
      group: 'special',
    },
    {
      code: `${baseCode}_DAYTIME` as PayTimePeriodCode,
      label: `${baseLabel} daytime`,
      dayType,
      ...DAY,
      priority: basePriority + 1,
      group: 'special',
    },
    {
      code: `${baseCode}_EVENING` as PayTimePeriodCode,
      label: `${baseLabel} evening`,
      dayType,
      ...EVE,
      priority: basePriority + 2,
      group: 'special',
    },
    {
      code: `${baseCode}_NIGHT` as PayTimePeriodCode,
      label: `${baseLabel} night`,
      dayType,
      ...NIGHT,
      priority: basePriority + 3,
      group: 'special',
    },
  ]
}

/**
 * Default UK-style clock windows. Orgs can still edit times on each rule after selecting a period.
 * Night wraps midnight (22:00 → 07:00).
 */
export const PAY_TIME_PERIOD_LOOKUP: PayTimePeriodLookup[] = [
  { code: 'WEEKDAY_DAYTIME', label: 'Weekday daytime', dayType: 'WEEKDAY', ...DAY, priority: 10, group: 'weekday' },
  { code: 'WEEKDAY_EVENING', label: 'Weekday evening', dayType: 'WEEKDAY', ...EVE, priority: 20, group: 'weekday' },
  { code: 'WEEKDAY_NIGHT', label: 'Weekday night', dayType: 'WEEKDAY', ...NIGHT, priority: 30, group: 'weekday' },
  { code: 'SATURDAY_DAYTIME', label: 'Saturday daytime', dayType: 'SATURDAY', ...DAY, priority: 40, group: 'saturday' },
  { code: 'SATURDAY_EVENING', label: 'Saturday evening', dayType: 'SATURDAY', ...EVE, priority: 50, group: 'saturday' },
  { code: 'SATURDAY_NIGHT', label: 'Saturday night', dayType: 'SATURDAY', ...NIGHT, priority: 60, group: 'saturday' },
  { code: 'SUNDAY_DAYTIME', label: 'Sunday daytime', dayType: 'SUNDAY', ...DAY, priority: 70, group: 'sunday' },
  { code: 'SUNDAY_EVENING', label: 'Sunday evening', dayType: 'SUNDAY', ...EVE, priority: 80, group: 'sunday' },
  { code: 'SUNDAY_NIGHT', label: 'Sunday night', dayType: 'SUNDAY', ...NIGHT, priority: 90, group: 'sunday' },
  ...specialBands('BANK_HOLIDAY', 'Bank holiday', 'BANK_HOLIDAY', 100),
  ...specialBands('SPECIAL', 'Organisation special day', 'SPECIAL', 105),
  ...specialBands('EASTER', 'Easter holiday', 'EASTER', 108),
  ...specialBands('CHRISTMAS', 'Christmas Day', 'CHRISTMAS', 110),
  ...specialBands('BOXING_DAY', 'Boxing Day', 'BOXING_DAY', 110),
  ...specialBands('NEW_YEAR', "New Year's Day", 'NEW_YEAR', 110),
]

export const PAY_TIME_PERIOD_GROUPS: {
  id: PayTimePeriodLookup['group']
  label: string
}[] = [
  { id: 'weekday', label: 'Weekdays' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' },
  { id: 'special', label: 'Bank / org / public holidays' },
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
