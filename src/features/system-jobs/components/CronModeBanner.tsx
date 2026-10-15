import { AlertTriangle, Cloud, HelpCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { formatDateTimeSecondsGb, formatTimeSecondsGb } from '@/shared/lib/time-format'
import { useNow } from '@/features/system-jobs/hooks/useSystemJobs'
import { formatUpdatedAgo } from '@/features/system-jobs/lib/system-jobs-format'

/** Where jobs are triggered from (`cronMode` of `GET /system-jobs`). */
export function CronModeBanner({ cronMode }: { cronMode: string | null | undefined }) {
  if (cronMode === 'internal') {
    return (
      <div
        role="status"
        className="flex gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm"
        data-testid="system-jobs-mode-internal"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium text-foreground">Fallback mode: jobs run inside the API</p>
          <p className="text-muted-foreground">
            The API&apos;s own scheduler is running every job (<code className="text-xs">CRON_MODE=internal</code>)
            and the Azure triggers are not in use. Use this only while the Azure triggers are unavailable, and keep the
            API on a single replica.
          </p>
        </div>
      </div>
    )
  }
  if (cronMode === 'external') {
    return (
      <div
        role="status"
        className="flex gap-3 rounded-lg border border-info/20 bg-info/5 px-4 py-3 text-sm"
        data-testid="system-jobs-mode-external"
      >
        <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden />
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium text-foreground">Jobs are triggered by Azure (Functions + Container Apps Jobs)</p>
          <p className="text-muted-foreground">
            Azure Functions call the API every few minutes or hourly; Container Apps Jobs run the nightly jobs in their
            own container.
          </p>
        </div>
      </div>
    )
  }
  return (
    <div
      role="status"
      className="flex gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm"
      data-testid="system-jobs-mode-unknown"
    >
      <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <p className="text-muted-foreground">
        Job trigger mode: <span className="font-medium text-foreground">{cronMode || 'unknown'}</span>
      </p>
    </div>
  )
}

/** Server clock + "last updated" + manual refresh. Ticks every second on its own. */
export function RefreshBar({
  serverTime,
  updatedAt,
  fetching,
  stale,
  onRefresh,
  className,
}: {
  serverTime: string | null | undefined
  /** `dataUpdatedAt` of the list query (ms). */
  updatedAt: number
  fetching: boolean
  /** Last background refresh failed (data shown is older). */
  stale?: boolean
  onRefresh: () => void
  className?: string
}) {
  const now = useNow(1000)
  const serverMs = serverTime ? new Date(serverTime).getTime() : NaN
  // Advance the server clock by the time elapsed since it was fetched.
  const serverNow = Number.isFinite(serverMs) && updatedAt ? new Date(serverMs + (now - updatedAt)) : null

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm',
        className,
      )}
      data-testid="system-jobs-refresh-bar"
    >
      <span className="text-muted-foreground">
        Server time{' '}
        <time
          className="font-medium tabular-nums text-foreground"
          dateTime={serverNow?.toISOString()}
          title={serverNow ? `${formatDateTimeSecondsGb(serverNow.toISOString())} (UK time)` : undefined}
        >
          {serverNow ? formatTimeSecondsGb(serverNow) : '—'}
        </time>{' '}
        <span className="text-xs">UK</span>
      </span>
      <span className="text-muted-foreground" aria-live="off">
        Updated <span className="font-medium text-foreground">{formatUpdatedAgo(updatedAt, now)}</span>
        <span className="hidden sm:inline"> · refreshes every 30 s</span>
      </span>
      {stale ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-warning" role="status">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          Refresh failed — showing the last data
        </span>
      ) : null}
      <Button
        size="sm"
        variant="outline"
        className="ml-auto"
        onClick={onRefresh}
        disabled={fetching}
        aria-label="Refresh jobs now"
        leftIcon={
          <RefreshCw className={cn('h-3.5 w-3.5', fetching && 'animate-spin motion-reduce:animate-none')} aria-hidden />
        }
      >
        {fetching ? 'Refreshing…' : 'Refresh'}
      </Button>
    </div>
  )
}
