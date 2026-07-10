import type { ChargeCardRule, PayCardRule } from '@/features/billing/types/billing-cards.types'
import {
  normalizeChargeCardRulesForEditor,
  normalizePayCardRulesForEditor,
  resolveRuleChargeMethod,
  resolveRuleRateType,
} from '@/features/billing/utils/billing-card-rule.util'

export { normalizePayCardRulesForEditor, normalizeChargeCardRulesForEditor } from '@/features/billing/utils/billing-card-rule.util'

/** Strip server-only fields before POST/PATCH billing card APIs. */
export function serializePayCardRulesForApi(rules: PayCardRule[]): PayCardRule[] {
  return rules.map((rule, index) => ({
    label: rule.label?.trim() || undefined,
    serviceType: rule.serviceType?.trim() || undefined,
    dayType: rule.dayType,
    rateType: resolveRuleRateType(rule),
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
    rateType: resolveRuleRateType(rule),
    amount: rule.amount,
    minimumMinutes: rule.minimumMinutes ?? undefined,
    priority: rule.priority,
    chargeMethod: resolveRuleChargeMethod(rule),
    chargeableFlag: rule.chargeableFlag,
    sortOrder: index,
  }))
}
