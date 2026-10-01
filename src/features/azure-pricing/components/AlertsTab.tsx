import * as React from 'react'
import { BellRing, Check, Info } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/form-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import {
  useAcknowledgeAnomaly,
  useCostAnomalies,
  usePlatformCostSettings,
} from '@/features/azure-pricing/hooks/useAzurePricing'
import type { AnomalyStatusFilter, CostAnomaly } from '@/features/azure-pricing/types'
import {
  formatDateGb,
  formatDateTimeGb,
  formatMoney,
  formatSignedPercent,
} from '@/features/azure-pricing/lib/azure-pricing-format'
import {
  LoadingRegion,
  PanelCard,
  TabErrorState,
  TableSkeleton,
} from '@/features/azure-pricing/components/AzurePricingShared'

const STATUS_OPTIONS: { value: AnomalyStatusFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'all', label: 'All' },
]

function RuleExplanation() {
  const settings = usePlatformCostSettings()
  const s = settings.data
  return (
    <div className="flex gap-3 rounded-xl border border-info/20 bg-info/5 p-4 text-sm" data-testid="azure-anomaly-rule">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden />
      <div className="space-y-1">
        <p className="font-medium text-foreground">How anomalies are detected</p>
        {s ? (
          <p className="text-muted-foreground">
            After each cost sync, a day is flagged when its spend is more than{' '}
            <strong className="text-foreground">{s.anomalyThresholdPercent}%</strong> above the average of the previous 7
            days <em>and</em> at least <strong className="text-foreground">{formatMoney(s.anomalyMinDailyIncrease)}</strong>{' '}
            higher. People with access to Azure Pricing get an in-app notification and an email. Thresholds can be changed
            on the Reports &amp; settings tab.
          </p>
        ) : settings.isError ? (
          <p className="text-muted-foreground">
            A day is flagged when its spend is well above the previous 7-day average. (Current thresholds could not be
            loaded.)
          </p>
        ) : (
          <p className="text-muted-foreground">Loading the current thresholds…</p>
        )}
      </div>
    </div>
  )
}

function AnomalyStatusBadge({ item }: { item: CostAnomaly }) {
  return item.status === 'open' ? (
    <Badge variant="warning" dot>
      Open
    </Badge>
  ) : (
    <Badge variant="muted">Acknowledged</Badge>
  )
}

export function AlertsTab() {
  const canManage = useAuthStore(s => s.can('platform_costs.manage'))
  const [status, setStatus] = React.useState<AnomalyStatusFilter>('open')
  const query = useCostAnomalies(status)
  const ackMut = useAcknowledgeAnomaly()
  const items = query.data?.items ?? []

  const onAcknowledge = async (item: CostAnomaly) => {
    try {
      await ackMut.mutateAsync(item.id)
      toastSuccess('Anomaly acknowledged', `${formatDateGb(item.date)} · ${formatMoney(item.cost)}`)
    } catch (e) {
      toastApiError(e, 'Could not acknowledge the anomaly')
    }
  }

  return (
    <div className="space-y-4" data-testid="azure-alerts">
      <RuleExplanation />
      <PanelCard
        title="Cost anomalies"
        description="Days where spend jumped unexpectedly"
        bodyClassName="p-0"
        action={
          <div className="flex items-center gap-2">
            <Label htmlFor="azure-anomaly-status" className="text-xs text-muted-foreground">
              Status
            </Label>
            <Select value={status} onValueChange={v => setStatus(v as AnomalyStatusFilter)}>
              <SelectTrigger id="azure-anomaly-status" className="h-8 w-36" aria-label="Status filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      >
        {query.isLoading ? (
          <div className="p-4">
            <LoadingRegion label="Loading anomalies">
              <TableSkeleton rows={4} />
            </LoadingRegion>
          </div>
        ) : query.isError ? (
          <div className="p-4">
            <TabErrorState error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching} />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <BellRing className="h-5 w-5" aria-hidden />
            </div>
            <p className="text-sm font-medium text-foreground">
              {status === 'open' ? 'No open anomalies' : status === 'acknowledged' ? 'No acknowledged anomalies' : 'No anomalies yet'}
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Daily spend has stayed within the expected range.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border" aria-label="Cost anomalies">
            {items.map(item => (
              <li key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">{formatDateGb(item.date)}</span>
                    <AnomalyStatusBadge item={item} />
                    <span className="text-sm font-medium text-destructive">
                      {formatSignedPercent(item.increasePercent, 0)} vs 7-day average
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Spent <span className="font-medium text-foreground">{formatMoney(item.cost)}</span> against a
                    baseline of {formatMoney(item.baseline)}
                    {item.topDriver ? (
                      <>
                        {' '}· biggest driver: <span className="font-medium text-foreground">{item.topDriver}</span>
                      </>
                    ) : null}
                  </p>
                  {item.status === 'acknowledged' ? (
                    <p className="text-xs text-muted-foreground">
                      Acknowledged {formatDateTimeGb(item.acknowledgedAt)}
                      {item.acknowledgedBy ? ` by ${item.acknowledgedBy}` : ''}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Detected {formatDateTimeGb(item.createdAt)}</p>
                  )}
                </div>
                {item.status === 'open' && canManage ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void onAcknowledge(item)}
                    loading={ackMut.isPending && ackMut.variables === item.id}
                    leftIcon={<Check className="h-4 w-4" aria-hidden />}
                    aria-label={`Acknowledge anomaly on ${formatDateGb(item.date)}`}
                  >
                    Acknowledge
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </div>
  )
}
