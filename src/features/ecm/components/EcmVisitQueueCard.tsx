import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Hash,
  Lock,
  MapPin,
  MapPinOff,
  Navigation,
  Siren,
  Users,
} from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { FormField, Textarea } from '@/shared/ui/form-field'
import { cn } from '@/shared/lib/utils'
import { EcmStatusBadge } from '@/features/ecm/components/EcmStatusBadge'
import {
  EcmCarerCapturedLocationList,
  type CapturedGpsPoint,
} from '@/features/ecm/components/EcmCarerCapturedLocation'
import {
  useAcknowledgeEcmException,
  useAllowVisitContinue,
  useAuthoriseCheckInMethodGrant,
  useRejectCheckInMethodGrant,
} from '@/features/ecm/hooks/useEcm'
import type { EcmExceptionRow } from '@/features/ecm/types/ecm.types'
import { formatOpsCalendarDate, formatOpsClockTime } from '@/shared/lib/operational-day.util'

function isVisitOutcomeKind(kind: string): boolean {
  const k = kind.toUpperCase()
  return (
    k.includes('MISSED') ||
    k === 'MISSING_CHECKOUT' ||
    k.includes('LATE') ||
    k.includes('EARLY') ||
    k.includes('SHORT') ||
    k.includes('LONG') ||
    k.includes('OVERRUN')
  )
}

function isJobCompleted(status: string | undefined): boolean {
  return status === 'COMPLETED' || status === 'PARTIALLY_COMPLETED'
}

function formatVisitWhen(startIso: string | undefined, endIso: string | null | undefined): string {
  if (!startIso) return '—'
  const date = formatOpsCalendarDate(startIso)
  const startTime = formatOpsClockTime(startIso)
  if (!endIso) return `${date} · ${startTime}`
  return `${date} · ${startTime} – ${formatOpsClockTime(endIso)}`
}

function carersLabel(row: EcmExceptionRow): string {
  const carers = row.carers ?? []
  if (carers.length === 0) return 'No carers allocated'
  return carers
    .map(c => `${c.name || c.employeeId}${c.isLeadCarer ? ' (lead)' : ''}`)
    .join(', ')
}

function visitTypeFromJobName(jobName: string, serviceUserName: string): string {
  const raw = (jobName ?? '').trim()
  if (!raw) return 'Visit'
  const parts = raw.split(/\s+[—–-]\s+/).map(p => p.trim()).filter(Boolean)
  if (parts.length >= 2) {
    const slot = parts[0] ?? 'Visit'
    const suffix = parts.slice(1).join(' — ').toLowerCase()
    const first = serviceUserName.trim().split(/\s+/)[0]?.toLowerCase() ?? ''
    if (!suffix || suffix === first || serviceUserName.toLowerCase().includes(suffix)) {
      return /visit$/i.test(slot) ? slot : `${slot} visit`
    }
    return /visit$/i.test(slot) ? slot : `${slot} visit`
  }
  return raw
}

function humanizeTag(code: string): string {
  if (code === 'OUTSIDE_AREA_CHECK_IN_REQUEST') return 'Outside area check-in'
  return code
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function isLeftVisitArea(row: EcmExceptionRow): boolean {
  return row.kind === 'LEFT_VISIT_AREA'
}

function isOutsideAreaCheckInRequest(row: EcmExceptionRow): boolean {
  return row.kind === 'OUTSIDE_AREA_CHECK_IN_REQUEST'
}

function isCarerSos(row: EcmExceptionRow): boolean {
  return row.kind === 'CARER_SOS'
}

function isSosAcknowledged(row: EcmExceptionRow): boolean {
  return Boolean(
    row.sos?.acknowledgedAt ||
      row.acknowledgedAt ||
      row.lifecycle === 'ACKNOWLEDGED' ||
      row.lifecycle === 'RESOLVED' ||
      row.lifecycle === 'MANAGER_REVIEWED' ||
      row.lifecycle === 'CLOSED',
  )
}

function mapsHrefFor(row: EcmExceptionRow): string | null {
  const sos = row.sos
  if (sos?.latitude != null && sos.longitude != null && !sos.locationUnavailable) {
    return `https://maps.google.com/?q=${sos.latitude},${sos.longitude}`
  }
  const grant = row.checkInMethodRequest
  if (
    grant?.latitude != null &&
    grant.longitude != null &&
    !grant.locationUnavailable
  ) {
    return `https://maps.google.com/?q=${grant.latitude},${grant.longitude}`
  }
  return null
}

function gpsKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)},${longitude.toFixed(4)}`
}

function pushUniqueGps(points: CapturedGpsPoint[], next: CapturedGpsPoint) {
  const key = gpsKey(next.latitude, next.longitude)
  if (points.some(p => gpsKey(p.latitude, p.longitude) === key)) return
  points.push(next)
}

function capturedGpsPoints(rows: EcmExceptionRow[]): CapturedGpsPoint[] {
  const points: CapturedGpsPoint[] = []
  const sample = rows[0]
  if (!sample) return points

  const checkIn = rows.map(r => r.checkInLocation).find(Boolean)
  if (checkIn) {
    pushUniqueGps(points, {
      id: `check-in:${sample.scheduledJobId}`,
      label: checkIn.outsideGeofence
        ? 'Clock-in location (outside geofence)'
        : 'Clock-in location',
      latitude: checkIn.latitude,
      longitude: checkIn.longitude,
      distanceMeters: checkIn.distanceMeters,
      carerName:
        sample.carers?.find(c => c.employeeId === checkIn.employeeId)?.name ?? null,
    })
  }

  for (const row of rows) {
    const grant = row.checkInMethodRequest
    if (
      !grant ||
      grant.locationUnavailable ||
      grant.latitude == null ||
      grant.longitude == null
    ) {
      continue
    }
    pushUniqueGps(points, {
      id: `grant:${grant.id}`,
      label: 'Outside area request',
      latitude: grant.latitude,
      longitude: grant.longitude,
      distanceMeters: grant.distanceMeters,
      carerName:
        grant.employeeName ||
        row.carers?.find(c => c.employeeId === grant.employeeId)?.name ||
        null,
    })
  }

  const lock = rows.find(isLeftVisitArea)?.areaLock
  if (lock?.latitude != null && lock.longitude != null) {
    pushUniqueGps(points, {
      id: `lock:${sample.scheduledJobId}`,
      label: 'Left visit area',
      latitude: lock.latitude,
      longitude: lock.longitude,
      distanceMeters: lock.distanceMeters,
      carerName:
        sample.carers?.find(c => c.employeeId === lock.employeeId)?.name ?? null,
    })
  }

  for (const row of rows.filter(isCarerSos)) {
    const sos = row.sos
    if (!sos || sos.locationUnavailable || sos.latitude == null || sos.longitude == null) {
      continue
    }
    pushUniqueGps(points, {
      id: `sos:${row.id}`,
      label: 'SOS location',
      latitude: sos.latitude,
      longitude: sos.longitude,
      carerName: sos.employeeName,
    })
  }

  return points
}

function visitIdMatchLine(row: EcmExceptionRow) {
  const ref = row.visitRef?.trim()
  if (!ref) return null
  return (
    <p
      className="flex items-center gap-2 text-sm text-muted-foreground"
      title="Same Visit ID as the carer app"
    >
      <Hash className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 truncate">
        <span className="font-medium text-foreground/80">Visit ID</span>
        <span className="mx-1.5 text-muted-foreground/80">·</span>
        <span className="font-mono text-[13px] font-semibold tracking-tight text-foreground">
          {ref}
        </span>
      </span>
    </p>
  )
}

function sosEntryMeta(row: EcmExceptionRow): {
  name: string
  time: string
  message: string
  acknowledged: boolean
  acknowledgedLabel: string | null
} {
  const name =
    row.sos?.employeeName ||
    row.carers?.find(c => c.employeeId === row.sos?.employeeId)?.name ||
    carersLabel(row)
  const acknowledgedAt = row.sos?.acknowledgedAt ?? row.acknowledgedAt
  const by = row.sos?.acknowledgedByName ?? row.acknowledgedByName
  const when = acknowledgedAt ? formatOpsClockTime(acknowledgedAt) : null
  return {
    name,
    time: formatOpsClockTime(row.sos?.createdAt ?? row.createdAt),
    message: row.sos?.message?.trim() || 'No message',
    acknowledged: Boolean(acknowledgedAt),
    acknowledgedLabel:
      acknowledgedAt && by
        ? `Acknowledged by ${by} · ${when}`
        : acknowledgedAt
          ? `Acknowledged · ${when}`
          : null,
  }
}

function SosAlertEntries({
  rows,
  acknowledged,
}: {
  rows: EcmExceptionRow[]
  acknowledged: boolean
}) {
  const dotClass = acknowledged ? 'bg-emerald-500' : 'bg-rose-500'
  if (rows.length <= 1) {
    const row = rows[0]
    if (!row) return null
    const meta = sosEntryMeta(row)
    return (
      <div className="text-sm text-foreground">
        <p className="font-medium">
          {meta.name} · sent {meta.time}
        </p>
        <p className={row.sos?.message ? 'text-foreground' : 'text-muted-foreground'}>
          {meta.message}
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-0" data-testid="ecm-carer-sos-timeline">
      {rows.map((row, index) => {
        const meta = sosEntryMeta(row)
        return (
          <li key={row.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', dotClass)} />
              {index < rows.length - 1 ? (
                <span className="w-px flex-1 bg-border" aria-hidden />
              ) : null}
            </div>
            <span className="w-12 shrink-0 pt-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {meta.time}
            </span>
            <div className={cn('min-w-0 flex-1', index < rows.length - 1 && 'pb-4')}>
              <p className="text-sm font-medium text-foreground">{meta.name}</p>
              <p
                className={cn(
                  'mt-0.5 text-sm leading-relaxed',
                  row.sos?.message ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {meta.message}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function ExceptionActions({
  row,
  onOpenVisit,
}: {
  row: EcmExceptionRow
  onOpenVisit: (jobId: string) => void
}) {
  const navigate = useNavigate()
  const outcomeKind = isVisitOutcomeKind(row.kind)
  const completed = isJobCompleted(row.jobStatus)

  const openVisitOutcome = () => {
    void navigate({
      to: '/scheduling/schedule-jobs',
      search: {
        date: row.plannedDate || undefined,
        visitAction: 'complete',
        actionJobId: row.scheduledJobId,
      },
    })
  }

  return (
    <div className="space-y-3" onClick={e => e.stopPropagation()}>
      <p className="text-sm text-muted-foreground">
        {completed
          ? 'Visit already has a scheduling outcome. Open monitoring detail if you need evidence; ECM should clear this alert after re-evaluation.'
          : outcomeKind
            ? 'Handle happened / missed / times in the visit workspace.'
            : 'Review monitoring detail, or open visit outcome if care delivery needs updating.'}
      </p>
      <div className="flex flex-wrap gap-2">
        {outcomeKind ? (
          <Button type="button" size="sm" onClick={openVisitOutcome}>
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            {completed ? 'Change visit outcome' : 'Record visit outcome'}
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant={outcomeKind ? 'outline' : 'default'}
          onClick={() => onOpenVisit(row.scheduledJobId)}
        >
          View monitoring detail
        </Button>
        {!outcomeKind ? (
          <Button type="button" size="sm" variant="outline" onClick={openVisitOutcome}>
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Visit outcome
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function AreaLockActions({ row }: { row: EcmExceptionRow }) {
  const allow = useAllowVisitContinue()
  const [note, setNote] = React.useState('')
  const allowed = row.areaLock?.status === 'ALLOWED'
  const savedNote = row.areaLock?.allowNote?.trim() || ''

  return (
    <div className="space-y-3" onClick={e => e.stopPropagation()}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Left visit area
      </p>
      {allowed ? (
        <div className="space-y-2">
          <p className="text-sm text-foreground">
            Allowed{row.areaLock?.allowedByName ? ` by ${row.areaLock.allowedByName}` : ''} —
            carer can continue this visit.
          </p>
          {savedNote ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground/80">Note</span>
              <span className="mx-1.5 text-muted-foreground/80">·</span>
              {savedNote}
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Carer left the visit area after clock-in. Tasks already saved stay as they are.
            New tasks, medication, and observations stay blocked until office allows.
          </p>
          <FormField label="Note (optional)" htmlFor={`locked-visit-allow-note-${row.id}`}>
            <Textarea
              id={`locked-visit-allow-note-${row.id}`}
              rows={2}
              className="min-h-[64px]"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. GP escort, pharmacy, still with the person"
            />
          </FormField>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={allow.isPending}
              onClick={() =>
                allow.mutate({
                  jobId: row.scheduledJobId,
                  note: note.trim() || undefined,
                })
              }
            >
              {allow.isPending ? 'Allowing…' : 'Allow carer to continue'}
            </Button>
          </div>
          {allow.isError ? (
            <p className="text-sm text-destructive">Could not allow this visit. Try again.</p>
          ) : null}
        </>
      )}
    </div>
  )
}

function CheckInGrantActions({ row }: { row: EcmExceptionRow }) {
  const authorise = useAuthoriseCheckInMethodGrant()
  const reject = useRejectCheckInMethodGrant()
  const [note, setNote] = React.useState('')
  const grant = row.checkInMethodRequest
  const grantId = grant?.id
  const status = grant?.status ?? 'PENDING'
  const pending = status === 'PENDING'
  const authorised = Boolean(grant?.manualEnabled)
  const mapsHref = mapsHrefFor(row)
  const busy = authorise.isPending || reject.isPending

  return (
    <div className="space-y-3" onClick={e => e.stopPropagation()}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Outside area check-in
      </p>
      {grant?.carerNote ? (
        <p className="text-sm text-foreground">
          <span className="font-medium text-foreground/80">Carer note</span>
          <span className="mx-1.5 text-muted-foreground/80">·</span>
          {grant.carerNote}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">No note from the carer.</p>
      )}
      {mapsHref ? (
        <a
          href={mapsHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <MapPin className="h-4 w-4" aria-hidden />
          Open GPS snapshot
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      ) : null}
      {authorised ? (
        <p className="text-sm text-foreground">
          Authorised{grant?.decidedByName ? ` by ${grant.decidedByName}` : ''} —
          Manual is enabled for this carer on this visit today.
        </p>
      ) : pending && grantId ? (
        <>
          <p className="text-sm text-muted-foreground">
            Authorise enables Manual check-in for this carer, this visit, and this
            operational day only. Organisation check-in settings stay unchanged.
          </p>
          <FormField
            label="Note (optional)"
            htmlFor={`check-in-method-grant-note-${row.id}`}
          >
            <Textarea
              id={`check-in-method-grant-note-${row.id}`}
              rows={2}
              className="min-h-[64px]"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Traffic, wait at the gate"
            />
          </FormField>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() =>
                authorise.mutate({
                  jobId: row.scheduledJobId,
                  grantId,
                  note: note.trim() || undefined,
                })
              }
            >
              {authorise.isPending ? 'Authorising…' : 'Authorise Manual'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                reject.mutate({
                  jobId: row.scheduledJobId,
                  grantId,
                  note: note.trim() || undefined,
                })
              }
            >
              {reject.isPending ? 'Rejecting…' : 'Reject'}
            </Button>
          </div>
          {authorise.isError || reject.isError ? (
            <p className="text-sm text-destructive">Could not update this request. Try again.</p>
          ) : null}
        </>
      ) : null}
      {grant?.officeNote && !pending ? (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground/80">Office note</span>
          <span className="mx-1.5 text-muted-foreground/80">·</span>
          {grant.officeNote}
        </p>
      ) : null}
    </div>
  )
}

function SosActions({ rows }: { rows: EcmExceptionRow[] }) {
  const acknowledge = useAcknowledgeEcmException()
  const [busy, setBusy] = React.useState(false)
  const [actionError, setActionError] = React.useState(false)
  const toAck = rows.filter(row => !isSosAcknowledged(row))

  const runAll = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setActionError(false)
    try {
      await fn()
    } catch {
      setActionError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3" onClick={e => e.stopPropagation()}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Carer SOS
      </p>
      <div className="space-y-2">
        {rows.map(row => {
          const href = mapsHrefFor(row)
          const label = formatOpsClockTime(row.sos?.createdAt ?? row.createdAt)
          return href ? (
            <a
              key={row.id}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-2 hover:underline"
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              Open in Maps{rows.length > 1 ? ` · ${label}` : ''}
            </a>
          ) : (
            <p key={row.id} className="text-sm text-muted-foreground">
              Location was not available{rows.length > 1 ? ` · ${label}` : ''}.
            </p>
          )
        })}
      </div>
      {toAck.length > 0 ? (
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() =>
            void runAll(() =>
              Promise.all(toAck.map(row => acknowledge.mutateAsync({ id: row.id }))),
            )
          }
        >
          {busy ? 'Acknowledging…' : 'Acknowledge'}
        </Button>
      ) : null}
      {actionError || acknowledge.isError ? (
        <p className="text-sm text-destructive">Could not update this SOS. Try again.</p>
      ) : null}
    </div>
  )
}

function VisitBadges({ rows }: { rows: EcmExceptionRow[] }) {
  const sosRows = rows.filter(isCarerSos)
  const lockRow = rows.find(isLeftVisitArea)
  const checkInRows = rows.filter(isOutsideAreaCheckInRequest)
  const otherRows = rows.filter(
    row => !isCarerSos(row) && !isLeftVisitArea(row) && !isOutsideAreaCheckInRequest(row),
  )
  const unackedSos = sosRows.some(row => !isSosAcknowledged(row))
  const allowed = lockRow?.areaLock?.status === 'ALLOWED'
  const showMock = rows.some(
    row => Boolean(row.hasMockLocation) || row.kind === 'MOCK_LOCATION' || Boolean(row.sos?.isMockedLocation),
  )
  const overdue = rows.some(row => row.overdue)
  const otherKinds = [...new Set(otherRows.map(row => row.kind))].filter(
    kind => kind !== 'MOCK_LOCATION',
  )
  const otherLifecycle = otherRows.find(
    row => row.lifecycle === 'ALERT_GENERATED' || row.lifecycle === 'DETECTED',
  )?.lifecycle

  return (
    <div className="flex shrink-0 flex-wrap justify-end gap-1">
      {sosRows.length > 0 ? (
        <EcmStatusBadge
          code="CARER_SOS"
          className={
            unackedSos
              ? undefined
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
          }
        />
      ) : null}
      {lockRow ? (
        allowed ? (
          <>
            <Badge
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
            >
              <CheckCircle2
                className="size-3.5 shrink-0 text-emerald-500 dark:text-emerald-400"
                strokeWidth={2.25}
                aria-hidden
              />
              Allowed
            </Badge>
            <Badge
              variant="outline"
              className="border-destructive/30 bg-destructive/10 text-destructive"
            >
              <MapPinOff
                className="size-3.5 shrink-0 text-red-500 dark:text-red-400"
                strokeWidth={2.25}
                aria-hidden
              />
              Left visit area
            </Badge>
          </>
        ) : (
          <Badge
            variant="outline"
            className="border-destructive/40 bg-destructive/10 text-destructive"
          >
            <Lock
              className="size-3.5 shrink-0 text-red-500 dark:text-red-400"
              strokeWidth={2.25}
              aria-hidden
            />
            Locked — left area
          </Badge>
        )
      ) : null}
      {checkInRows.length > 0 ? (
        <>
          <EcmStatusBadge code="OUTSIDE_AREA_CHECK_IN_REQUEST" kind="generic" />
          {checkInRows.some(row => row.checkInMethodRequest?.manualEnabled) ? (
            <Badge
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
            >
              <CheckCircle2
                className="size-3.5 shrink-0 text-emerald-500 dark:text-emerald-400"
                strokeWidth={2.25}
                aria-hidden
              />
              Manual authorised
            </Badge>
          ) : null}
        </>
      ) : null}
      {overdue ? <EcmStatusBadge code="OVERDUE" kind="generic" /> : null}
      {otherKinds.map(kind => (
        <EcmStatusBadge
          key={kind}
          code={kind}
          kind={isVisitOutcomeKind(kind) ? 'arrival' : 'generic'}
        />
      ))}
      {showMock ? <EcmStatusBadge code="MOCK_LOCATION" kind="generic" /> : null}
      {otherLifecycle ? (
        <EcmStatusBadge code={otherLifecycle} kind="exceptionLifecycle" />
      ) : null}
    </div>
  )
}

export function VisitQueueCard({
  rows,
  expanded,
  onToggle,
  onOpenVisit,
}: {
  rows: EcmExceptionRow[]
  expanded: boolean
  onToggle: () => void
  onOpenVisit: (jobId: string) => void
}) {
  const row = rows[0]
  if (!row) return null

  const sosRows = [...rows.filter(isCarerSos)].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  const lockRow = rows.find(isLeftVisitArea)
  const checkInRows = rows.filter(isOutsideAreaCheckInRequest)
  const otherRows = rows.filter(
    r => !isCarerSos(r) && !isLeftVisitArea(r) && !isOutsideAreaCheckInRequest(r),
  )
  const actionsRow =
    rows.find(r => isVisitOutcomeKind(r.kind)) ?? otherRows[0] ?? row

  const visitType = visitTypeFromJobName(row.jobName, row.serviceUserName)
  const when = formatVisitWhen(row.plannedStartDateTime, row.plannedEndDateTime)
  const unackedSos = sosRows.some(r => !isSosAcknowledged(r))
  const lockPending = Boolean(lockRow && lockRow.areaLock?.status !== 'ALLOWED')
  const checkInPending = checkInRows.some(
    r => (r.checkInMethodRequest?.status ?? 'PENDING') === 'PENDING',
  )
  const overdue = rows.some(r => r.overdue)
  const allowed = lockRow?.areaLock?.status === 'ALLOWED'
  const gpsPoints = capturedGpsPoints(rows)
  const grant = checkInRows[0]?.checkInMethodRequest
  const grantGpsMissing = Boolean(grant?.locationUnavailable) && gpsPoints.length === 0
  const clockedInLabel = row.clockedInAt ? formatOpsClockTime(row.clockedInAt) : null
  const lockedAtLabel = lockRow?.areaLock?.lockedAt
    ? formatOpsClockTime(lockRow.areaLock.lockedAt)
    : lockRow
      ? formatOpsClockTime(lockRow.createdAt)
      : null
  const allSosAcked = sosRows.length > 0 && !unackedSos
  const ackSource =
    sosRows.find(r => r.sos?.acknowledgedAt || r.acknowledgedAt) ?? sosRows[0]
  const ackLabel = ackSource ? sosEntryMeta(ackSource).acknowledgedLabel : null

  const banner = unackedSos
    ? ({
        className: 'bg-destructive text-destructive-foreground',
        label: 'Carer SOS — staff safety',
        icon: 'sos' as const,
      })
    : lockPending
      ? ({
          className: 'bg-destructive text-destructive-foreground',
          label: 'Action needed — operations blocked',
          icon: 'dot' as const,
        })
      : checkInPending
        ? ({
            className: 'bg-amber-600 text-white',
            label: 'Action needed — outside area check-in',
            icon: 'dot' as const,
          })
        : null

  return (
    <article
      className={cn(
        'overflow-hidden rounded-xl border bg-card shadow-sm',
        unackedSos || lockPending
          ? 'border-destructive/50 dark:border-destructive/40'
          : checkInPending
            ? 'border-amber-500/50 dark:border-amber-500/40'
            : overdue
              ? 'border-orange-300/60 dark:border-orange-800/50'
              : 'border-border',
      )}
      data-testid="ecm-exception-card"
      data-visit-id={row.scheduledJobId}
    >
      {banner ? (
        <div
          className={cn(
            'flex items-center gap-2 px-4 py-1.5 text-xs font-semibold tracking-wide',
            banner.className,
          )}
        >
          {banner.icon === 'sos' ? (
            <Siren className="size-3.5 shrink-0" aria-hidden />
          ) : (
            <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-white" aria-hidden />
          )}
          {banner.label}
          {unackedSos && sosRows.length > 1 ? (
            <span className="ml-auto font-medium normal-case tracking-normal">
              {sosRows.length} alerts
            </span>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/30"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="truncate text-base font-semibold tracking-tight text-foreground">
                {row.serviceUserName}
              </h4>
              <p className="mt-0.5 text-sm font-medium text-foreground">{visitType}</p>
            </div>
            <VisitBadges rows={rows} />
          </div>

          <div className="space-y-1.5 text-sm">
            <p className="flex items-center gap-2 font-medium tabular-nums text-foreground">
              <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              {when}
            </p>
            {visitIdMatchLine(row)}
            <p className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0 truncate">
                <span className="font-medium text-foreground/80">Carers</span>
                <span className="mx-1.5 text-muted-foreground/80">·</span>
                {carersLabel(row)}
              </span>
            </p>
            {lockRow ? (
              <>
                <p className="flex items-center gap-2 tabular-nums text-muted-foreground">
                  <Clock className="h-4 w-4 shrink-0" aria-hidden />
                  {clockedInLabel ? `Clocked in ${clockedInLabel}` : 'Clocked in —'}
                </p>
                <p className="flex items-center gap-2 tabular-nums text-muted-foreground">
                  <MapPinOff className="h-4 w-4 shrink-0" aria-hidden />
                  {allowed
                    ? `Operations unlocked${lockedAtLabel ? ` · was locked ${lockedAtLabel}` : ''}`
                    : `Operations locked ${lockedAtLabel ?? ''}`}
                </p>
              </>
            ) : null}
            {!expanded && gpsPoints.length > 0 ? (
              <EcmCarerCapturedLocationList points={gpsPoints} />
            ) : !expanded && grantGpsMissing ? (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Navigation className="h-4 w-4 shrink-0" aria-hidden />
                GPS unavailable
              </p>
            ) : null}
          </div>

          {sosRows.length > 0 ? (
            <SosAlertEntries rows={sosRows} acknowledged={allSosAcked} />
          ) : null}
          {allSosAcked && ackLabel ? (
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              {ackLabel}
            </p>
          ) : null}

          {otherRows.map(alert => {
            if (alert.kind === 'MOCK_LOCATION') return null
            const extra = alert.detail?.trim()
            if (!extra) return null
            const title = (alert.title || humanizeTag(alert.kind)).trim()
            if (extra.toLowerCase() === title.toLowerCase()) return null
            return (
              <p key={alert.id} className="text-sm text-muted-foreground">
                {extra}
              </p>
            )
          })}
        </div>
        <ChevronRight
          className={cn(
            'mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            expanded && 'rotate-90',
          )}
          aria-hidden
        />
      </button>

      {expanded ? (
        <div className="space-y-4 border-t border-border px-4 py-3">
          {gpsPoints.length > 0 ? (
            <EcmCarerCapturedLocationList points={gpsPoints} showMap />
          ) : null}
          {sosRows.length > 0 ? <SosActions rows={sosRows} /> : null}
          {lockRow ? <AreaLockActions row={lockRow} /> : null}
          {checkInRows.map(grantRow => (
            <CheckInGrantActions key={grantRow.id} row={grantRow} />
          ))}
          <ExceptionActions row={actionsRow} onOpenVisit={onOpenVisit} />
        </div>
      ) : null}
    </article>
  )
}
