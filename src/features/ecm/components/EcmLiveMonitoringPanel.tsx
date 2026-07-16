import * as React from 'react'
import { Loader2, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'
import { useEcmLiveDashboard } from '@/features/ecm/hooks/useEcm'
import { EcmStatusBadge } from '@/features/ecm/components/EcmStatusBadge'
import { EcmAppliedSettingsBadge } from '@/features/ecm/components/EcmAppliedSettingsBadge'
import { EcmVisitDetailDialog } from '@/features/ecm/components/EcmVisitDetailDialog'
import { EcmExceptionQueuePanel } from '@/features/ecm/components/EcmExceptionQueuePanel'
import { EcmHealthBanner } from '@/features/ecm/components/EcmHealthBanner'
import type { EcmDashboardBucket, EcmLiveVisitRow } from '@/features/ecm/types/ecm.types'

const BUCKET_META: {
  id: EcmDashboardBucket
  label: string
  tone: 'neutral' | 'warn' | 'danger' | 'ok'
}[] = [
  { id: 'dueNow', label: 'Due now', tone: 'warn' },
  { id: 'startingSoon', label: 'Starting soon', tone: 'neutral' },
  { id: 'inProgress', label: 'In progress', tone: 'ok' },
  { id: 'lateArrival', label: 'Late', tone: 'warn' },
  { id: 'veryLateArrival', label: 'Very late', tone: 'danger' },
  { id: 'potentialMissed', label: 'Potential missed', tone: 'warn' },
  { id: 'confirmedMissed', label: 'Confirmed missed', tone: 'danger' },
  { id: 'missingCheckout', label: 'Missing checkout', tone: 'warn' },
  { id: 'outsideGeofence', label: 'Outside geofence', tone: 'warn' },
  { id: 'manualAttendance', label: 'Manual', tone: 'neutral' },
]

function todayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function tileClass(tone: 'neutral' | 'warn' | 'danger' | 'ok', active: boolean): string {
  const base = 'rounded-lg border px-3 py-2 text-left transition-colors'
  if (active) {
    if (tone === 'danger') return cn(base, 'border-destructive/40 bg-destructive/10')
    if (tone === 'warn') return cn(base, 'border-orange-500/40 bg-orange-500/10')
    if (tone === 'ok') return cn(base, 'border-success/40 bg-success/10')
    return cn(base, 'border-primary/40 bg-primary/10')
  }
  return cn(base, 'border-border bg-card hover:bg-muted/40')
}

export function EcmLiveMonitoringPanel() {
  const [date, setDate] = React.useState(todayIso)
  const [search, setSearch] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  const [bucketFilter, setBucketFilter] = React.useState<EcmDashboardBucket | 'all'>('all')
  const [selectedJobId, setSelectedJobId] = React.useState<string | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(t)
  }, [search])

  const dashboard = useEcmLiveDashboard({
    date,
    search: debouncedSearch || undefined,
  })

  const counts = dashboard.data?.counts
  const visits = dashboard.data?.visits ?? []

  const filtered: EcmLiveVisitRow[] =
    bucketFilter === 'all'
      ? visits
      : visits.filter(v => v.buckets.includes(bucketFilter))

  return (
    <div className="space-y-4" data-testid="ecm-live-monitoring-panel">
      <EcmHealthBanner />
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Operational date</span>
          <Input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="h-9 w-[11rem]"
          />
        </label>
        <label className="relative min-w-[12rem] flex-1 space-y-1 text-xs">
          <span className="text-muted-foreground">Search</span>
          <Search className="pointer-events-none absolute bottom-2.5 left-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Service user or job…"
            className="h-9 pl-8"
          />
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          disabled={dashboard.isFetching}
          onClick={() => void dashboard.refetch()}
        >
          {dashboard.isFetching ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
      </div>

      {dashboard.isLoading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading live ECM…
        </div>
      ) : dashboard.isError ? (
        <p className="py-8 text-sm text-destructive">
          Could not load the ECM live dashboard. Check API permissions and that the ECM migration is
          applied.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {BUCKET_META.map(b => {
              const value = counts?.[b.id] ?? 0
              return (
                <button
                  key={b.id}
                  type="button"
                  className={tileClass(b.tone, bucketFilter === b.id)}
                  onClick={() =>
                    setBucketFilter(prev => (prev === b.id ? 'all' : b.id))
                  }
                >
                  <p className="text-[11px] text-muted-foreground">{b.label}</p>
                  <p className="text-lg font-semibold tabular-nums">{value}</p>
                </button>
              )
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            {dashboard.data?.counts.total ?? visits.length} visits · refreshed{' '}
            {dashboard.data?.refreshedAt
              ? new Date(dashboard.data.refreshedAt).toLocaleTimeString()
              : '—'}
            {bucketFilter !== 'all' ? ` · filter: ${bucketFilter}` : ''}
            {' · '}
            Auto-refresh every 60s
          </p>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Service user</th>
                  <th className="px-3 py-2 font-medium">Planned</th>
                  <th className="px-3 py-2 font-medium">Actual in</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Timing</th>
                  <th className="px-3 py-2 font-medium">Settings</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                      No visits in this view.
                    </td>
                  </tr>
                ) : (
                  filtered.map(row => (
                    <tr
                      key={row.scheduledJobId}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/30"
                      onClick={() => {
                        setSelectedJobId(row.scheduledJobId)
                        setDetailOpen(true)
                      }}
                    >
                      <td className="px-3 py-2">
                        <p className="font-medium">{row.serviceUserName}</p>
                        <p className="text-xs text-muted-foreground">{row.jobName}</p>
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {formatTime(row.plannedStartDateTime)}
                        {row.plannedEndDateTime
                          ? `–${formatTime(row.plannedEndDateTime)}`
                          : ''}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {formatTime(row.actualCheckInAt)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <EcmStatusBadge code={row.lifecycleStatus} kind="lifecycle" />
                          <EcmStatusBadge code={row.missedClassification} kind="missed" />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <EcmStatusBadge code={row.arrivalClassification} kind="arrival" />
                          {row.startVarianceMinutes != null ? (
                            <span className="text-xs text-muted-foreground">
                              {row.startVarianceMinutes > 0 ? '+' : ''}
                              {row.startVarianceMinutes}m
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <EcmAppliedSettingsBadge level={row.appliedSettingsLevel} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <EcmExceptionQueuePanel
            onOpenVisit={jobId => {
              setSelectedJobId(jobId)
              setDetailOpen(true)
            }}
          />
        </>
      )}

      <EcmVisitDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        jobId={selectedJobId}
      />
    </div>
  )
}
