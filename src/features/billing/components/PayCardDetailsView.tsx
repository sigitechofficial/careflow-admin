import { ExternalLink, Loader2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { RateCardStatusBadge, formatBillingLabel } from '@/features/billing/components/BillingStatusBadge'
import {
  BILLING_RATE_TYPE_OPTIONS,
  formatBillingDate,
  formatBillingCurrencyDisplay,
  formatPayCardAssignmentDisplay,
  formatPayCardRuleAmount,
  formatPayCardRuleDayType,
  formatVisitDurationLabel,
  type PayCard,
} from '@/features/billing/types/billing-cards.types'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'

type PayCardDetailsViewProps = {
  card: PayCard
  assignmentSource?: 'EXPLICIT' | 'MATCHED' | 'PREVIEW' | null
  matchedLevelLabel?: string | null
  loading?: boolean
  showManageLink?: boolean
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

export function PayCardDetailsView({
  card,
  assignmentSource,
  matchedLevelLabel,
  loading,
  showManageLink,
}: PayCardDetailsViewProps) {
  const sourceLabel = assignmentSourceLabel(assignmentSource, matchedLevelLabel)
  const rules = [...(card.rules ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

  return (
    <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-4" data-testid="pay-card-details">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-semibold text-foreground">{card.name}</p>
          <p className="text-xs font-mono text-muted-foreground">{card.code}</p>
          {sourceLabel ? (
            <Badge variant={assignmentSource === 'PREVIEW' ? 'warning' : 'secondary'} className="mt-1">
              {sourceLabel}
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RateCardStatusBadge status={card.status} />
          {showManageLink ? (
            <Button variant="outline" size="sm" asChild>
              <Link to="/billing" search={{ tab: 'pay-cards' }}>
                Manage in Billing
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">Applies to</dt>
          <dd className="mt-0.5">{formatPayCardAssignmentDisplay(card)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Currency</dt>
          <dd className="mt-0.5">{formatBillingCurrencyDisplay(card.currency)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Effective period</dt>
          <dd className="mt-0.5">
            {formatBillingDate(card.effectiveFrom)}
            {card.effectiveTo ? ` → ${formatBillingDate(card.effectiveTo)}` : ' → open-ended'}
          </dd>
        </div>
        {card.assignedCarerCount != null ? (
          <div>
            <dt className="text-xs text-muted-foreground">Carers on this card</dt>
            <dd className="mt-0.5 tabular-nums">{card.assignedCarerCount}</dd>
          </div>
        ) : null}
        <div className="sm:col-span-2 lg:col-span-3">
          <dt className="text-xs text-muted-foreground">Notes</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-muted-foreground">
            {card.notes?.trim() || '—'}
          </dd>
        </div>
      </dl>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Rate rules</h3>
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
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-background">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Rule</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Duration</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Day</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Rate type</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                    Amount ({formatBillingCurrencyDisplay(card.currency)})
                  </th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule, index) => (
                  <tr key={rule.id ?? index} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5">
                      <span className="font-medium">{rule.label?.trim() || `Rule ${index + 1}`}</span>
                      {rule.serviceType?.trim() ? (
                        <p className="text-xs text-muted-foreground">{rule.serviceType}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {formatVisitDurationLabel(rule.minimumMinutes) ?? 'Any duration'}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {formatPayCardRuleDayType(rule.dayType)}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {BILLING_RATE_TYPE_OPTIONS.find(o => o.value === rule.rateType)?.label
                        ?? formatBillingLabel(rule.rateType)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                      {formatPayCardRuleAmount(rule, card.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
