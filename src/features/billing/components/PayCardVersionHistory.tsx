import * as React from 'react'
import { ChevronDown, ChevronRight, History, Loader2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { CollapsibleCard } from '@/shared/ui/content-section'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { PayCardRuleTable } from '@/features/billing/components/PayCardDetailsView'
import { usePayCardVersions } from '@/features/billing/hooks/usePayCards'
import { formatBillingDate } from '@/features/billing/types/billing-cards.types'

type PayCardVersionHistoryProps = {
  cardId: string
  currency: string
}

/** Rate history of a pay card: every version with the dates it applies to and its own rates (read-only). */
export function PayCardVersionHistory({ cardId, currency }: PayCardVersionHistoryProps) {
  const versionsQuery = usePayCardVersions(cardId)
  const versions = versionsQuery.data ?? []
  const [expanded, setExpanded] = React.useState<Set<number>>(new Set())

  const toggle = (version: number) =>
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(version)) next.delete(version)
      else next.add(version)
      return next
    })

  return (
    <CollapsibleCard
      id="pay-card-history"
      data-testid="pay-card-version-history"
      icon={<History className="h-4 w-4" aria-hidden />}
      iconClassName="bg-violet-500/10 text-violet-700 dark:text-violet-300"
      title="Rate history"
      description="Changing the rates of an active card saves a new version. Older versions are kept and still pay visits dated before the next version starts."
    >
      {versionsQuery.isLoading ? (
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading rate history…
        </p>
      ) : versionsQuery.error ? (
        <p className="text-sm text-destructive">
          {versionsQuery.error instanceof ApiError ? versionsQuery.error.message : 'Could not load rate history.'}
        </p>
      ) : versions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rate history recorded for this card.</p>
      ) : (
        <ol className="space-y-3">
          {versions.map(v => {
            const isOpen = expanded.has(v.version)
            // A version replaced on the day it started never priced any visit.
            const neverApplied = !!v.effectiveTo && v.effectiveTo.slice(0, 10) < v.effectiveFrom.slice(0, 10)
            return (
              <li
                key={v.id}
                className="rounded-lg border border-border"
                data-testid={`pay-card-version-${v.version}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">Version {v.version}</span>
                      {v.isCurrent ? <Badge variant="success">Current</Badge> : <Badge variant="secondary">Previous</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {neverApplied
                        ? `Replaced on the day it started (${formatBillingDate(v.effectiveFrom)}) — never applied`
                        : `Applies ${formatBillingDate(v.effectiveFrom)} → ${v.effectiveTo ? formatBillingDate(v.effectiveTo) : 'open'}`}
                      {' · '}
                      {v.rules.length} rate{v.rules.length === 1 ? '' : 's'}
                      {' · '}
                      Saved {formatBillingDate(v.createdAt)}
                      {v.createdByName ? ` by ${v.createdByName}` : ''}
                    </p>
                    {v.changeNote ? <p className="text-xs text-foreground/80">Reason: {v.changeNote}</p> : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    leftIcon={isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    onClick={() => toggle(v.version)}
                    aria-expanded={isOpen}
                  >
                    {isOpen ? 'Hide rates' : 'Show rates'}
                  </Button>
                </div>
                {isOpen ? (
                  <div className="overflow-x-auto border-t border-border">
                    {v.rules.length ? (
                      <PayCardRuleTable rules={v.rules} currency={currency} />
                    ) : (
                      <p className="px-4 py-3 text-sm text-muted-foreground">No rates in this version.</p>
                    )}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ol>
      )}
    </CollapsibleCard>
  )
}
