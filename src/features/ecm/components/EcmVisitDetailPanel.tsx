import * as React from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { EcmStatusBadge } from '@/features/ecm/components/EcmStatusBadge'
import { EcmAppliedSettingsBadge } from '@/features/ecm/components/EcmAppliedSettingsBadge'
import { EcmScheduleHistoryPanel } from '@/features/ecm/components/EcmScheduleHistoryPanel'
import { EcmAuditTrailPanel } from '@/features/ecm/components/EcmAuditTrailPanel'
import {
  EcmManualAttendanceDialog,
  EcmMissedTriageActions,
  EcmNotificationEvidenceForm,
} from '@/features/ecm/components/EcmOpsActions'
import { useEcmVisitDetail, useReevaluateEcmVisit } from '@/features/ecm/hooks/useEcm'
import { useAuthStore } from '@/features/auth/store'

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function formatVariance(mins: number | null | undefined): string {
  if (mins == null) return '—'
  return mins > 0 ? `+${mins} min` : `${mins} min`
}

export function EcmVisitDetailPanel({ jobId }: { jobId: string }) {
  const detailQuery = useEcmVisitDetail(jobId)
  const reevaluate = useReevaluateEcmVisit()
  const canMonitor = useAuthStore(s => s.can('ecm.monitor' as never))
  const canAmend = useAuthStore(s => s.can('ecm.attendance.amend' as never))
  const [manualOpen, setManualOpen] = React.useState(false)

  if (detailQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading ECM detail…
      </div>
    )
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <p className="py-6 text-sm text-destructive">
        Could not load ECM detail for this visit.
      </p>
    )
  }

  const d = detailQuery.data
  const e = d.ecm

  return (
    <div className="space-y-5" data-testid="ecm-visit-detail">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="truncate text-base font-semibold">{d.serviceUser.name}</h3>
          <p className="text-xs text-muted-foreground">{d.jobName}</p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <EcmStatusBadge code={e.lifecycleStatus} kind="lifecycle" />
            <EcmStatusBadge code={e.timing.arrivalClassification} kind="arrival" />
            <EcmStatusBadge code={e.missedClassification} kind="missed" />
            <EcmStatusBadge code={e.confidence} kind="confidence" />
            <EcmAppliedSettingsBadge
              level={e.appliedSettings.level}
              thresholdRuleVersion={e.appliedSettings.thresholdRuleVersion}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAmend ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setManualOpen(true)}>
              Manual attendance
            </Button>
          ) : null}
          {canMonitor ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={reevaluate.isPending}
              onClick={() => reevaluate.mutate(jobId)}
            >
              {reevaluate.isPending ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
              )}
              Re-evaluate
            </Button>
          ) : null}
        </div>
      </div>

      <EcmMissedTriageActions jobId={jobId} missedClassification={e.missedClassification} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground">Planned</p>
          <p className="mt-1 text-sm">{formatWhen(e.planned.start)}</p>
          <p className="text-sm text-muted-foreground">to {formatWhen(e.planned.end)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {e.planned.durationMinutes != null ? `${e.planned.durationMinutes} min planned` : '—'}
            {' · '}
            Window {formatWhen(e.planned.earliestPermittedStart)} –{' '}
            {formatWhen(e.planned.latestPermittedStart)}
          </p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground">Actual</p>
          <p className="mt-1 text-sm">In: {formatWhen(e.actual.checkInAt)}</p>
          <p className="text-sm">Out: {formatWhen(e.actual.checkOutAt)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {e.actual.durationMinutes != null ? `${e.actual.durationMinutes} min actual` : '—'}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className="text-xs font-medium text-muted-foreground">Timing (four measurements)</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <div>
            <p className="text-[11px] text-muted-foreground">Start variance</p>
            <p className="text-sm font-medium">{formatVariance(e.timing.startVarianceMinutes)}</p>
            <EcmStatusBadge code={e.timing.arrivalClassification} kind="arrival" className="mt-1" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">End variance</p>
            <p className="text-sm font-medium">{formatVariance(e.timing.endVarianceMinutes)}</p>
            <EcmStatusBadge
              code={e.timing.departureClassification}
              kind="arrival"
              className="mt-1"
            />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Duration variance</p>
            <p className="text-sm font-medium">{formatVariance(e.timing.durationVarianceMinutes)}</p>
            <EcmStatusBadge
              code={e.timing.durationClassification}
              kind="arrival"
              className="mt-1"
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{e.timing.summary}</p>
      </div>

      <EcmScheduleHistoryPanel history={d.scheduleHistory} />

      {d.allocatedCarers.length > 0 ? (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Allocated carers</p>
          <ul className="space-y-1 text-sm">
            {d.allocatedCarers.map(c => (
              <li key={c.allocationId}>
                {c.name || c.employeeId}
                {c.isLeadCarer ? ' (lead)' : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {e.operationalExceptionCodes.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {e.operationalExceptionCodes.map(code => (
            <EcmStatusBadge key={code} code={code} kind="generic" />
          ))}
        </div>
      ) : null}

      <EcmNotificationEvidenceForm jobId={jobId} />
      <EcmAuditTrailPanel jobId={jobId} />

      <div className="border-t border-border pt-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Attendance evidence ({d.attendanceEvents.length})
        </p>
        {d.attendanceEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No check-in/out events recorded.</p>
        ) : (
          <ul className="space-y-2">
            {d.attendanceEvents.map(ev => (
              <li
                key={ev.id}
                className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{ev.eventType}</span>
                  <span className="text-muted-foreground">{ev.verificationMethod}</span>
                  <span>{formatWhen(ev.occurredAt)}</span>
                </div>
                {(ev.outsideGeofence || ev.isMockLocation) && (
                  <p className="mt-1 text-orange-700 dark:text-orange-300">
                    {ev.outsideGeofence ? `Outside geofence (${ev.distanceMeters ?? '?'} m)` : ''}
                    {ev.outsideGeofence && ev.isMockLocation ? ' · ' : ''}
                    {ev.isMockLocation ? 'Mock location flagged' : ''}
                    {ev.outsideGeofenceReason ? ` — ${ev.outsideGeofenceReason}` : ''}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Evaluated {formatWhen(e.evaluatedAt)} · local visit date {e.planned.localVisitDate} (
        {e.planned.timezone})
      </p>

      <EcmManualAttendanceDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        jobId={jobId}
        carers={d.allocatedCarers.map(c => ({
          employeeId: c.employeeId,
          name: c.name,
        }))}
      />
    </div>
  )
}
