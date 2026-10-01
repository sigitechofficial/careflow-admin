import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  CircleDashed,
  Clock,
  ExternalLink,
  LogIn,
  LogOut,
  MapPin,
  Pill,
  Activity,
  Smartphone,
  StickyNote,
  Users,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import {
  formatOrganisationDateTime,
  formatOrganisationIsoDate,
  formatOrganisationIsoTime,
} from '@/shared/lib/organisation-display-format.store'
import { formatOpsClockTime, formatOpsHm } from '@/shared/lib/operational-day.util'
import { BodyMapHandoverPreview } from '@/features/service-users/body-map/components/BodyMapHandoverPreview'
import { scheduleVisitBodyMapSearch } from '@/features/service-users/body-map/utils/body-map-visit-navigation'
import { useServiceUserBodyMap } from '@/features/service-users/body-map/hooks/useBodyMap'
import { recordTypeLabel } from '@/features/service-users/body-map/catalog/record-types'
import type { BodyMapRecordTypeCode } from '@/features/service-users/body-map/catalog/record-types'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { isScheduleJobCancelled } from '@/features/scheduling/types/schedule-job-context-actions.types'
import { VisitBodyMapCapture } from '@/features/scheduling/components/VisitBodyMapCapture'
import { VisitJobTasksPanel } from '@/features/scheduling/components/VisitJobTasksPanel'
import { VisitMedicationPanel } from '@/features/scheduling/components/VisitMedicationPanel'
import { VisitObservationsPanel } from '@/features/scheduling/components/VisitObservationsPanel'
import { VisitLogTimelinePanel } from '@/features/scheduling/components/VisitLogTimelinePanel'
import { VisitPhotoThumbnails } from '@/features/scheduling/components/VisitPhotoThumbnails'
import {
  fetchVisitObservations,
  fetchVisitCareConsents,
  getScheduledJob,
  type VisitObservationRecordedRow,
} from '@/features/scheduling/api/scheduling.api'
import { schedulingKeys } from '@/features/scheduling/keys'
import {
  buildScheduleVisitContext,
  type ScheduleVisitContext,
} from '@/features/scheduling/utils/schedule-visit-context.util'
import {
  employeesLabel,
  formatJobTimeRange,
  jobStatusLabel,
  serviceUserLabel,
} from '@/features/scheduling/utils/scheduling-format'
import { timelineJobVisitPlanSlot } from '@/features/scheduling/utils/scheduling-visit-plan.util'
import {
  isAbsentCoCarerAllocation,
  jobLeadCarer,
} from '@/features/scheduling/utils/schedule-job-lead-carer.util'
import { assessVisitDeliveryFromJobLike } from '@/features/scheduling/utils/visit-delivery-assessment.util'
import { VisitDeliveryStatusPanel } from '@/features/scheduling/components/VisitDeliveryStatusPanel'
import { VisitCareConsentSection } from '@/features/scheduling/components/VisitCareConsentSection'
import { useEcmVisitSos } from '@/features/ecm/hooks/useEcm'
import type { CarerSosAlertDto } from '@/features/ecm/types/ecm.types'
import { sosActionLabel, sosOutcomeLabel } from '@/features/ecm/utils/sos-outcome.util'

export type ScheduleVisitWorkspaceTab =
  | 'overview'
  | 'tasks'
  | 'medication'
  | 'observations'
  | 'log'
  | 'body-map'

function VisitWorkspaceSosAlerts({
  alerts,
  sectionClosed,
  sectionAcknowledged,
  ackSummary,
}: {
  alerts: CarerSosAlertDto[]
  sectionClosed: boolean
  sectionAcknowledged: boolean
  ackSummary: CarerSosAlertDto | undefined
}) {
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(
    () => new Set(alerts.filter(row => row.lifecycle !== 'CLOSED').map(row => row.id)),
  )

  React.useEffect(() => {
    setExpandedIds(current => {
      const next = new Set(current)
      for (const row of alerts) {
        if (row.lifecycle !== 'CLOSED' && !next.has(row.id)) next.add(row.id)
      }
      return next
    })
  }, [alerts])

  const toggle = (id: string) => {
    setExpandedIds(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const heading = sectionClosed
    ? 'Carer SOS — closed'
    : sectionAcknowledged
      ? 'Carer SOS — acknowledged'
      : 'Carer SOS'

  return (
    <section
      className={
        sectionClosed || sectionAcknowledged
          ? 'rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-4 py-3'
          : 'rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3'
      }
      data-testid="visit-workspace-carer-sos"
    >
      <p
        className={
          sectionClosed || sectionAcknowledged
            ? 'text-sm font-semibold text-emerald-800 dark:text-emerald-200'
            : 'text-sm font-semibold text-destructive'
        }
      >
        {heading}
        {alerts.length > 1 ? (
          <span className="ml-1.5 font-medium text-muted-foreground">· {alerts.length}</span>
        ) : null}
      </p>
      <ul className="mt-2 space-y-2">
        {alerts.map(row => {
          const expanded = expandedIds.has(row.id)
          const detailsId = `visit-sos-${row.id}-details`
          const mapsHref =
            row.latitude != null && row.longitude != null && !row.locationUnavailable
              ? `https://maps.google.com/?q=${row.latitude},${row.longitude}`
              : null
          const action = row.actionLabel || sosActionLabel(row.actionCode) || null
          const outcome = row.outcomeLabel || sosOutcomeLabel(row.outcomeCode) || null
          const closed = row.lifecycle === 'CLOSED'
          const status = closed
            ? outcome || 'Closed'
            : row.acknowledgedAt
              ? 'Acknowledged'
              : 'Needs office'
          return (
            <li
              key={row.id}
              className="overflow-hidden rounded-md border border-border/60 bg-background/60"
            >
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={detailsId}
                onClick={() => toggle(row.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {row.employeeName || 'Carer'} · {formatOpsClockTime(row.createdAt)}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{status}</span>
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                    expanded && 'rotate-180',
                  )}
                  aria-hidden
                />
              </button>
              {expanded ? (
                <div id={detailsId} className="space-y-2 border-t border-border/60 px-3 py-2 text-sm">
                  <p className="text-muted-foreground">{row.message?.trim() || 'No message'}</p>
                  {mapsHref ? (
                    <a
                      href={mapsHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex text-xs font-medium underline-offset-2 hover:underline"
                    >
                      Open in Maps
                    </a>
                  ) : null}
                  {closed ? (
                    <dl className="space-y-1">
                      {action ? (
                        <div>
                          <dt className="text-xs font-medium text-muted-foreground">Action taken</dt>
                          <dd>{action}</dd>
                        </div>
                      ) : null}
                      {row.actionNote ? (
                        <div>
                          <dt className="text-xs font-medium text-muted-foreground">Action note</dt>
                          <dd>{row.actionNote}</dd>
                        </div>
                      ) : null}
                      {outcome ? (
                        <div>
                          <dt className="text-xs font-medium text-muted-foreground">Outcome</dt>
                          <dd>{outcome}</dd>
                        </div>
                      ) : null}
                      {row.resolutionNote ? (
                        <div>
                          <dt className="text-xs font-medium text-muted-foreground">Outcome note</dt>
                          <dd>{row.resolutionNote}</dd>
                        </div>
                      ) : null}
                      {row.closedAt ? (
                        <p className="font-medium text-emerald-700 dark:text-emerald-300">
                          Closed
                          {row.closedByName ? ` by ${row.closedByName}` : ''}
                          {` · ${formatOpsClockTime(row.closedAt)}`}
                        </p>
                      ) : null}
                    </dl>
                  ) : null}
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
      {!sectionClosed && sectionAcknowledged && ackSummary ? (
        <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          Acknowledged
          {ackSummary.acknowledgedByName ? ` by ${ackSummary.acknowledgedByName}` : ''}
          {` · ${formatOpsClockTime(ackSummary.acknowledgedAt)}`}
        </p>
      ) : null}
    </section>
  )
}

function allocationDisplayName(
  allocation: TimelineJob['allocations'][number],
): string {
  const e = allocation.employee
  if (!e) return 'Carer'
  const name = [e.firstName, e.lastName].filter(Boolean).join(' ').trim()
  return name || 'Carer'
}

function VisitWorkspaceCarerPresence({ job }: { job: TimelineJob }) {
  const allocations = job.allocations ?? []
  // Same lead the carer app shows: flagged lead, else the first-assigned carer.
  const lead = jobLeadCarer(job)
  return (
    <div className="mt-3 space-y-2" data-testid="visit-workspace-carers">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          Carers ({allocations.length}/{job.requiredCarers})
        </span>
      </p>
      {lead && !lead.explicit ? (
        <p className="text-xs font-medium text-destructive" role="alert">
          No lead carer set — the carer app treats {allocationDisplayName(lead.allocation)} (first
          assigned) as lead. Choose a lead in Manage carers.
        </p>
      ) : null}
      <ul className="space-y-2">
        {allocations.map((allocation) => {
          const name = allocationDisplayName(allocation)
          const role = lead
            ? allocation.id === lead.allocation.id
              ? 'Lead'
              : 'Support'
            : null
          const clockedIn = allocation.actualStartDateTime
            ? formatOrganisationIsoTime(allocation.actualStartDateTime)
            : null
          const clockedOut = allocation.actualEndDateTime
            ? formatOrganisationIsoTime(allocation.actualEndDateTime)
            : null
          // Shared visit closed and this carer never clocked in: pay held for review.
          const absent = isAbsentCoCarerAllocation(job, allocation)
          const plannedStart = allocation.resolvedStartDateTime ?? allocation.scheduledStartDateTime
          const plannedEnd = allocation.resolvedEndDateTime ?? allocation.scheduledEndDateTime
          const presence = allocation.presence
          const arrivedAt = presence?.arrivedAt
            ? formatOrganisationIsoTime(presence.arrivedAt)
            : null
          const leftAt = presence?.leftAt ? formatOrganisationIsoTime(presence.leftAt) : null
          const marker = presence?.markedByName?.trim()
          let presenceLabel = 'Not in yet'
          let presenceClass = 'text-amber-600 dark:text-amber-500'
          if (presence?.present) {
            presenceLabel = arrivedAt
              ? `Arrived ${arrivedAt}${marker ? ` · marked by ${marker}` : ''}`
              : `Arrived${marker ? ` · marked by ${marker}` : ''}`
            presenceClass = 'text-emerald-700 dark:text-emerald-300'
          } else if (presence && presence.present === false) {
            presenceLabel = leftAt
              ? `Left ${leftAt}${marker ? ` · marked by ${marker}` : ''}`
              : `Left${marker ? ` · marked by ${marker}` : ''}`
            presenceClass = 'text-muted-foreground'
          }
          return (
            <li
              key={allocation.id}
              className="rounded-md border border-border/70 bg-background px-3 py-2"
            >
              <p className="text-sm font-medium text-foreground">
                {name}
                {role ? (
                  <span className="ml-1.5 text-xs font-medium text-muted-foreground">({role})</span>
                ) : null}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Clocked in:{' '}
                {clockedIn ? (
                  <span className="font-medium tabular-nums text-foreground">{clockedIn}</span>
                ) : (
                  <span className="font-medium text-amber-600 dark:text-amber-500">Not yet</span>
                )}
                {clockedOut ? (
                  <>
                    <span className="text-muted-foreground"> · Clocked out: </span>
                    <span className="font-medium tabular-nums text-foreground">{clockedOut}</span>
                    {allocation.actualEndAutoClosed ? (
                      <span
                        className="ml-1 text-xs text-muted-foreground"
                        title="This support carer was still clocked in when the lead clocked out, so their clock-out was set to the lead's clock-out time."
                      >
                        (auto – lead clock-out)
                      </span>
                    ) : null}
                  </>
                ) : null}
              </p>
              {absent ? (
                <div
                  className="mt-1 rounded border border-destructive/40 bg-destructive/5 px-2 py-1 text-xs text-destructive"
                  role="alert"
                  data-testid="visit-workspace-absent-carer"
                >
                  <p className="font-semibold">Did not clock in — pay held for review</p>
                  <p>
                    Planned{' '}
                    {plannedStart ? formatOrganisationIsoTime(plannedStart) : '—'}–
                    {plannedEnd ? formatOrganisationIsoTime(plannedEnd) : '—'} · No clock-in
                    recorded on this shared visit, so no pay line was built from the visit times.
                  </p>
                </div>
              ) : (
                <p className={cn('mt-0.5 text-sm font-medium', presenceClass)}>{presenceLabel}</p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

type Props = {
  job: TimelineJob
  date: string
  returnTo?: string
  defaultTab?: ScheduleVisitWorkspaceTab
  layout?: 'sheet' | 'hub'
  onCompleteVisit?: () => void
  onMarkIncomplete?: () => void
  onAddNotes?: () => void
  onAllocate?: () => void
}

export function ScheduleVisitWorkspaceContent({
  job,
  date,
  returnTo,
  defaultTab = 'overview',
  layout = 'sheet',
  onCompleteVisit,
  onMarkIncomplete,
  onAddNotes,
  onAllocate,
}: Props) {
  const [tab, setTab] = React.useState<ScheduleVisitWorkspaceTab>(defaultTab)
  const visitContext = React.useMemo(
    () => buildScheduleVisitContext(job, date),
    [job, date],
  )

  React.useEffect(() => {
    setTab(defaultTab)
  }, [defaultTab, job.id])

  const bodyMapSearch = scheduleVisitBodyMapSearch({
    scheduledJobId: visitContext.scheduledJobId,
    scheduledVisitId: visitContext.scheduledVisitId,
    returnTo,
  })

  const obsQuery = useQuery({
    queryKey: ['visit-observations', job.id],
    queryFn: ({ signal }) => fetchVisitObservations(job.id, { signal }),
    enabled: Boolean(job.id),
    refetchOnMount: 'always',
    staleTime: 0,
  })

  const bodyMapQuery = useServiceUserBodyMap(job.serviceUserId, false, {
    refetchOnMount: 'always',
    staleTime: 0,
  })

  const visitBodyMapRecords = React.useMemo(() => {
    return (bodyMapQuery.data?.records ?? []).filter((r) => r.scheduledJobId === job.id)
  }, [bodyMapQuery.data?.records, job.id])

  const bodyMapObservations = React.useMemo<VisitObservationRecordedRow[]>(() => {
    if (!obsQuery.data?.recordedThisVisit) return []
    return obsQuery.data.recordedThisVisit.filter(
      (row) => row.bodyMapPins && row.bodyMapPins.length > 0,
    )
  }, [obsQuery.data?.recordedThisVisit])

  // Fetch the freshest copy of this job by id so attendance (clock in/out),
  // status and actual times reflect the latest server state — the `job` prop
  // comes from the day-timeline board query (keyed by date), which is not
  // refetched when the workspace reopens. This query IS refetched on open
  // (its key includes the jobId, which the sheet invalidates on open).
  const freshJobQuery = useQuery({
    queryKey: schedulingKeys.job(job.id),
    queryFn: () => getScheduledJob(job.id),
    enabled: Boolean(job.id),
    staleTime: 0,
    refetchOnMount: 'always',
  })
  const liveJob = freshJobQuery.data ? { ...job, ...freshJobQuery.data } : job

  const careConsentQuery = useQuery({
    queryKey: schedulingKeys.careConsents(job.id),
    queryFn: () => fetchVisitCareConsents(job.id),
    enabled: Boolean(job.id),
    refetchOnMount: 'always',
    staleTime: 0,
  })

  const visitSlot = timelineJobVisitPlanSlot(job)
  const deliveryAssessment = React.useMemo(
    () =>
      liveJob.deliveryAssessment ??
      assessVisitDeliveryFromJobLike({
        status: liveJob.status,
        requiredCarers: liveJob.requiredCarers,
        allocatedCarers: liveJob.allocatedCarers,
        allocations: liveJob.allocations,
        scheduledStartDateTime: liveJob.scheduledStartDateTime,
        scheduledEndDateTime: liveJob.scheduledEndDateTime,
        actualStartDateTime: liveJob.actualStartDateTime,
        actualEndDateTime: liveJob.actualEndDateTime,
        visitPlan: liveJob.visitPlan,
        visits: liveJob.visits,
        latestAttendanceEventType: liveJob.attendanceEvents?.[0]?.eventType,
      }),
    [liveJob],
  )

  const sosQuery = useEcmVisitSos(job.id)
  const visitSos = sosQuery.data ?? []
  const visitSosClosed =
    visitSos.length > 0 && visitSos.every(row => row.lifecycle === 'CLOSED')
  const visitSosAcknowledged =
    visitSos.length > 0 &&
    !visitSosClosed &&
    visitSos.every(
      row =>
        Boolean(row.acknowledgedAt) ||
        row.lifecycle === 'ACKNOWLEDGED' ||
        row.lifecycle === 'RESOLVED' ||
        row.lifecycle === 'MANAGER_REVIEWED' ||
        row.lifecycle === 'CLOSED',
    )
  const visitSosAck = visitSos.find(row => row.acknowledgedAt)

  const allocations = liveJob.allocations ?? []
  const multiCarer =
    (liveJob.requiredCarers ?? 0) > 1 || allocations.length > 1
  const clockInLabel = liveJob.actualStartDateTime
    ? formatOrganisationIsoTime(liveJob.actualStartDateTime)
    : null
  const clockOutLabel = liveJob.actualEndDateTime
    ? formatOrganisationIsoTime(liveJob.actualEndDateTime)
    : null
  // On the full-page hub, cards use a solid card surface (white in light mode) to
  // match the details sidebar; the drawer keeps the subtle muted fill.
  const cardSurface = layout === 'hub' ? 'bg-card' : 'bg-muted/20'

  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col',
        layout === 'hub' && 'gap-4',
        layout === 'sheet' && 'h-full',
      )}
    >
      <div className="flex shrink-0 flex-wrap gap-2 border-b border-border pb-3">
        {(
          [
            ['overview', 'Overview'],
            ['tasks', 'Tasks'],
            ['medication', 'Medication'],
            ['observations', 'Observations'],
            ['log', 'Log'],
            ['body-map', 'Body map'],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={tab === id ? 'default' : 'outline'}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          {visitSos.length > 0 ? (
            <VisitWorkspaceSosAlerts
              alerts={visitSos}
              sectionClosed={visitSosClosed}
              sectionAcknowledged={visitSosAcknowledged}
              ackSummary={visitSosAck}
            />
          ) : null}
          <section className={cn('rounded-lg border border-border px-4 py-3', cardSurface)}>
            <p className="text-base font-semibold text-foreground">{serviceUserLabel(job.serviceUser)}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {visitSlot ? `${visitSlot} · ` : ''}
              {formatJobTimeRange(job)} · {jobStatusLabel(job.status)}
            </p>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {!multiCarer ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    Carers: {employeesLabel(liveJob)} ({allocations.length}/{liveJob.requiredCarers})
                  </span>
                </div>
              ) : null}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" aria-hidden />
                <span>Date: {formatOrganisationIsoDate(date)}</span>
              </div>
            </dl>
            {multiCarer ? (
              <VisitWorkspaceCarerPresence job={liveJob} />
            ) : null}

            {!multiCarer || liveJob.checkIn ? (
            <div className="mt-3 space-y-2 border-t border-border/60 pt-3 text-sm">
              {!multiCarer ? (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5">
                <span className="flex items-center gap-1.5">
                  <LogIn className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="text-muted-foreground">Clocked in:</span>
                  {clockInLabel ? (
                    <span className="font-medium tabular-nums text-foreground">{clockInLabel}</span>
                  ) : (
                    <span className="font-medium text-amber-600 dark:text-amber-500">
                      Carer not clocked in yet
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1.5">
                  <LogOut className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="text-muted-foreground">Clocked out:</span>
                  {clockOutLabel ? (
                    <span className="font-medium tabular-nums text-foreground">{clockOutLabel}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </span>
              </div>
              ) : null}
              {liveJob.checkIn ? (
                <dl className="grid gap-1 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="inline text-muted-foreground">Method: </dt>
                    <dd className="inline font-medium text-foreground">{liveJob.checkIn.methodLabel}</dd>
                  </div>
                  {liveJob.checkIn.reasonLabel ? (
                    <div>
                      <dt className="inline text-muted-foreground">Reason: </dt>
                      <dd className="inline text-foreground">{liveJob.checkIn.reasonLabel}</dd>
                    </div>
                  ) : null}
                  {liveJob.checkIn.notes ? (
                    <div className="sm:col-span-2">
                      <dt className="inline text-muted-foreground">Clock in notes: </dt>
                      <dd className="inline whitespace-pre-wrap text-foreground">{liveJob.checkIn.notes}</dd>
                    </div>
                  ) : null}
                  {liveJob.checkIn.timingExceptionReasonLabel ? (
                    <div>
                      <dt className="inline text-muted-foreground">
                        {liveJob.checkIn.timingKindLabel ?? 'Arrival reason'}:{' '}
                      </dt>
                      <dd className="inline text-foreground">
                        {liveJob.checkIn.timingExceptionReasonLabel}
                      </dd>
                    </div>
                  ) : null}
                  {liveJob.checkIn.timingExceptionNotes ? (
                    <div className="sm:col-span-2">
                      <dt className="inline text-muted-foreground">
                        {liveJob.checkIn.timingNotesLabel ?? 'More detail'}:{' '}
                      </dt>
                      <dd className="inline whitespace-pre-wrap text-foreground">
                        {liveJob.checkIn.timingExceptionNotes}
                      </dd>
                    </div>
                  ) : null}
                  {liveJob.checkIn.outsideGeofenceReason ? (
                    <div className="sm:col-span-2">
                      <dt className="inline text-muted-foreground">Outside area: </dt>
                      <dd className="inline whitespace-pre-wrap text-foreground">
                        {liveJob.checkIn.outsideGeofenceReason}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
            </div>
            ) : null}
          </section>

          <VisitCareConsentSection
            jobId={job.id}
            consents={careConsentQuery.data?.consents ?? []}
            loading={careConsentQuery.isLoading}
            className={cardSurface}
          />

          <VisitDeliveryStatusPanel
            assessment={deliveryAssessment}
            timingException={job.timingException}
            careNotDelivered={job.careNotDelivered}
            cancellation={job.cancellation}
            className={cardSurface}
          />

          <section>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Handover — body map</h3>
            <BodyMapHandoverPreview serviceUserId={job.serviceUserId} refreshOnMount />
          </section>

          {visitBodyMapRecords.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Body map records from this visit
              </h3>
              <p className="text-xs text-muted-foreground">
                Saved via the carer mobile app (clinical body map chart).
              </p>
              <ul className="space-y-2">
                {visitBodyMapRecords.map((record) => {
                  const marker = record.markers[0]
                  return (
                    <li
                      key={record.id}
                      className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2.5 dark:border-emerald-900 dark:bg-emerald-950/30"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <MapPin className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                          {recordTypeLabel(record.recordType as BodyMapRecordTypeCode)}
                          {marker?.bodyPart ? ` — ${marker.bodyPart}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatOrganisationDateTime(record.createdAt)}
                        </p>
                      </div>
                      {record.description ? (
                        <p className="mt-0.5 text-sm text-foreground">{record.description}</p>
                      ) : null}
                      {record.riskLevel ? (
                        <p className="mt-1 text-xs text-muted-foreground">Risk: {record.riskLevel}</p>
                      ) : null}
                      <VisitPhotoThumbnails photos={record.photos} />
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}

          {bodyMapObservations.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Body map recorded during visit
              </h3>
              <p className="text-xs text-muted-foreground">
                Marked by the carer via the mobile app during this visit.
              </p>
              <ul className="space-y-2">
                {bodyMapObservations.map((obs) => (
                  <li
                    key={obs.id}
                    className="rounded-lg border border-sky-200 bg-sky-50/60 px-3 py-2.5 dark:border-sky-900 dark:bg-sky-950/30"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <MapPin className="h-3.5 w-3.5 text-sky-600" aria-hidden />
                        {obs.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatOrganisationDateTime(obs.recordedAt)}
                      </p>
                    </div>
                    {obs.valueLabel ? (
                      <p className="mt-0.5 text-sm text-foreground">{obs.valueLabel}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {obs.bodyMapPins!.map((pin, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800 dark:bg-sky-900 dark:text-sky-200"
                        >
                          <MapPin className="h-2.5 w-2.5" aria-hidden />
                          {pin.part}
                        </span>
                      ))}
                    </div>
                    <VisitPhotoThumbnails photos={obs.photos} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Visit actions</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" className="justify-start" onClick={() => setTab('body-map')}>
                <MapPin className="mr-2 h-4 w-4" aria-hidden />
                Record body map
              </Button>
              <Button type="button" variant="outline" className="justify-start" asChild>
                <Link
                  to="/service-users/$serviceUserId/body-map"
                  params={{ serviceUserId: job.serviceUserId }}
                  search={bodyMapSearch}
                >
                  <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                  Open full body map
                </Link>
              </Button>
              <Button type="button" variant="outline" className="justify-start" onClick={() => setTab('tasks')}>
                <CheckSquare className="mr-2 h-4 w-4" aria-hidden />
                Visit tasks checklist
              </Button>
              <Button type="button" variant="outline" className="justify-start" onClick={() => setTab('medication')}>
                <Pill className="mr-2 h-4 w-4" aria-hidden />
                Medication &amp; blister pack
              </Button>
              <Button type="button" variant="outline" className="justify-start" onClick={() => setTab('observations')}>
                <Activity className="mr-2 h-4 w-4" aria-hidden />
                Visit observations
              </Button>
              {visitContext.medicationRequired ? (
                <Button type="button" variant="outline" className="justify-start" asChild>
                  <Link
                    to="/service-users/$serviceUserId/medication"
                    params={{ serviceUserId: job.serviceUserId }}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                    Open full MAR
                  </Link>
                </Button>
              ) : null}
              <Button type="button" variant="outline" className="justify-start" asChild>
                <Link
                  to="/service-users/$serviceUserId/observations"
                  params={{ serviceUserId: job.serviceUserId }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                  Open full observations
                </Link>
              </Button>
              {onAddNotes ? (
                <Button type="button" variant="outline" className="justify-start" onClick={onAddNotes}>
                  <StickyNote className="mr-2 h-4 w-4" aria-hidden />
                  Visit notes
                </Button>
              ) : null}
              {onAllocate ? (
                <Button type="button" variant="outline" className="justify-start" onClick={onAllocate}>
                  <Users className="mr-2 h-4 w-4" aria-hidden />
                  Manage carers
                </Button>
              ) : null}
              {onCompleteVisit ? (
                <Button type="button" className="justify-start" onClick={onCompleteVisit}>
                  <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden />
                  {job.status === 'COMPLETED' ? 'Change visit outcome' : 'Record visit outcome'}
                </Button>
              ) : null}
              {onMarkIncomplete ? (
                <Button type="button" variant="outline" className="justify-start" onClick={onMarkIncomplete}>
                  <CircleDashed className="mr-2 h-4 w-4" aria-hidden />
                  Mark incomplete
                </Button>
              ) : null}
              <Button type="button" variant="outline" className="justify-start sm:col-span-2" asChild>
                <Link
                  to="/scheduling/visits/$jobId"
                  params={{ jobId: job.id }}
                  search={{ date, returnTo }}
                >
                  <Smartphone className="mr-2 h-4 w-4" aria-hidden />
                  Open carer visit hub
                </Link>
              </Button>
            </div>
          </section>
        </div>
      ) : tab === 'tasks' ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <VisitJobTasksPanel
            jobId={job.id}
            serviceUserId={job.serviceUserId}
            allowTaskReset={!isScheduleJobCancelled(job)}
            fillHeight
          />
        </div>
      ) : tab === 'medication' ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <VisitMedicationPanel
            serviceUserId={job.serviceUserId}
            visitDate={date}
            visitId={visitContext.scheduledVisitId}
            medicationRoundCode={job.visitPlan?.medicationRoundCode ?? job.visitPlan?.slotCode}
            medicationRoundLabel={job.visitPlan?.label}
            visitWindowStartHm={
              job.visitPlan?.plannedStartTime ??
              formatOpsHm(job.scheduledStartDateTime) ??
              null
            }
            visitWindowEndHm={
              job.visitPlan?.plannedEndTime ??
              formatOpsHm(job.scheduledEndDateTime) ??
              null
            }
          />
        </div>
      ) : tab === 'observations' ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <VisitObservationsPanel
            serviceUserId={job.serviceUserId}
            scheduledJobId={job.id}
            scheduledVisitId={visitContext.scheduledVisitId}
          />
        </div>
      ) : tab === 'log' ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <VisitLogTimelinePanel jobId={job.id} />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <VisitBodyMapCapture visitContext={visitContext} />
          <div className="mt-3">
            <Button type="button" variant="link" size="sm" className="h-auto px-0" asChild>
              <Link
                to="/service-users/$serviceUserId/body-map"
                params={{ serviceUserId: job.serviceUserId }}
                search={bodyMapSearch}
              >
                Open full body map module
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export type { ScheduleVisitContext }
