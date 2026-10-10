import { AlertTriangle, Layers } from 'lucide-react'
import { ContentCard } from '@/shared/ui/content-section'
import { Badge } from '@/shared/ui/badge'
import { useWageTypes } from '@/features/billing/hooks/useWageTypes'
import { classifyPayRule } from '@/features/billing/utils/wage-type-classify.util'
import type { PayCardRule } from '@/features/billing/types/billing-cards.types'
import {
  WAGE_TYPE_CATEGORY_LABELS,
  WAGE_TYPE_CATEGORY_ORDER,
  type WageTypeCategory,
} from '@/features/billing/types/wage-types.types'

function formatRuleRate(rule: PayCardRule): string {
  const n = Number(rule.amount)
  const v = Number.isFinite(n) ? n : 0
  switch (rule.rateType) {
    case 'SLEEP_IN':
      return `£${v.toFixed(2)} per night`
    case 'MILEAGE':
      return `£${v.toFixed(2)}/mile`
    case 'FIXED':
    case 'PER_VISIT_FEE':
      return `£${v.toFixed(2)} per ${rule.minimumMinutes ?? '?'}-min visit`
    case 'ON_CALL':
      return `£${v.toFixed(2)} per on-call period`
    case 'TRAINING':
      return `£${v.toFixed(2)}/hr`
    case 'LIVE_IN_DAILY':
      return `£${v.toFixed(2)} per day`
    case 'LIVE_IN_WEEKLY':
      return `£${v.toFixed(2)} per week`
    case 'OVERTIME': {
      const over = rule.minimumMinutes ? ` over ${rule.minimumMinutes / 60}h/week` : ''
      if (rule.enhancementMethod === 'ADDITIONAL_PER_HOUR') return `+£${v.toFixed(2)}/hr${over}`
      if (rule.enhancementMethod === 'ABSOLUTE_HOURLY') return `£${v.toFixed(2)}/hr${over}`
      return `base × ${v}${over}`
    }
    default:
      break
  }
  switch (rule.enhancementMethod) {
    case 'ADDITIONAL_PER_HOUR':
      return `base + £${v.toFixed(2)}/hr`
    case 'MULTIPLIER':
      return `base × ${v}`
    case 'PERCENTAGE_UPLIFT':
      return `base + ${v}%`
    default:
      return `£${v.toFixed(2)}/hr`
  }
}

function ruleName(rule: PayCardRule): string {
  return rule.label?.trim() || rule.dayType
}

/**
 * Shows which wage types this pay card covers (derived from its rates — nothing is stored), what is
 * not configured, and which types are not calculated automatically yet.
 */
export function PayCardWageTypeSummary({ rules }: { rules: PayCardRule[] }) {
  const wageTypesQuery = useWageTypes()
  const wageTypes = wageTypesQuery.data ?? []
  const byType = new Map<string, PayCardRule[]>()
  for (const rule of rules) {
    const code = classifyPayRule(rule)
    byType.set(code, [...(byType.get(code) ?? []), rule])
  }

  const premiumRules = rules.filter(
    r =>
      r.enhancementMethod &&
      r.enhancementMethod !== 'ABSOLUTE_HOURLY' &&
      r.rateType !== 'SLEEP_IN' &&
      r.rateType !== 'WAKING_NIGHT' &&
      r.rateType !== 'ON_CALL' &&
      r.rateType !== 'TRAINING',
  )
  const hasWeekdayBase = rules.some(
    r =>
      (r.rateType === 'HOURLY' || r.rateType === 'BANDED') &&
      (r.dayType === 'WEEKDAY' || r.dayType === 'ANY') &&
      (!r.enhancementMethod || r.enhancementMethod === 'ABSOLUTE_HOURLY'),
  )

  return (
    <ContentCard className="space-y-4" id="pay-card-wage-types" data-testid="pay-card-wage-type-summary">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300">
          <Layers className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 pt-0.5">
          <h3 className="text-sm font-semibold text-foreground">Wage types on this card</h3>
          <p className="text-xs text-muted-foreground">
            Worked out from the rates above. Types marked &quot;not automatic yet&quot; are not paid from pay cards today.
          </p>
        </div>
      </div>

      {premiumRules.length && !hasWeekdayBase ? (
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Premium, percentage and multiplier rates are applied to the weekday base hourly rate, but this card has
          no weekday hourly rate. Add one, or those rates will pay nothing extra.
        </p>
      ) : null}

      {wageTypesQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading wage types…</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {WAGE_TYPE_CATEGORY_ORDER.map(category => {
          const types = wageTypes.filter(w => w.category === category)
          if (!types.length) return null
          return (
            <div key={category} className="rounded-lg border border-border">
              <p className="border-b border-border bg-muted/30 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {WAGE_TYPE_CATEGORY_LABELS[category as WageTypeCategory]}
              </p>
              <ul className="divide-y divide-border">
                {types.map(type => {
                  const matched = byType.get(type.code) ?? []
                  return (
                    <li key={type.code} className="space-y-1 px-3 py-2 text-sm" data-testid={`wage-summary-${type.code}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={matched.length ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                          {type.name}
                        </span>
                        {matched.length ? (
                          <Badge variant="success">{matched.length} rate{matched.length === 1 ? '' : 's'}</Badge>
                        ) : type.support?.level === 'PAYCARD' || type.support?.level === 'PARTIAL' ? (
                          <Badge variant="secondary">Not configured</Badge>
                        ) : type.support?.level === 'UK_PAYROLL' ? (
                          <Badge variant="info">UK payroll</Badge>
                        ) : type.support?.level === 'PAY_ITEM' ? (
                          <Badge variant="info">Pay items</Badge>
                        ) : (
                          <Badge variant="secondary">Not automatic yet</Badge>
                        )}
                        {!type.isActive ? <Badge variant="warning">Switched off</Badge> : null}
                      </div>
                      {matched.length ? (
                        <p className="text-xs text-muted-foreground">
                          {matched.map(r => `${ruleName(r)}: ${formatRuleRate(r)}`).join(' · ')}
                        </p>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </ContentCard>
  )
}
