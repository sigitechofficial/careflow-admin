import type { ChargeCardRule, PayCardRule } from '@/features/billing/types/billing-cards.types'

/** Strip server-only fields before POST/PATCH billing card APIs. */
export function serializePayCardRulesForApi(rules: PayCardRule[]): PayCardRule[] {
  return rules.map((rule, index) => ({
    label: rule.label?.trim() || undefined,
    serviceType: rule.serviceType?.trim() || undefined,
    dayType: rule.dayType,
    startTime: rule.startTime?.trim() || undefined,
    endTime: rule.endTime?.trim() || undefined,
    rateType: rule.rateType,
    amount: rule.amount,
    multiplier: rule.multiplier ?? undefined,
    minimumMinutes: rule.minimumMinutes ?? undefined,
    roundingRule: rule.roundingRule?.trim() || undefined,
    priority: rule.priority,
    sortOrder: index,
  }))
}

export function serializeChargeCardRulesForApi(rules: ChargeCardRule[]): ChargeCardRule[] {
  return rules.map((rule, index) => ({
    label: rule.label?.trim() || undefined,
    serviceType: rule.serviceType?.trim() || undefined,
    dayType: rule.dayType,
    startTime: rule.startTime?.trim() || undefined,
    endTime: rule.endTime?.trim() || undefined,
    rateType: rule.rateType,
    amount: rule.amount,
    multiplier: rule.multiplier ?? undefined,
    minimumMinutes: rule.minimumMinutes ?? undefined,
    roundingRule: rule.roundingRule?.trim() || undefined,
    priority: rule.priority,
    chargeMethod: rule.chargeMethod,
    chargeableFlag: rule.chargeableFlag,
    sortOrder: index,
  }))
}
