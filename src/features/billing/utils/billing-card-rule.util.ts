import type {
  BillingChargeMethod,
  BillingRateType,
  ChargeCardRule,
  PayCardRule,
} from '@/features/billing/types/billing-cards.types'
import {
  DEFAULT_VISIT_DURATION_MINUTES,
  MAX_FIXED_VISIT_MINUTES,
  formatVisitDurationLabel,
} from '@/features/billing/types/billing-cards.types'

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
  if (
    rule.minimumMinutes != null
    && rule.minimumMinutes > 0
    && rule.minimumMinutes <= MAX_FIXED_VISIT_MINUTES
  ) {
    return false
  }
  return rule.rateType === 'HOURLY'
}

export function isHourlyLongChargeRule(
  rule: Pick<ChargeCardRule, 'minimumMinutes' | 'rateType' | 'chargeMethod' | 'startTime' | 'endTime'>,
): boolean {
  if (NON_VISIT_RATE_TYPES.has(rule.rateType)) return false
  if (rule.startTime || rule.endTime) return false
  if (
    rule.minimumMinutes != null
    && rule.minimumMinutes > 0
    && rule.minimumMinutes <= MAX_FIXED_VISIT_MINUTES
  ) {
    return false
  }
  return rule.rateType === 'HOURLY' || rule.chargeMethod === 'HOURLY_PRO_RATA'
}

export function resolveRuleRateType(rule: Pick<PayCardRule, 'minimumMinutes' | 'rateType' | 'startTime' | 'endTime'>): BillingRateType {
  if (NON_VISIT_RATE_TYPES.has(rule.rateType)) return rule.rateType
  if (isHourlyLongVisitRule(rule)) return 'HOURLY'
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
  if (isHourlyLongVisitRule(rule)) return 'Hourly (visits over 1 hour)'
  const duration = formatVisitDurationLabel(rule.minimumMinutes)
  return duration ? `Fixed — ${duration} visit` : 'Fixed visit'
}

export function getRuleChargeMethodLabel(rule: Pick<ChargeCardRule, 'minimumMinutes' | 'rateType' | 'chargeMethod' | 'startTime' | 'endTime'>): string {
  if (isHourlyLongChargeRule(rule)) return 'Hourly (visits over 1 hour)'
  return 'Fixed visit charge'
}

export function getRuleAmountFieldLabel(rule: Pick<PayCardRule, 'minimumMinutes' | 'rateType' | 'startTime' | 'endTime'>): string {
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
  if (isHourlyLongVisitRule(rule)) {
    return { ...rule, rateType: 'HOURLY', minimumMinutes: null }
  }

  const withDuration = withDefaultDuration(rule)

  if (withDuration.rateType === 'HOURLY') {
    return {
      ...withDuration,
      rateType: 'FIXED',
      amount: Math.round(Number(withDuration.amount) * (withDuration.minimumMinutes! / 60) * 100) / 100,
    }
  }

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
