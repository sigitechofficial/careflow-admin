import * as React from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { CostShareRow, DailyCost } from '@/features/azure-pricing/types'
import {
  formatDateGb,
  formatMoney,
  formatMoneyAxis,
  formatPercent,
  formatShortDateGb,
} from '@/features/azure-pricing/lib/azure-pricing-format'
import { CHART_COLORS, chartAxisTick, chartTooltipStyle } from '@/features/azure-pricing/components/AzurePricingShared'

function totalOf(rows: { cost: number }[]): number {
  return rows.reduce((sum, r) => sum + (Number.isFinite(r.cost) ? r.cost : 0), 0)
}

export function DailySpendChart({
  data,
  currency,
  height = 240,
  mode = 'area',
}: {
  data: DailyCost[]
  currency: string
  height?: number
  mode?: 'area' | 'bar' | 'stacked'
}) {
  const total = totalOf(data)
  const label = `Daily spend from ${formatDateGb(data[0]?.date)} to ${formatDateGb(data[data.length - 1]?.date)}, total ${formatMoney(total, currency)}`

  const stackedKeys = React.useMemo(() => {
    if (mode !== 'stacked') return []
    const totals = new Map<string, number>()
    for (const d of data) {
      for (const [k, v] of Object.entries(d.groups ?? {})) totals.set(k, (totals.get(k) ?? 0) + v)
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k)
  }, [data, mode])

  const stackedData = React.useMemo(
    () => (mode === 'stacked' ? data.map(d => ({ date: d.date, ...(d.groups ?? {}) })) : []),
    [data, mode],
  )

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        No daily cost data for this period yet.
      </div>
    )
  }

  const tooltip = (
    <Tooltip
      contentStyle={chartTooltipStyle}
      formatter={value => formatMoney(Number(value), currency)}
      labelFormatter={value => formatDateGb(String(value))}
    />
  )
  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
      <XAxis dataKey="date" tick={chartAxisTick} tickFormatter={v => formatShortDateGb(String(v))} minTickGap={16} />
      <YAxis tick={chartAxisTick} tickFormatter={v => formatMoneyAxis(Number(v), currency)} width={52} />
    </>
  )

  return (
    <figure role="img" aria-label={label} className="m-0">
      <ResponsiveContainer width="100%" height={height}>
        {mode === 'stacked' ? (
          <BarChart data={stackedData}>
            {axes}
            {tooltip}
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {stackedKeys.map((k, i) => (
              <Bar key={k} dataKey={k} stackId="cost" fill={CHART_COLORS[i % CHART_COLORS.length]} maxBarSize={36} />
            ))}
          </BarChart>
        ) : mode === 'bar' ? (
          <BarChart data={data}>
            {axes}
            {tooltip}
            <Bar dataKey="cost" name="Cost" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} maxBarSize={36} />
          </BarChart>
        ) : (
          <AreaChart data={data}>
            <defs>
              <linearGradient id="azureDailyFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            {axes}
            {tooltip}
            <Area
              type="monotone"
              dataKey="cost"
              name="Cost"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#azureDailyFill)"
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </figure>
  )
}

/** Top N slices + "Other" so the donut stays legible. */
export function collapseSlices(rows: CostShareRow[], max = 6): CostShareRow[] {
  const sorted = [...rows].sort((a, b) => b.cost - a.cost)
  if (sorted.length <= max) return sorted
  const head = sorted.slice(0, max - 1)
  const tail = sorted.slice(max - 1)
  return [
    ...head,
    {
      key: '__other__',
      label: `Other (${tail.length})`,
      cost: totalOf(tail),
      share: tail.reduce((s, r) => s + (r.share ?? 0), 0),
    },
  ]
}

export function ServiceDonut({ rows, currency }: { rows: CostShareRow[]; currency: string }) {
  const slices = collapseSlices(rows)
  if (slices.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No spend recorded this month yet.</p>
  }
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[200px_1fr]">
      <figure role="img" aria-label="Spend by service" className="m-0 mx-auto h-[200px] w-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="cost"
              nameKey="label"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={1}
              stroke="hsl(var(--card))"
            >
              {slices.map((s, i) => (
                <Cell key={s.key} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={chartTooltipStyle} formatter={value => formatMoney(Number(value), currency)} />
          </PieChart>
        </ResponsiveContainer>
      </figure>
      <ul className="min-w-0 space-y-1.5 text-sm">
        {slices.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate" title={s.label}>
              {s.label}
            </span>
            <span className="tabular-nums text-foreground">{formatMoney(s.cost, currency)}</span>
            <span className="w-14 text-right tabular-nums text-muted-foreground">{formatPercent(s.share)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
