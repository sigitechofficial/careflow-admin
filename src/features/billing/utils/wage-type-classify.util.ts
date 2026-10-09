import type { PayCardRule } from '@/features/billing/types/billing-cards.types'
import type { WageTypeCode } from '@/features/billing/types/wage-types.types'

// Mirrors careadmin-backend/src/billing/wage-types.util.ts classifyPayRule — keep the two in step.

const HOLIDAY_DAY_TYPES = new Set(['BANK_HOLIDAY', 'CHRISTMAS', 'BOXING_DAY', 'NEW_YEAR', 'EASTER', 'SPECIAL'])

function clockMinutes(value?: string | null): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec((value ?? '').trim())
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

export function isNightTimeBand(startTime?: string | null, endTime?: string | null): boolean {
  const start = clockMinutes(startTime)
  const end = clockMinutes(endTime)
  if (start == null || end == null) return false
  if (end <= start && !(start === 0 && end === 0)) return true
  if (start >= 20 * 60) return true
  return start < 6 * 60 && end <= 8 * 60 && !(start === 0 && end >= 23 * 60)
}

/** Wage type a pay card rule represents (derived for display — nothing is stored). */
export function classifyPayRule(rule: Pick<PayCardRule, 'rateType' | 'dayType' | 'startTime' | 'endTime'>): WageTypeCode {
  switch (rule.rateType) {
    case 'MILEAGE':
      return 'MILEAGE'
    case 'TRAVEL_TIME':
    case 'WAITING_TIME':
      return 'TRAVEL_TIME'
    case 'SLEEP_IN':
      return 'SLEEP_IN'
    case 'WAKING_NIGHT':
      return 'WAKING_NIGHT'
    case 'FIXED':
    case 'PER_VISIT_FEE':
      return 'PER_VISIT'
    case 'OVERTIME':
      return 'OVERTIME'
    case 'ON_CALL':
      return 'ON_CALL'
    case 'TRAINING':
      return 'TRAINING'
    case 'LIVE_IN_DAILY':
    case 'LIVE_IN_WEEKLY':
      return 'LIVE_IN'
    default:
      break
  }
  if (rule.dayType && HOLIDAY_DAY_TYPES.has(rule.dayType)) return 'BANK_HOLIDAY'
  if (rule.dayType === 'SATURDAY' || rule.dayType === 'SUNDAY') return 'WEEKEND'
  if (isNightTimeBand(rule.startTime, rule.endTime)) return 'NIGHT_SHIFT'
  return 'BASIC_HOURLY'
}
