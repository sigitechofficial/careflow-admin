import * as React from 'react'
import { Info, Loader2 } from 'lucide-react'
import { ContentCard } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'
import { useEcmDailyOpsReport } from '@/features/ecm/hooks/useEcm'
import { useEcmOperationalPeriod } from '@/features/ecm/hooks/useEcmOperationalPeriod'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { buildEcmMethodBreakdown, formatPct } from '@/features/ecm/utils/ecm-compliance-overview.util'

export type EcmComplianceMethodCardsProps = {
  className?: string
  /** Compact strip for Graph page header (default). */
  compact?: boolean
}

/**
 * Electronic / Manual / Geofence KPI strip — shared period + location with Live / Graphs.
 */
export function EcmComplianceMethodCards({
  className,
  compact = true,
}: EcmComplianceMethodCardsProps) {
  const { locationId: globalLocationId } = useGlobalLocationScope()
  const { dateFrom, dateTo } = useEcmOperationalPeriod('today')

  const reportQuery = useEcmDailyOpsReport(
    { dateFrom, dateTo },
    true,
    { locationId: globalLocationId ?? undefined },
  )

  const method = reportQuery.data?.kpis
    ? buildEcmMethodBreakdown(reportQuery.data.kpis)
    : null
  const geofenceBreaches = reportQuery.data?.kpis?.geofenceBreaches ?? 0

  const electronicTone =
    method && method.electronicPercent >= 95
      ? 'text-emerald-700 dark:text-emerald-300'
      : method && method.electronicPercent >= 90
        ? 'text-amber-600 dark:text-amber-300'
        : 'text-red-600 dark:text-red-400'

  if (reportQuery.isLoading) {
    return (
      <div
        className={cn('flex items-center gap-2 py-3 text-xs text-muted-foreground', className)}
        data-testid="ecm-compliance-method-cards"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading method summary…
      </div>
    )
  }

  if (reportQuery.isError || !method) {
    return (
      <p
        className={cn('text-xs text-destructive', className)}
        data-testid="ecm-compliance-method-cards"
      >
        Could not load electronic / manual summary.
      </p>
    )
  }

  const pad = compact ? 'p-3' : 'p-4'
  const valueClass = compact
    ? 'mt-1 text-2xl font-bold tabular-nums tracking-tight'
    : 'mt-2 text-4xl font-bold tabular-nums tracking-tight'
  const geoValueClass = compact
    ? 'mt-1 text-2xl font-bold tabular-nums text-sky-600 dark:text-sky-400'
    : 'text-5xl font-bold tabular-nums text-sky-600 dark:text-sky-400'

  return (
    <div
      className={cn('grid gap-2 md:grid-cols-2 xl:grid-cols-3', className)}
      data-testid="ecm-compliance-method-cards"
    >
      <ContentCard className={cn('flex flex-col justify-center', pad)}>
        <p className="text-[11px] font-medium text-muted-foreground">Electronic %</p>
        <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
          Phone/app = Electronic · Admin complete = Manual
        </p>
        <p className={cn(valueClass, electronicTone)}>{formatPct(method.electronicPercent)}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {method.electronic.toLocaleString()} of {method.total.toLocaleString()} visits
        </p>
      </ContentCard>

      <ContentCard className={cn('space-y-1.5', pad)}>
        <h3 className="text-xs font-semibold text-foreground">ECM Method</h3>
        <p className="text-[10px] leading-snug text-muted-foreground">
          Mobile app vs admin-completed visits
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left text-[10px] text-muted-foreground">
              <th className="pb-1 font-medium">Method</th>
              <th className="pb-1 font-medium">Visits</th>
              <th className="pb-1 font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/60">
              <td className="py-1 font-medium text-emerald-700 dark:text-emerald-300">
                Electronic
              </td>
              <td className="py-1 tabular-nums">{method.electronic.toLocaleString()}</td>
              <td className="py-1 tabular-nums">{formatPct(method.electronicPercent)}</td>
            </tr>
            <tr>
              <td className="py-1 font-medium text-red-600 dark:text-red-400">Manual</td>
              <td className="py-1 tabular-nums">{method.manual.toLocaleString()}</td>
              <td className="py-1 tabular-nums">{formatPct(method.manualPercent)}</td>
            </tr>
          </tbody>
        </table>
      </ContentCard>

      <ContentCard className={cn('space-y-1.5', pad)}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold text-foreground">Geo-Fence Breaches</h3>
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
              Check-in outside expected location
            </p>
          </div>
          <span title="Counts visits with OUTSIDE_GEOFENCE in the selected period.">
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        </div>
        <p className={geoValueClass}>{geofenceBreaches.toLocaleString()}</p>
      </ContentCard>
    </div>
  )
}
