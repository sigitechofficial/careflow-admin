import * as React from 'react'
import { AlertTriangle, CloudOff, Info, RefreshCw } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/misc'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { cn } from '@/shared/lib/utils'
import { extractApiErrorMessage } from '@/shared/lib/toast'
import { formatDateGb, formatDateTimeGb, formatRelativeTime } from '@/features/azure-pricing/lib/azure-pricing-format'

/** Categorical series colours — mid-lightness so they read on light and dark cards. */
export const CHART_COLORS = [
  'hsl(var(--primary))',
  '#0ea5e9',
  '#f59e0b',
  '#8b5cf6',
  '#f43f5e',
  '#d946ef',
  '#0891b2',
  '#64748b',
] as const

export const chartAxisTick = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' }

export const chartTooltipStyle: React.CSSProperties = {
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  color: 'hsl(var(--popover-foreground))',
  fontSize: 12,
}

/** Card shell used by every panel on the page. */
export function PanelCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  ...rest
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
} & Omit<React.HTMLAttributes<HTMLElement>, 'title'>) {
  return (
    <section className={cn('rounded-xl border border-border bg-card shadow-sm', className)} {...rest}>
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            {title ? <h3 className="text-sm font-semibold text-foreground">{title}</h3> : null}
            {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
          </div>
          {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
        </div>
      )}
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </section>
  )
}

/** "Azure cost data is updated every 8–24 hours · last synced …" */
export function FreshnessBanner({
  lastSyncedAt,
  dataThrough,
  enabled,
  loading,
}: {
  lastSyncedAt: string | null | undefined
  dataThrough?: string | null
  enabled?: boolean
  loading?: boolean
}) {
  const synced = loading ? '…' : formatRelativeTime(lastSyncedAt ?? null)
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-4 py-2.5 text-sm',
        enabled === false
          ? 'border-warning/30 bg-warning/10 text-warning'
          : 'border-info/20 bg-info/5 text-foreground',
      )}
      role="status"
      data-testid="azure-pricing-freshness"
    >
      <Info className={cn('h-4 w-4 shrink-0', enabled === false ? 'text-warning' : 'text-info')} aria-hidden />
      <span>
        Azure cost data is updated every 8–24 hours ·{' '}
        <span title={lastSyncedAt ? formatDateTimeGb(lastSyncedAt) : undefined}>last synced {synced}</span>
      </span>
      {dataThrough ? (
        <span className="text-xs text-muted-foreground">Costs available up to {formatDateGb(dataThrough)}</span>
      ) : null}
      {enabled === false ? (
        <span className="text-xs font-medium">Automatic sync is switched off</span>
      ) : null}
    </div>
  )
}

/** Shown when `enabled:false` and nothing has been synced yet. */
export function FeatureDisabledState({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center',
        className,
      )}
      data-testid="azure-pricing-disabled"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <CloudOff className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-foreground">Azure cost tracking is switched off</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The API is not currently collecting cost data from Azure. Once it is switched on
        (<code className="rounded bg-muted px-1 py-0.5 text-xs">AZURE_COST_ENABLED=true</code> on the API), spend,
        budgets and prices will appear here after the first sync — usually within a few hours.
      </p>
    </div>
  )
}

export function TabErrorState({
  error,
  onRetry,
  retrying,
  title = 'Could not load this data',
}: {
  error: unknown
  onRetry: () => void
  retrying?: boolean
  title?: string
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center"
      data-testid="azure-pricing-error"
    >
      <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-destructive">{title}</p>
        <p className="text-sm text-muted-foreground">{extractApiErrorMessage(error)}</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onRetry}
        loading={retrying}
        leftIcon={<RefreshCw className="h-4 w-4" aria-hidden />}
      >
        Retry
      </Button>
    </div>
  )
}

export function KpiSkeletonRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-border bg-card p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4" aria-hidden>
      <Skeleton className="mb-4 h-4 w-40" />
      <Skeleton className="w-full" style={{ height }} />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-4" aria-hidden>
      <Skeleton className="mb-2 h-4 w-48" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  )
}

/** Loading wrapper announced to assistive tech. */
export function LoadingRegion({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="space-y-4">
      {children}
    </div>
  )
}

/** Value that may be unavailable: shows "—" with an explanatory tooltip. */
export function MaybeValue({ value, reason }: { value: string | null; reason: string }) {
  if (value !== null) return <>{value}</>
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="cursor-help rounded-sm underline decoration-dotted underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Not available: ${reason}`}
          >
            —
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {reason}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/** Simple KPI card (label, value, optional sub-line and footer). */
export function KpiCard({
  label,
  value,
  sub,
  icon,
  children,
  className,
  testId,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  icon?: React.ReactNode
  children?: React.ReactNode
  className?: string
  testId?: string
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-4 shadow-sm', className)} data-testid={testId}>
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <div className="text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</div>
          {sub ? <div className="text-xs text-muted-foreground">{sub}</div> : null}
        </div>
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  )
}
