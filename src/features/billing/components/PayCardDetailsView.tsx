import { CalendarDays, CreditCard, ExternalLink, ListChecks, Loader2, Users } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { RateCardStatusBadge, formatBillingLabel } from '@/features/billing/components/BillingStatusBadge'
import { getRuleRateTypeLabel, isHourlyLongVisitRule, isMileageRule, isTravelTimeRule, isWaitingTimeRule } from '@/features/billing/utils/billing-card-rule.util'
import {
  PAY_CARD_RULE_CATEGORY_ORDER,
  categorizePayCardRule,
  formatBillingDate,
  formatBillingCurrencyDisplay,
  formatPayCardAssignmentDisplay,
  formatPayCardRuleAmount,
  formatPayCardRuleDayType,
  formatPayCardRuleTimeBand,
  formatVisitDurationLabel,
  type PayCard,
  type PayCardRule,
  type PayCardRuleCategory,
} from '@/features/billing/types/billing-cards.types'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'

type PayCardDetailsViewProps = {
  card: PayCard
  assignmentSource?: 'EXPLICIT' | 'MATCHED' | 'PREVIEW' | null
  matchedLevelLabel?: string | null
  /** Why this card matches (or does not match) the current carer. */
  matchReason?: string | null
  loading?: boolean
  showManageLink?: boolean
  groupRules?: boolean
}

function assignmentSourceLabel(
  source: PayCardDetailsViewProps['assignmentSource'],
  matchedLevelLabel?: string | null,
): string | null {
  if (source === 'EXPLICIT') return 'Assigned on this employee'
  if (source === 'MATCHED') {
    return matchedLevelLabel
      ? `Auto-matched by ${matchedLevelLabel.toLowerCase()}`
      : 'Auto-matched from pay card rules'
  }
  if (source === 'PREVIEW') return 'Preview — not saved yet'
  return null
}

function groupRulesByCategory(rules: PayCardRule[]): Map<PayCardRuleCategory, PayCardRule[]> {
  const grouped = new Map<PayCardRuleCategory, PayCardRule[]>()
  for (const rule of rules) {
    const category = categorizePayCardRule(rule)
    const list = grouped.get(category) ?? []
    list.push(rule)
    grouped.set(category, list)
  }
  return grouped
}

function RuleTable({
  rules,
  currency,
}: {
  rules: PayCardRule[]
  currency: string
}) {
  return (
    <table className="w-full min-w-[720px] text-sm">
      <thead>
        <tr className="border-b border-border bg-muted/40">
          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Rule</th>
          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Duration</th>
          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Day</th>
          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Time band</th>
          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Rate type</th>
          <th className="px-3 py-2 text-right font-medium text-muted-foreground">
            Amount ({formatBillingCurrencyDisplay(currency)})
          </th>
        </tr>
      </thead>
      <tbody>
        {rules.map((rule, index) => {
          const timeBand = formatPayCardRuleTimeBand(rule)
          return (
            <tr key={rule.id ?? `${rule.label}-${index}`} className="border-b border-border last:border-0">
              <td className="px-3 py-2.5">
                <span className="font-medium">{rule.label?.trim() || `Rule ${index + 1}`}</span>
                {rule.serviceType?.trim() ? (
                  <p className="text-xs text-muted-foreground">{rule.serviceType}</p>
                ) : null}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">
                {isMileageRule(rule)
                  ? 'Per mile'
                  : isTravelTimeRule(rule)
                    ? 'Travel hours'
                    : isWaitingTimeRule(rule)
                      ? 'Waiting hours'
                      : isHourlyLongVisitRule(rule)
                        ? 'Over 1 hour'
                        : (formatVisitDurationLabel(rule.minimumMinutes) ?? '—')}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">
                {formatPayCardRuleDayType(rule.dayType)}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">{timeBand ?? '—'}</td>
              <td className="px-3 py-2.5 text-muted-foreground">
                {getRuleRateTypeLabel(rule)}
                {rule.rateType === 'MILEAGE'
                  || rule.rateType === 'TRAVEL_TIME'
                  || rule.rateType === 'WAITING_TIME'
                  || rule.rateType === 'PREMIUM'
                  || rule.rateType === 'UPLIFT'
                  || rule.rateType === 'DEDUCTION'
                  ? ` · ${formatBillingLabel(rule.rateType)}`
                  : null}
              </td>
              <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                {formatPayCardRuleAmount(rule, currency)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export function PayCardDetailsView({
  card,
  assignmentSource,
  matchedLevelLabel,
  matchReason,
  loading,
  showManageLink,
  groupRules = true,
}: PayCardDetailsViewProps) {
  const sourceLabel = assignmentSourceLabel(assignmentSource, matchedLevelLabel)
  const rules = [...(card.rules ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const grouped = groupRules ? groupRulesByCategory(rules) : null

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4" data-testid="pay-card-details">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-300">
            <CreditCard className="h-5 w-5" aria-hidden />
          </span>
          <div className="space-y-1">
            <p className="font-semibold text-foreground">{card.name}</p>
            <p className="text-xs font-mono text-muted-foreground">{card.code}</p>
            {sourceLabel ? (
              <Badge variant={assignmentSource === 'PREVIEW' ? 'warning' : 'secondary'} className="mt-1">
                {sourceLabel}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RateCardStatusBadge status={card.status} />
          {showManageLink ? (
            <Button variant="outline" size="sm" asChild>
              <Link to="/billing" search={{ tab: 'pay-cards' }} className="inline-flex items-center gap-1.5">
                Manage in Billing
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {matchReason ? (
        <div
          className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2.5 text-sm"
          data-testid="pay-card-match-reason"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-sky-800 dark:text-sky-200">
            Why this matches the carer
          </p>
          <p className="mt-1 text-foreground">{matchReason}</p>
        </div>
      ) : null}

      <dl className="grid gap-3 rounded-lg border border-border bg-muted/10 p-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" aria-hidden />
            Applies to
          </dt>
          <dd className="mt-0.5">{formatPayCardAssignmentDisplay(card)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Currency</dt>
          <dd className="mt-0.5">{formatBillingCurrencyDisplay(card.currency)}</dd>
        </div>
        <div>
          <dt className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            Effective period
          </dt>
          <dd className="mt-0.5">
            {formatBillingDate(card.effectiveFrom)}
            {card.effectiveTo ? ` → ${formatBillingDate(card.effectiveTo)}` : ' → open-ended'}
          </dd>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <dt className="text-xs text-muted-foreground">Notes</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-muted-foreground">
            {card.notes?.trim() || '—'}
          </dd>
        </div>
      </dl>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
            <ListChecks className="h-4 w-4 text-muted-foreground" aria-hidden />
            Rate rules
          </h3>
          <span className="text-xs text-muted-foreground">{rules.length} rule{rules.length === 1 ? '' : 's'}</span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading rate rules…
          </div>
        ) : rules.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-background/60 px-3 py-4 text-sm text-muted-foreground">
            No rate rules configured on this pay card.
          </p>
        ) : groupRules && grouped ? (
          PAY_CARD_RULE_CATEGORY_ORDER.filter(cat => grouped.has(cat)).map(category => (
            <div key={category} className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category}</h4>
              <div className="overflow-x-auto rounded-md border border-border bg-background">
                <RuleTable rules={grouped.get(category)!} currency={card.currency} />
              </div>
            </div>
          ))
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-background">
            <RuleTable rules={rules} currency={card.currency} />
          </div>
        )}
      </div>
    </div>
  )
}
