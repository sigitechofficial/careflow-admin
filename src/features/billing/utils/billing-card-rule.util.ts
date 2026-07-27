import type {
  BillingChargeMethod,
  BillingDayType,
  BillingRateType,
  ChargeCardRule,
  PayCardRule,
} from '@/features/billing/types/billing-cards.types'
import {
  DEFAULT_VISIT_DURATION_MINUTES,
  MAX_FIXED_VISIT_MINUTES,
  formatVisitDurationLabel,
} from '@/features/billing/types/billing-cards.types'
import { billingTimeWindowsOverlap, parseBillingTimeToMinutes } from '@/features/billing/utils/billing-time.util'

const NON_VISIT_RATE_TYPES = new Set<BillingRateType>([
  'MILEAGE',
  'TRAVEL_TIME',
  'WAITING_TIME',
  'PREMIUM',
  'UPLIFT',
  'DEDUCTION',
  'PER_VISIT_FEE',
])

export function isDurationBandRule(minimumMinutes?: number | null): boolean {
  return minimumMinutes != null && minimumMinutes > 0
}

export function isFixedVisitSlotRule(rule: Pick<PayCardRule, 'minimumMinutes' | 'rateType'>): boolean {
  return (
    rule.rateType === 'FIXED'
    && rule.minimumMinutes != null
    && rule.minimumMinutes > 0
    && rule.minimumMinutes <= MAX_FIXED_VISIT_MINUTES
  )
}

export function isHourlyLongVisitRule(
  rule: Pick<PayCardRule, 'minimumMinutes' | 'rateType' | 'startTime' | 'endTime'>,
): boolean {
  if (NON_VISIT_RATE_TYPES.has(rule.rateType)) return false
  if (rule.startTime || rule.endTime) return false
  return rule.rateType === 'HOURLY'
}

export function isHourlyLongChargeRule(
  rule: Pick<ChargeCardRule, 'minimumMinutes' | 'rateType' | 'chargeMethod' | 'startTime' | 'endTime'>,
): boolean {
  if (NON_VISIT_RATE_TYPES.has(rule.rateType)) return false
  if (rule.startTime || rule.endTime) return false
  return rule.rateType === 'HOURLY' || rule.chargeMethod === 'HOURLY_PRO_RATA'
}

export function isMileageRule(rule: Pick<PayCardRule, 'rateType'>): boolean {
  return rule.rateType === 'MILEAGE'
}

export function isTravelTimeRule(rule: Pick<PayCardRule, 'rateType'>): boolean {
  return rule.rateType === 'TRAVEL_TIME'
}

export function isWaitingTimeRule(rule: Pick<PayCardRule, 'rateType'>): boolean {
  return rule.rateType === 'WAITING_TIME'
}

export function isTravelOrWaitingRule(rule: Pick<PayCardRule, 'rateType'>): boolean {
  return isTravelTimeRule(rule) || isWaitingTimeRule(rule)
}

/** Hourly/banded rule with an explicit clock window (evening, night, etc.). */
export function isTimeBandRule(
  rule: Pick<PayCardRule, 'rateType' | 'startTime' | 'endTime'>,
): boolean {
  if (rule.rateType !== 'HOURLY' && rule.rateType !== 'BANDED') return false
  return Boolean(rule.startTime?.trim() || rule.endTime?.trim())
}

export function resolveRuleRateType(rule: Pick<PayCardRule, 'minimumMinutes' | 'rateType' | 'startTime' | 'endTime'>): BillingRateType {
  if (NON_VISIT_RATE_TYPES.has(rule.rateType)) return rule.rateType
  if (rule.rateType === 'PREMIUM' || rule.rateType === 'UPLIFT' || rule.rateType === 'BANDED') return rule.rateType
  if (rule.rateType === 'HOURLY' || isHourlyLongVisitRule(rule) || isTimeBandRule(rule)) return 'HOURLY'
  return 'FIXED'
}

export function resolveRuleChargeMethod(
  rule: Pick<ChargeCardRule, 'minimumMinutes' | 'chargeMethod' | 'rateType' | 'startTime' | 'endTime'>,
): BillingChargeMethod {
  if (
    rule.chargeMethod === 'NON_CHARGEABLE'
    || rule.chargeMethod === 'SLEEP_IN'
    || rule.chargeMethod === 'WAKING_NIGHT'
  ) {
    return rule.chargeMethod
  }
  if (isHourlyLongChargeRule(rule)) return 'HOURLY_PRO_RATA'
  return 'FIXED_VISIT'
}

export function getRuleRateTypeLabel(rule: Pick<PayCardRule, 'minimumMinutes' | 'rateType' | 'startTime' | 'endTime'>): string {
  if (isMileageRule(rule)) return 'Mileage (£/mile)'
  if (isTravelTimeRule(rule)) return 'Travel time (£/hr)'
  if (isWaitingTimeRule(rule)) return 'Waiting time (£/hr)'
  if (isTimeBandRule(rule)) return 'Time band (£/hr)'
  if (isHourlyLongVisitRule(rule)) return 'Hourly (pro-rata)'
  const duration = formatVisitDurationLabel(rule.minimumMinutes)
  return duration ? `Fixed — ${duration} visit` : 'Fixed visit'
}

export function getRuleChargeMethodLabel(rule: Pick<ChargeCardRule, 'minimumMinutes' | 'rateType' | 'chargeMethod' | 'startTime' | 'endTime'>): string {
  if (isMileageRule(rule)) return 'Mileage recharge'
  if (isHourlyLongChargeRule(rule)) return 'Hourly (visits over 1 hour)'
  return 'Fixed visit charge'
}

export function getRuleAmountFieldLabel(rule: Pick<PayCardRule, 'minimumMinutes' | 'rateType' | 'startTime' | 'endTime'>): string {
  if (isMileageRule(rule)) return 'Mileage rate (£/mile)'
  if (isTravelTimeRule(rule)) return 'Travel time rate (£/hr)'
  if (isWaitingTimeRule(rule)) return 'Waiting time rate (£/hr)'
  if (isHourlyLongVisitRule(rule)) return 'Hourly rate (£/hr)'
  const duration = formatVisitDurationLabel(rule.minimumMinutes)
  return duration ? `Rate for ${duration.toLowerCase()} visit (£)` : 'Visit rate (£)'
}

function withDefaultDuration(rule: PayCardRule): PayCardRule {
  const minimumMinutes = isDurationBandRule(rule.minimumMinutes)
    ? rule.minimumMinutes!
    : DEFAULT_VISIT_DURATION_MINUTES
  return { ...rule, minimumMinutes }
}

/** Normalise card rules for the editor — preserve hourly rules for visits over 1 hour. */
export function normalizePayCardRuleForEditor(rule: PayCardRule): PayCardRule {
  if (NON_VISIT_RATE_TYPES.has(rule.rateType)) return rule
  if (rule.rateType === 'HOURLY' || isHourlyLongVisitRule(rule)) {
    return { ...rule, rateType: 'HOURLY', minimumMinutes: null }
  }

  const withDuration = withDefaultDuration(rule)
  return { ...withDuration, rateType: 'FIXED' }
}

export function normalizeChargeCardRuleForEditor(rule: ChargeCardRule): ChargeCardRule {
  if (NON_VISIT_RATE_TYPES.has(rule.rateType)) return rule
  if (isHourlyLongChargeRule(rule)) {
    return { ...rule, rateType: 'HOURLY', chargeMethod: 'HOURLY_PRO_RATA', minimumMinutes: null }
  }

  const pay = normalizePayCardRuleForEditor(rule)
  return {
    ...rule,
    ...pay,
    chargeMethod: resolveRuleChargeMethod(rule),
  }
}

export function normalizePayCardRulesForEditor(rules: PayCardRule[]): PayCardRule[] {
  return rules.map(normalizePayCardRuleForEditor)
}

export function normalizeChargeCardRulesForEditor(rules: ChargeCardRule[]): ChargeCardRule[] {
  return rules.map(normalizeChargeCardRuleForEditor)
}

export function applyDurationChangeToRule(rule: PayCardRule, nextMinutes: number): PayCardRule {
  return {
    ...rule,
    minimumMinutes: nextMinutes,
    rateType: 'FIXED',
    amount: Number(rule.amount),
  }
}

export function applyDurationChangeToChargeRule(rule: ChargeCardRule, nextMinutes: number): ChargeCardRule {
  return {
    ...applyDurationChangeToRule(rule, nextMinutes),
    chargeMethod: 'FIXED_VISIT',
  }
}

export function applyHourlyLongVisitToRule(rule: PayCardRule): PayCardRule {
  return {
    ...rule,
    rateType: 'HOURLY',
    minimumMinutes: null,
  }
}

export function applyHourlyLongVisitToChargeRule(rule: ChargeCardRule): ChargeCardRule {
  return {
    ...applyHourlyLongVisitToRule(rule),
    chargeMethod: 'HOURLY_PRO_RATA',
  }
}

/** Day types that can both apply to the same calendar day. */
export function billingDayTypesCanOverlap(a: BillingDayType, b: BillingDayType): boolean {
  if (a === b) return true
  if (a === 'ANY' || b === 'ANY') return true
  return false
}

type HourlyOverlapCandidate = Pick<PayCardRule, 'dayType' | 'startTime' | 'endTime' | 'label' | 'rateType'>

function isHourlyPeriodLike(rule: Pick<PayCardRule, 'rateType'>): boolean {
  return (
    rule.rateType === 'HOURLY'
    || rule.rateType === 'BANDED'
    || rule.rateType === 'PREMIUM'
    || rule.rateType === 'UPLIFT'
  )
}

/**
 * Find another hourly period rule whose day type + clock window overlaps `candidate`.
 * Returns the conflicting rule (and index) or null.
 * Skips check while From/Until are still being typed (invalid HH:mm).
 */
export function findOverlappingHourlyPayRule(
  rules: PayCardRule[],
  candidate: HourlyOverlapCandidate,
  excludeIndex?: number,
): { index: number; rule: PayCardRule } | null {
  const startRaw = candidate.startTime?.trim() ?? ''
  const endRaw = candidate.endTime?.trim() ?? ''
  if (startRaw && parseBillingTimeToMinutes(startRaw) == null) return null
  if (endRaw && parseBillingTimeToMinutes(endRaw) == null) return null

  for (let i = 0; i < rules.length; i++) {
    if (excludeIndex != null && i === excludeIndex) continue
    const other = rules[i]
    if (!other || !isHourlyPeriodLike(other)) continue
    if (!billingDayTypesCanOverlap(candidate.dayType, other.dayType)) continue
    if (
      billingTimeWindowsOverlap(
        { startTime: candidate.startTime, endTime: candidate.endTime },
        { startTime: other.startTime, endTime: other.endTime },
      )
    ) {
      return { index: i, rule: other }
    }
  }
  return null
}

export function formatHourlyOverlapMessage(
  candidate: HourlyOverlapCandidate,
  conflicting: Pick<PayCardRule, 'label' | 'dayType' | 'startTime' | 'endTime'>,
): string {
  const candidateLabel = candidate.label?.trim() || 'This period'
  const otherLabel = conflicting.label?.trim() || 'another rate'
  return `${candidateLabel} overlaps ${otherLabel}. Each day/time window can only have one hourly rate.`
}

