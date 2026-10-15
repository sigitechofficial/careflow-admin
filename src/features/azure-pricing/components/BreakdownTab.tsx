import * as React from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Download } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { useCostBreakdown, useExportCostBreakdown } from '@/features/azure-pricing/hooks/useAzurePricing'
import {
  BREAKDOWN_GROUP_BYS,
  type BreakdownGroupBy,
  type CostShareRow,
} from '@/features/azure-pricing/types'
import {
  DATE_RANGE_PRESETS,
  isValidDateRange,
  resolveDateRange,
  sortCostRows,
  type BreakdownSortKey,
  type DateRangePreset,
  type SortDirection,
} from '@/features/azure-pricing/lib/azure-pricing-forms'
import { formatDateGb, formatMoney, formatPercent } from '@/features/azure-pricing/lib/azure-pricing-format'
import { downloadTextFile } from '@/features/azure-pricing/lib/download'
import {
  ChartSkeleton,
  FeatureDisabledState,
  LoadingRegion,
  PanelCard,
  TabErrorState,
  TableSkeleton,
} from '@/features/azure-pricing/components/AzurePricingShared'
import { DailySpendChart } from '@/features/azure-pricing/components/CostCharts'

const GROUP_BY_LABELS: Record<BreakdownGroupBy, string> = {
  service: 'Service',
  resource: 'Resource',
  resourceGroup: 'Resource group',
  meter: 'Meter',
}

function SortHeader({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
  align = 'left',
}: {
  label: string
  column: BreakdownSortKey
  sortKey: BreakdownSortKey
  sortDir: SortDirection
  onSort: (key: BreakdownSortKey) => void
  align?: 'left' | 'right'
}) {
  const active = sortKey === column
  const Icon = !active ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th
      scope="col"
      className={cn('px-4 py-2 font-medium', align === 'right' && 'text-right')}
      aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          'inline-flex items-center gap-1 rounded-sm uppercase hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          active && 'text-foreground',
        )}
      >
        {label}
        <Icon className="h-3 w-3" aria-hidden />
      </button>
    </th>
  )
}

export function BreakdownTab() {
  const canManage = useAuthStore(s => s.can('platform_costs.manage'))
  const [preset, setPreset] = React.useState<DateRangePreset>('this-month')
  const [custom, setCustom] = React.useState(() => resolveDateRange('this-month'))
  const [groupBy, setGroupBy] = React.useState<BreakdownGroupBy>('service')
  const [chartMode, setChartMode] = React.useState<'bar' | 'stacked'>('bar')
  const [sortKey, setSortKey] = React.useState<BreakdownSortKey>('cost')
  const [sortDir, setSortDir] = React.useState<SortDirection>('desc')

  const customValid = isValidDateRange(custom)
  const range = preset === 'custom' ? (customValid ? custom : null) : resolveDateRange(preset)
  const params = range ? { ...range, groupBy } : null
  const query = useCostBreakdown(params ?? { ...resolveDateRange('this-month'), groupBy }, params !== null)
  const exportMut = useExportCostBreakdown()

  const data = query.data
  const currency = data?.currency || 'GBP'
  const rows: CostShareRow[] = React.useMemo(
    () => (data ? sortCostRows(data.rows, sortKey, sortDir) : []),
    [data, sortKey, sortDir],
  )
  const hasGroupedDaily = !!data?.daily.some(d => d.groups && Object.keys(d.groups).length > 0)
  const showResourceCols = groupBy === 'resource'

  const onSort = (key: BreakdownSortKey) => {
    if (key === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir(key === 'label' ? 'asc' : 'desc')
    }
  }

  const onExport = async () => {
    if (!params) return
    try {
      const result = await exportMut.mutateAsync(params)
      if (!result.csv) {
        toastWarning('Nothing to export', 'The export came back empty for this range.')
        return
      }
      downloadTextFile(result.csv, result.filename)
      toastSuccess('Export downloaded', result.filename)
    } catch (e) {
      toastApiError(e, 'Export failed')
    }
  }

  const filters = (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end">
      <div className="space-y-1.5">
        <Label htmlFor="azure-breakdown-range">Date range</Label>
        <Select value={preset} onValueChange={v => setPreset(v as DateRangePreset)}>
          <SelectTrigger id="azure-breakdown-range" aria-label="Date range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_PRESETS.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {preset === 'custom' ? (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="azure-breakdown-from">From</Label>
            <Input
              id="azure-breakdown-from"
              type="date"
              value={custom.from}
              max={custom.to || undefined}
              onChange={e => setCustom(c => ({ ...c, from: e.target.value }))}
              error={!customValid}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="azure-breakdown-to">To</Label>
            <Input
              id="azure-breakdown-to"
              type="date"
              value={custom.to}
              min={custom.from || undefined}
              onChange={e => setCustom(c => ({ ...c, to: e.target.value }))}
              error={!customValid}
            />
          </div>
        </>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="azure-breakdown-group">Group by</Label>
        <Select value={groupBy} onValueChange={v => setGroupBy(v as BreakdownGroupBy)}>
          <SelectTrigger id="azure-breakdown-group" aria-label="Group by">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BREAKDOWN_GROUP_BYS.map(g => (
              <SelectItem key={g} value={g}>
                {GROUP_BY_LABELS[g]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {canManage ? (
        <Button
          variant="outline"
          onClick={() => void onExport()}
          loading={exportMut.isPending}
          disabled={!params}
          leftIcon={<Download className="h-4 w-4" aria-hidden />}
          className="lg:col-start-5"
        >
          Export CSV
        </Button>
      ) : null}
      {preset === 'custom' && !customValid ? (
        <p className="text-xs text-destructive sm:col-span-2 lg:col-span-5" role="alert">
          Choose a start date on or before the end date.
        </p>
      ) : null}
    </div>
  )

  let body: React.ReactNode
  if (!params && !data) {
    body = null
  } else if (query.isLoading) {
    body = (
      <LoadingRegion label="Loading cost breakdown">
        <ChartSkeleton />
        <TableSkeleton rows={8} />
      </LoadingRegion>
    )
  } else if (query.isError || !data) {
    body = <TabErrorState error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching} />
  } else if (!data.enabled && !data.lastSyncedAt) {
    body = <FeatureDisabledState />
  } else {
    body = (
      <div className={cn('space-y-4 transition-opacity', query.isFetching && 'opacity-60')}>
        <PanelCard
          title="Daily cost"
          description={`${formatDateGb(data.from)} – ${formatDateGb(data.to)} · total ${formatMoney(data.total, currency)}`}
          action={
            <div className="inline-flex rounded-lg bg-muted p-0.5" role="group" aria-label="Chart style">
              {(['bar', 'stacked'] as const).map(m => {
                const disabled = m === 'stacked' && !hasGroupedDaily
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={disabled}
                    aria-pressed={chartMode === m}
                    title={disabled ? 'The API does not provide a per-group daily split for this view yet' : undefined}
                    onClick={() => setChartMode(m)}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                      chartMode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {m === 'bar' ? 'Total' : `Stacked by ${GROUP_BY_LABELS[groupBy].toLowerCase()}`}
                  </button>
                )
              })}
            </div>
          }
        >
          <DailySpendChart
            data={data.daily}
            currency={currency}
            height={260}
            mode={chartMode === 'stacked' && hasGroupedDaily ? 'stacked' : 'bar'}
          />
        </PanelCard>

        <PanelCard
          title={`Cost by ${GROUP_BY_LABELS[groupBy].toLowerCase()}`}
          description={`${rows.length} ${rows.length === 1 ? 'row' : 'rows'}`}
          bodyClassName="p-0"
        >
          {rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No costs recorded for this range.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="azure-breakdown-table">
                <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground">
                  <tr>
                    <SortHeader label={GROUP_BY_LABELS[groupBy]} column="label" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    {showResourceCols ? (
                      <>
                        <th scope="col" className="hidden px-4 py-2 font-medium uppercase md:table-cell">Service</th>
                        <th scope="col" className="hidden px-4 py-2 font-medium uppercase lg:table-cell">Resource group</th>
                      </>
                    ) : null}
                    <SortHeader label="Cost" column="cost" sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="right" />
                    <SortHeader label="Share" column="share" sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map(r => (
                    <tr key={r.key}>
                      <td className="max-w-[18rem] px-4 py-2">
                        <span className="block truncate font-medium text-foreground" title={r.key}>
                          {r.label}
                        </span>
                        <span
                          className="mt-1 block h-1 rounded-full bg-primary/60"
                          style={{ width: `${Math.max(2, Math.min(100, r.share))}%` }}
                          aria-hidden
                        />
                      </td>
                      {showResourceCols ? (
                        <>
                          <td className="hidden px-4 py-2 text-muted-foreground md:table-cell">{r.service ?? '—'}</td>
                          <td className="hidden px-4 py-2 text-muted-foreground lg:table-cell">{r.resourceGroup ?? '—'}</td>
                        </>
                      ) : null}
                      <td className="px-4 py-2 text-right tabular-nums">{formatMoney(r.cost, currency)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{formatPercent(r.share)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-border bg-muted/30 font-semibold">
                  <tr>
                    <th scope="row" className="px-4 py-2 text-left">Total</th>
                    {showResourceCols ? (
                      <>
                        <td className="hidden md:table-cell" />
                        <td className="hidden lg:table-cell" />
                      </>
                    ) : null}
                    <td className="px-4 py-2 text-right tabular-nums">{formatMoney(data.total, currency)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatPercent(100)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </PanelCard>
      </div>
    )
  }

  return (
    <div className="space-y-4" data-testid="azure-breakdown">
      <PanelCard>{filters}</PanelCard>
      {body}
    </div>
  )
}
