import type { ChargeCardRule, PayCardRule } from '@/features/billing/types/billing-cards.types'

/** Strip server-only fields before POST/PATCH billing card APIs. */
export function serializePayCardRulesForApi(rules: PayCardRule[]): PayCardRule[] {
  return rules.map((rule, index) => ({
    label: rule.label?.trim() || undefined,
    serviceType: rule.serviceType?.trim() || undefined,
    dayType: rule.dayType,
    rateType: 'HOURLY' as const,
    amount: rule.amount,
    minimumMinutes: rule.minimumMinutes ?? undefined,
    priority: rule.priority,
    sortOrder: index,
  }))
}

export function serializeChargeCardRulesForApi(rules: ChargeCardRule[]): ChargeCardRule[] {
  return rules.map((rule, index) => ({
    label: rule.label?.trim() || undefined,
    serviceType: rule.serviceType?.trim() || undefined,
    dayType: rule.dayType,
    rateType: 'HOURLY' as const,
    amount: rule.amount,
    minimumMinutes: rule.minimumMinutes ?? undefined,
    priority: rule.priority,
    chargeMethod: 'HOURLY_PRO_RATA' as const,
    chargeableFlag: rule.chargeableFlag,
    sortOrder: index,
  }))
}
