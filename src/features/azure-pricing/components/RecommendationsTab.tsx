import { Lightbulb, PartyPopper } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { useRecommendations } from '@/features/azure-pricing/hooks/useAzurePricing'
import type { AdvisorImpact, AdvisorRecommendation } from '@/features/azure-pricing/types'
import { formatDateTimeGb, formatMoney, formatRelativeTime } from '@/features/azure-pricing/lib/azure-pricing-format'
import {
  LoadingRegion,
  TabErrorState,
  TableSkeleton,
} from '@/features/azure-pricing/components/AzurePricingShared'

const IMPACT_VARIANT: Record<AdvisorImpact, 'destructive' | 'warning' | 'info'> = {
  High: 'destructive',
  Medium: 'warning',
  Low: 'info',
}

const IMPACT_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 }

function RecommendationCard({ item }: { item: AdvisorRecommendation }) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm" aria-label={item.problem}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant={IMPACT_VARIANT[item.impact] ?? 'muted'}>{item.impact} impact</Badge>
        <span
          className={
            item.annualSavings != null
              ? 'text-sm font-semibold tabular-nums text-success'
              : 'text-xs text-muted-foreground'
          }
        >
          {item.annualSavings != null ? `Save ~${formatMoney(item.annualSavings, item.currency || 'GBP')}/year` : 'Savings not estimated'}
        </span>
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{item.problem}</h3>
        <p className="text-sm text-muted-foreground">{item.solution}</p>
      </div>
      <p className="mt-auto truncate text-xs text-muted-foreground" title={item.resourceId}>
        Resource: <span className="font-medium text-foreground">{item.resourceName || item.resourceId || '—'}</span>
      </p>
    </article>
  )
}

export function RecommendationsTab() {
  const query = useRecommendations()

  if (query.isLoading) {
    return (
      <LoadingRegion label="Loading recommendations">
        <TableSkeleton rows={3} />
      </LoadingRegion>
    )
  }
  if (query.isError || !query.data) {
    return <TabErrorState error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching} />
  }

  const items = [...query.data.items].sort(
    (a, b) => (IMPACT_ORDER[a.impact] ?? 9) - (IMPACT_ORDER[b.impact] ?? 9) || (b.annualSavings ?? 0) - (a.annualSavings ?? 0),
  )
  const totalSavings = items.reduce((s, i) => s + (i.annualSavings ?? 0), 0)
  const currency = items[0]?.currency || 'GBP'

  return (
    <div className="space-y-4" data-testid="azure-recommendations">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <p className="inline-flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" aria-hidden />
          Azure Advisor cost recommendations
          {items.length > 0 && totalSavings > 0 ? (
            <span className="font-medium text-foreground">
              · potential savings ~{formatMoney(totalSavings, currency)}/year
            </span>
          ) : null}
        </p>
        <p title={formatDateTimeGb(query.data.refreshedAt)}>Refreshed {formatRelativeTime(query.data.refreshedAt)}</p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
            <PartyPopper className="h-6 w-6" aria-hidden />
          </div>
          <h3 className="text-base font-semibold text-foreground">No cost recommendations right now</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Azure Advisor hasn't found anything to resize, shut down or reserve. Recommendations are checked daily.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map(item => (
            <RecommendationCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
