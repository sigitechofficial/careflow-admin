import { ArrowDownRight, ArrowRight, ArrowUpRight, BellRing, CalendarRange, CheckCircle2, Minus, PoundSterling, TrendingUp } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { useCostOverview } from '@/features/azure-pricing/hooks/useAzurePricing'
import type { AzurePricingTabId, CostOverview } from '@/features/azure-pricing/types'
import {
  changeDirection,
  formatMoney,
  formatPercent,
  formatSignedPercent,
} from '@/features/azure-pricing/lib/azure-pricing-format'
import {
  ChartSkeleton,
  FeatureDisabledState,
  KpiCard,
  KpiSkeletonRow,
  LoadingRegion,
  PanelCard,
  TabErrorState,
  TableSkeleton,
} from '@/features/azure-pricing/components/AzurePricingShared'
import { BudgetCard } from '@/features/azure-pricing/components/BudgetCard'
import { DailySpendChart, ServiceDonut } from '@/features/azure-pricing/components/CostCharts'

function ChangeKpi({ data }: { data: CostOverview }) {
  const dir = changeDirection(data.changeVsLastMonthPercent)
  const Icon = dir === 'up' ? ArrowUpRight : dir === 'down' ? ArrowDownRight : Minus
  const tone =
    dir === 'up' ? 'text-destructive' : dir === 'down' ? 'text-success' : 'text-muted-foreground'
  return (
    <KpiCard
      label="Vs last month (same period)"
      icon={<CalendarRange className="h-5 w-5" aria-hidden />}
      testId="azure-kpi-change"
      value={
        dir === 'none' ? (
          '—'
        ) : (
          <span className={cn('inline-flex items-center gap-1', tone)}>
            <Icon className="h-5 w-5" aria-hidden />
            {formatSignedPercent(data.changeVsLastMonthPercent)}
            <span className="sr-only">
              {dir === 'up' ? 'higher than' : dir === 'down' ? 'lower than' : 'the same as'} last month
            </span>
          </span>
        )
      }
      sub={
        dir === 'none'
          ? 'No spend recorded for the same days last month, so there is nothing to compare yet.'
          : `Same period last month ${formatMoney(data.lastMonthSamePeriod, data.currency)} · full last month ${formatMoney(data.lastMonthTotal, data.currency)}`
      }
    />
  )
}

export function OverviewTab({ onNavigateTab }: { onNavigateTab: (tab: AzurePricingTabId) => void }) {
  const { data, isLoading, isError, error, refetch, isFetching } = useCostOverview()

  if (isLoading) {
    return (
      <LoadingRegion label="Loading cost overview">
        <KpiSkeletonRow />
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <TableSkeleton />
      </LoadingRegion>
    )
  }
  if (isError || !data) {
    return <TabErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} />
  }
  if (!data.enabled && !data.lastSyncedAt) return <FeatureDisabledState />

  const currency = data.currency || 'GBP'
  const last30 = data.dailyTrend.slice(-30)
  const top5 = [...data.topResources].sort((a, b) => b.cost - a.cost).slice(0, 5)

  return (
    <div className="space-y-4" data-testid="azure-overview">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Month to date"
          value={formatMoney(data.monthToDate, currency)}
          sub={data.dataThrough ? 'Actual spend so far this month' : 'No costs recorded yet this month'}
          icon={<PoundSterling className="h-5 w-5" aria-hidden />}
          testId="azure-kpi-mtd"
        />
        <KpiCard
          label="Forecast month end"
          value={formatMoney(data.forecastMonthEnd, currency)}
          sub={
            data.forecastSource === 'azure'
              ? 'Azure Cost Management forecast'
              : data.forecastSource === 'projection'
                ? 'Projected from actual spend so far (Azure forecast not available yet)'
                : 'Month-end forecast'
          }
          icon={<TrendingUp className="h-5 w-5" aria-hidden />}
          testId="azure-kpi-forecast"
        />
        <ChangeKpi data={data} />
        <BudgetCard budget={data.budget} currency={currency} />
      </div>

      {data.openAnomalies > 0 ? (
        <div
          className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 sm:flex-row sm:items-center"
          role="alert"
          data-testid="azure-open-anomalies"
        >
          <BellRing className="h-5 w-5 shrink-0 text-warning" aria-hidden />
          <p className="flex-1 text-sm text-foreground">
            <span className="font-semibold">
              {data.openAnomalies} open cost {data.openAnomalies === 1 ? 'anomaly' : 'anomalies'}
            </span>{' '}
            — a day's spend jumped well above the recent average. Review and acknowledge on the Alerts tab.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigateTab('alerts')}
            rightIcon={<ArrowRight className="h-4 w-4" aria-hidden />}
          >
            View alerts
          </Button>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="azure-no-anomalies">
          <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
          No open cost anomalies.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard title="Daily spend" description="Last 30 days of actual cost">
          <DailySpendChart data={last30} currency={currency} />
        </PanelCard>
        <PanelCard title="Spend by service" description="This month to date">
          <ServiceDonut rows={data.byService} currency={currency} />
        </PanelCard>
      </div>

      <PanelCard
        title="Top 5 resources"
        description="Most expensive resources this month"
        bodyClassName="p-0"
        action={
          <Button size="sm" variant="ghost" onClick={() => onNavigateTab('breakdown')}>
            Full breakdown
          </Button>
        }
      >
        {top5.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No resource costs recorded this month yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">Resource</th>
                  <th scope="col" className="hidden px-4 py-2 font-medium md:table-cell">Service</th>
                  <th scope="col" className="hidden px-4 py-2 font-medium lg:table-cell">Resource group</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Cost</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {top5.map(r => (
                  <tr key={r.key}>
                    <td className="max-w-[16rem] truncate px-4 py-2 font-medium text-foreground" title={r.key}>
                      {r.label}
                    </td>
                    <td className="hidden px-4 py-2 text-muted-foreground md:table-cell">{r.service ?? '—'}</td>
                    <td className="hidden px-4 py-2 text-muted-foreground lg:table-cell">{r.resourceGroup ?? '—'}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatMoney(r.cost, currency)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{formatPercent(r.share)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </div>
  )
}
