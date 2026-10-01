import * as React from 'react'
import { CalendarCheck, HeartHandshake, PoundSterling, UserRound } from 'lucide-react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Label } from '@/shared/ui/form-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { cn } from '@/shared/lib/utils'
import { useUnitEconomics } from '@/features/azure-pricing/hooks/useAzurePricing'
import { recentMonthOptions, toIsoMonth } from '@/features/azure-pricing/lib/azure-pricing-forms'
import {
  formatCount,
  formatMoney,
  formatMoneyAxis,
  formatMonthGb,
} from '@/features/azure-pricing/lib/azure-pricing-format'
import {
  CHART_COLORS,
  ChartSkeleton,
  KpiCard,
  KpiSkeletonRow,
  LoadingRegion,
  MaybeValue,
  PanelCard,
  TabErrorState,
  chartAxisTick,
  chartTooltipStyle,
} from '@/features/azure-pricing/components/AzurePricingShared'

const SERIES = [
  { key: 'costPerServiceUser', label: 'Per service user' },
  { key: 'costPerCarer', label: 'Per carer' },
  { key: 'costPerVisit', label: 'Per visit' },
] as const

export function BusinessMetricsTab() {
  const months = React.useMemo(() => recentMonthOptions(new Date(), 12), [])
  const [month, setMonth] = React.useState(() => toIsoMonth(new Date()))
  const query = useUnitEconomics(month)
  const data = query.data
  const currency = data?.currency || 'GBP'
  const money = (v: number | null) => (v == null ? null : formatMoney(v, currency))

  const history = React.useMemo(
    () => [...(data?.history ?? [])].sort((a, b) => a.month.localeCompare(b.month)).slice(-6),
    [data],
  )

  const monthPicker = (
    <div className="flex items-center gap-2">
      <Label htmlFor="azure-unit-month" className="text-sm">
        Month
      </Label>
      <Select value={month} onValueChange={setMonth}>
        <SelectTrigger id="azure-unit-month" className="w-48" aria-label="Month">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map(m => (
            <SelectItem key={m.value} value={m.value}>
              {formatMonthGb(m.value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  let body: React.ReactNode
  if (query.isLoading) {
    body = (
      <LoadingRegion label="Loading business metrics">
        <KpiSkeletonRow />
        <ChartSkeleton />
      </LoadingRegion>
    )
  } else if (query.isError || !data) {
    body = <TabErrorState error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching} />
  } else {
    body = (
      <div className={cn('space-y-4 transition-opacity', query.isFetching && 'opacity-60')}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Azure cost"
            value={formatMoney(data.totalCost, currency)}
            sub={formatMonthGb(data.month)}
            icon={<PoundSterling className="h-5 w-5" aria-hidden />}
            testId="azure-unit-total"
          />
          <KpiCard
            label="Cost per service user"
            value={<MaybeValue value={money(data.costPerServiceUser)} reason="No active service users in this month." />}
            sub={`${formatCount(data.activeServiceUsers)} active service users`}
            icon={<UserRound className="h-5 w-5" aria-hidden />}
            testId="azure-unit-per-su"
          />
          <KpiCard
            label="Cost per carer"
            value={<MaybeValue value={money(data.costPerCarer)} reason="No active carers in this month." />}
            sub={`${formatCount(data.activeCarers)} active carers`}
            icon={<HeartHandshake className="h-5 w-5" aria-hidden />}
            testId="azure-unit-per-carer"
          />
          <KpiCard
            label="Cost per visit"
            value={<MaybeValue value={money(data.costPerVisit)} reason="No completed visits in this month." />}
            sub={`${formatCount(data.completedVisits)} completed visits`}
            icon={<CalendarCheck className="h-5 w-5" aria-hidden />}
            testId="azure-unit-per-visit"
          />
        </div>

        <PanelCard title="Last 6 months" description="Platform cost per unit of care delivered">
          {history.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No history yet.</p>
          ) : (
            <div className="space-y-4">
              <figure role="img" aria-label="Cost per service user, carer and visit over the last 6 months" className="m-0">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" tick={chartAxisTick} tickFormatter={v => formatMonthGb(String(v), 'short')} />
                    <YAxis tick={chartAxisTick} tickFormatter={v => formatMoneyAxis(Number(v), currency)} width={52} />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      formatter={value => (value == null ? '—' : formatMoney(Number(value), currency))}
                      labelFormatter={v => formatMonthGb(String(v))}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {SERIES.map((s, i) => (
                      <Line
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        name={s.label}
                        stroke={CHART_COLORS[i]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </figure>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">Month</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Total</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Per service user</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Per carer</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Per visit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[...history].reverse().map(h => (
                      <tr key={h.month} className={cn(h.month === data.month && 'bg-primary/5')}>
                        <td className="whitespace-nowrap px-3 py-2 font-medium">{formatMonthGb(h.month)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMoney(h.totalCost, currency)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          <MaybeValue value={money(h.costPerServiceUser)} reason="No active service users that month." />
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          <MaybeValue value={money(h.costPerCarer)} reason="No active carers that month." />
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          <MaybeValue value={money(h.costPerVisit)} reason="No completed visits that month." />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </PanelCard>
      </div>
    )
  }

  return (
    <div className="space-y-4" data-testid="azure-business">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Azure spend divided by care activity — a quick check that platform cost scales with the business.
        </p>
        {monthPicker}
      </div>
      {body}
    </div>
  )
}
