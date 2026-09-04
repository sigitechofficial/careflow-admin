import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  ListFilter,
  Loader2,
  Lock,
  MapPin,
  MapPinOff,
  Radio,
  Siren,
  Users,
} from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { ContentCard } from '@/shared/ui/content-section'
import { FormField, Textarea } from '@/shared/ui/form-field'
import { cn } from '@/shared/lib/utils'
import { EcmStatusBadge } from '@/features/ecm/components/EcmStatusBadge'
import {
  useAcknowledgeEcmException,
  useAllowVisitContinue,
  useEcmExceptions,
} from '@/features/ecm/hooks/useEcm'
import type { EcmExceptionRow } from '@/features/ecm/types/ecm.types'
import {
  exceptionPlannedDayKey,
  isDayInPeriod,
} from '@/features/ecm/utils/ecm-operational-period.util'
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
    <div className="space-y-3 border-t border-border px-4 py-3" onClick={e => e.stopPropagation()}>
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

function ExceptionVisitCard({
  row,
  expanded,
  onToggle,
  onOpenVisit,
}: {
  row: EcmExceptionRow
  expanded: boolean
  onToggle: () => void
  onOpenVisit: (jobId: string) => void
}) {
  const visitType = visitTypeFromJobName(row.jobName, row.serviceUserName)
  const when = formatVisitWhen(row.plannedStartDateTime, row.plannedEndDateTime)
  const carers = carersLabel(row)

  return (
    <article
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card shadow-sm',
        row.overdue && 'border-orange-300/60 dark:border-orange-800/50',
      )}
      data-testid="ecm-exception-card"
    >
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
            <div className="flex shrink-0 flex-wrap justify-end gap-1">
              {row.overdue ? <EcmStatusBadge code="OVERDUE" kind="generic" /> : null}
              <EcmStatusBadge code={row.kind} kind="arrival" />
              {row.hasMockLocation && row.kind !== 'MOCK_LOCATION' ? (
                <EcmStatusBadge code="MOCK_LOCATION" kind="generic" />
              ) : null}
              <EcmStatusBadge code={row.lifecycle} kind="exceptionLifecycle" />
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="flex items-center gap-2 text-sm font-medium tabular-nums text-foreground">
              <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              {when}
            </p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0 truncate">
                <span className="font-medium text-foreground/80">Carers</span>
                <span className="mx-1.5 text-muted-foreground/80">·</span>
                {carers}
              </span>
            </p>
          </div>

          {row.detail ? (
            <p className="text-sm text-muted-foreground">{row.detail}</p>
          ) : null}
        </div>

        <ChevronRight
          className={cn(
            'mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            expanded && 'rotate-90',
          )}
          aria-hidden
        />
      </button>

      {expanded ? <ExceptionActions row={row} onOpenVisit={onOpenVisit} /> : null}
    </article>
  )
}

function humanizeTag(code: string): string {
  return code
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function rowHasMockLocation(row: EcmExceptionRow): boolean {
  return Boolean(row.hasMockLocation) || row.kind === 'MOCK_LOCATION'
}

function rowMatchesQueueTag(row: EcmExceptionRow, tag: string): boolean {
  if (tag === 'all') return true
  if (tag === 'OVERDUE') return row.overdue
  if (tag === 'MOCK_LOCATION') return rowHasMockLocation(row)
  return row.kind === tag
}

/** Always shown — even when count is 0 — so coordinators can filter an empty period. */
const ALWAYS_QUEUE_TAGS = [
  'CARER_SOS',
  'MOCK_LOCATION',
  'OVERDUE',
  'LEFT_VISIT_AREA',
  'POTENTIAL_MISSED',
  'CONFIRMED_MISSED',
  'MISSING_CHECKOUT',
  'OUTSIDE_GEOFENCE',
  'LATE_ARRIVAL',
  'VERY_LATE_ARRIVAL',
  'EARLY_ARRIVAL',
  'EARLY_DEPARTURE',
  'SHORT_VISIT',
  'LONG_VISIT',
  'EXCESSIVE_OVERRUN',
  'MANUAL_ATTENDANCE',
] as const

type QueueTagOption = { id: string; label: string; count: number }

function queueTagOptions(rows: EcmExceptionRow[]): {
  chips: QueueTagOption[]
  catalog: QueueTagOption[]
} {
  const counts = new Map<string, number>()
  const bump = (id: string) => counts.set(id, (counts.get(id) ?? 0) + 1)
  const sosJobs = new Set<string>()
  for (const row of rows) {
    if (row.kind === 'CARER_SOS') {
      if (!isSosAcknowledged(row)) sosJobs.add(row.scheduledJobId)
    } else bump(row.kind)
    if (rowHasMockLocation(row) && row.kind !== 'MOCK_LOCATION') bump('MOCK_LOCATION')
    if (row.overdue) bump('OVERDUE')
  }
  if (sosJobs.size > 0) counts.set('CARER_SOS', sosJobs.size)
  const extra = [...counts.keys()]
    .filter((id) => !(ALWAYS_QUEUE_TAGS as readonly string[]).includes(id) && id !== 'OTHER')
    .sort((a, b) => humanizeTag(a).localeCompare(humanizeTag(b)))
  const catalog: QueueTagOption[] = ['all', ...ALWAYS_QUEUE_TAGS, ...extra].map((id) => ({
    id,
    label: id === 'all' ? 'All tags' : humanizeTag(id),
    count: id === 'all' ? rows.length : (counts.get(id) ?? 0),
  }))
  const chips = catalog.filter((opt) => opt.id === 'all' || opt.count > 0)
  return { chips, catalog }
}

function isLeftVisitArea(row: EcmExceptionRow): boolean {
  return row.kind === 'LEFT_VISIT_AREA'
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

function isAreaLockPending(row: EcmExceptionRow): boolean {
  return isLeftVisitArea(row) && row.areaLock?.status !== 'ALLOWED'
}

function sosGroupKey(jobId: string): string {
  return `sos:${jobId}`
}

function mapsHrefFor(row: EcmExceptionRow): string | null {
  const sos = row.sos
  if (sos?.latitude == null || sos.longitude == null || sos.locationUnavailable) return null
  return `https://maps.google.com/?q=${sos.latitude},${sos.longitude}`
}

function groupQueueItems(rows: EcmExceptionRow[]): Array<
  | { kind: 'sos'; jobId: string; rows: EcmExceptionRow[] }
  | { kind: 'single'; row: EcmExceptionRow }
> {
  const sosByJob = new Map<string, EcmExceptionRow[]>()
  for (const row of rows) {
    if (!isCarerSos(row)) continue
    const list = sosByJob.get(row.scheduledJobId) ?? []
    list.push(row)
    sosByJob.set(row.scheduledJobId, list)
  }
  for (const list of sosByJob.values()) {
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
  const seen = new Set<string>()
  const items: Array<
    | { kind: 'sos'; jobId: string; rows: EcmExceptionRow[] }
    | { kind: 'single'; row: EcmExceptionRow }
  > = []
  for (const row of rows) {
    if (isCarerSos(row)) {
      if (seen.has(row.scheduledJobId)) continue
      seen.add(row.scheduledJobId)
      items.push({
        kind: 'sos',
        jobId: row.scheduledJobId,
        rows: sosByJob.get(row.scheduledJobId) ?? [row],
      })
    } else {
      items.push({ kind: 'single', row })
    }
  }
  return items
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

function CarerSosCard({
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
  const acknowledge = useAcknowledgeEcmException()
  // const resolve = useResolveEcmException()
  const [busy, setBusy] = React.useState(false)
  const [actionError, setActionError] = React.useState(false)
  const latest = rows[0]
  if (!latest) return null
  const visitType = visitTypeFromJobName(latest.jobName, latest.serviceUserName)
  const when = formatVisitWhen(latest.plannedStartDateTime, latest.plannedEndDateTime)
  const showMock = rows.some(row => row.hasMockLocation || row.sos?.isMockedLocation)
  const toAck = rows.filter(row => !isSosAcknowledged(row))
  const allAcknowledged = toAck.length === 0
  const ackSource =
    rows.find(row => row.sos?.acknowledgedAt || row.acknowledgedAt) ?? latest
  const ackLabel = sosEntryMeta(ackSource).acknowledgedLabel

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
    <article
      className={cn(
        'overflow-hidden rounded-xl border bg-card shadow-sm',
        allAcknowledged
          ? 'border-emerald-500/40 dark:border-emerald-500/30'
          : 'border-destructive/50 dark:border-destructive/40',
      )}
      data-testid="ecm-carer-sos"
    >
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-1.5 text-xs font-semibold tracking-wide',
          allAcknowledged
            ? 'bg-emerald-600 text-white dark:bg-emerald-700'
            : 'bg-destructive text-destructive-foreground',
        )}
      >
        <Siren className="size-3.5 shrink-0" aria-hidden />
        {allAcknowledged ? 'Carer SOS — acknowledged' : 'Carer SOS — staff safety'}
        {rows.length > 1 ? (
          <span className="ml-auto font-medium normal-case tracking-normal">
            {rows.length} alerts
          </span>
        ) : null}
      </div>
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
                {latest.serviceUserName}
              </h4>
              <p className="mt-0.5 text-sm font-medium text-foreground">{visitType}</p>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-1">
              <EcmStatusBadge
                code="CARER_SOS"
                className={
                  allAcknowledged
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                    : undefined
                }
              />
              {showMock ? <EcmStatusBadge code="MOCK_LOCATION" kind="generic" /> : null}
              {allAcknowledged ? null : <EcmStatusBadge code={latest.lifecycle} />}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{when}</p>
          <SosAlertEntries rows={rows} acknowledged={allAcknowledged} />
          {allAcknowledged && ackLabel ? (
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              {ackLabel}
            </p>
          ) : null}
        </div>
      </button>
      {expanded ? (
        <div className="space-y-3 border-t border-border px-4 py-3" onClick={e => e.stopPropagation()}>
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
          <div className="flex flex-wrap gap-2">
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
            {/* Mark carer safe — paused for now
            {toResolve.length > 0 ? (
              <Button ...>Mark carer safe</Button>
            ) : null}
            */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onOpenVisit(latest.scheduledJobId)}
            >
              View monitoring detail
            </Button>
          </div>
          {actionError || acknowledge.isError ? (
            <p className="text-sm text-destructive">Could not update this SOS. Try again.</p>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

function LockedVisitAreaCard({
  row,
  expanded,
  onToggle,
}: {
  row: EcmExceptionRow
  expanded: boolean
  onToggle: () => void
}) {
  const allow = useAllowVisitContinue()
  const [note, setNote] = React.useState('')
  const allowed = row.areaLock?.status === 'ALLOWED'
  const visitType = visitTypeFromJobName(row.jobName, row.serviceUserName)
  const when = formatVisitWhen(row.plannedStartDateTime, row.plannedEndDateTime)
  const lockCarer =
    row.carers?.find(c => c.employeeId === row.areaLock?.employeeId)?.name ??
    carersLabel(row)
  const clockedInLabel = row.clockedInAt
    ? formatOpsClockTime(row.clockedInAt)
    : null
  const lockedAtLabel = row.areaLock?.lockedAt
    ? formatOpsClockTime(row.areaLock.lockedAt)
    : formatOpsClockTime(row.createdAt)
  const savedNote = row.areaLock?.allowNote?.trim() || ''

  return (
    <article
      className={cn(
        'overflow-hidden rounded-xl border bg-card shadow-sm',
        allowed
          ? 'border-border'
          : 'border-destructive/50 dark:border-destructive/40',
      )}
      data-testid="ecm-locked-visit-area"
    >
      {!allowed ? (
        <div className="flex items-center gap-2 bg-destructive px-4 py-1.5 text-xs font-semibold tracking-wide text-destructive-foreground">
          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-white" aria-hidden />
          Action needed — operations blocked
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
            <div className="flex shrink-0 flex-wrap justify-end gap-1">
              {allowed ? (
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
              )}
              {row.hasMockLocation ? (
                <EcmStatusBadge code="MOCK_LOCATION" kind="generic" />
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5 text-sm">
            <p className="flex items-center gap-2 font-medium tabular-nums text-foreground">
              <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              {when}
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 shrink-0" aria-hidden />
              <span>
                <span className="font-medium text-foreground/80">Carer</span>
                <span className="mx-1.5 text-muted-foreground/80">·</span>
                {lockCarer}
              </span>
            </p>
            <p className="flex items-center gap-2 tabular-nums text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" aria-hidden />
              {clockedInLabel ? `Clocked in ${clockedInLabel}` : 'Clocked in —'}
            </p>
            <p className="flex items-center gap-2 tabular-nums text-muted-foreground">
              <MapPinOff className="h-4 w-4 shrink-0" aria-hidden />
              Operations locked {lockedAtLabel}
            </p>
          </div>
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
        <div className="space-y-3 border-t border-border px-4 py-3">
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
                  onChange={(e) => setNote(e.target.value)}
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
      ) : null}
    </article>
  )
}

export function EcmExceptionQueuePanel({
  onOpenVisit,
  serviceUserId,
  dateFrom,
  dateTo,
  periodLabel,
}: {
  onOpenVisit: (jobId: string) => void
  /** When set, only exceptions for this service user are loaded. */
  serviceUserId?: string
  /** Inclusive period start (YYYY-MM-DD). */
  dateFrom?: string
  /** Inclusive period end (YYYY-MM-DD). */
  dateTo?: string
  /** Human label for the active operational period (preset name or date span). */
  periodLabel?: string
}) {
  const exceptions = useEcmExceptions({ limit: 100, serviceUserId })
  /** `undefined` = auto-open first locked card; `null` = user collapsed all. */
  const [expandedId, setExpandedId] = React.useState<string | null | undefined>(
    undefined,
  )
  const [tagFilter, setTagFilter] = React.useState('all')

  const allRows = exceptions.data ?? []
  const periodRows = React.useMemo(() => {
    const filtered =
      dateFrom && dateTo
        ? allRows.filter((row) =>
            isDayInPeriod(exceptionPlannedDayKey(row), dateFrom, dateTo),
          )
        : allRows
    return [...filtered].sort((a, b) => {
      const rank = (row: EcmExceptionRow) =>
        isCarerSos(row) && !isSosAcknowledged(row)
          ? 0
          : isAreaLockPending(row)
            ? 1
            : isLeftVisitArea(row)
              ? 2
              : isCarerSos(row)
                ? 3
                : 4
      return rank(a) - rank(b)
    })
  }, [allRows, dateFrom, dateTo])

  const { chips: tagChips, catalog: tagCatalog } = React.useMemo(
    () => queueTagOptions(periodRows),
    [periodRows],
  )

  React.useEffect(() => {
    if (tagFilter !== 'all' && !tagCatalog.some((opt) => opt.id === tagFilter)) {
      setTagFilter('all')
    }
  }, [tagFilter, tagCatalog])

  const rows = React.useMemo(
    () => periodRows.filter((row) => rowMatchesQueueTag(row, tagFilter)),
    [periodRows, tagFilter],
  )
  const queueItems = React.useMemo(() => groupQueueItems(rows), [rows])

  if (exceptions.isLoading) {
    return (
      <ContentCard
        className="space-y-3 p-4"
        data-testid="ecm-exception-queue"
      >
        <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading exception queue…
        </div>
      </ContentCard>
    )
  }

  if (exceptions.isError) {
    return (
      <ContentCard
        className="space-y-3 p-4"
        data-testid="ecm-exception-queue"
      >
        <p className="text-sm text-muted-foreground">
          Exception queue unavailable — apply the ECM exceptions migration and restart the API.
        </p>
      </ContentCard>
    )
  }

  const firstPendingLockId = rows.find(isAreaLockPending)?.id ?? null
  const firstSosItem = queueItems.find(item => item.kind === 'sos')
  const firstSosKey = firstSosItem ? sosGroupKey(firstSosItem.jobId) : null
  const defaultExpandedId = firstSosKey ?? firstPendingLockId

  const showingLabel = periodLabel
    ? `Showing exceptions for ${periodLabel}`
    : 'Showing all open exceptions'

  return (
    <ContentCard className="space-y-3 p-4" data-testid="ecm-exception-queue">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <h3 className="text-base font-semibold text-foreground">
            {serviceUserId ? 'Exceptions for this service user' : 'Exception queue'}
          </h3>
        </div>
        <p className="pl-6 text-sm text-foreground/80">{showingLabel}</p>
        <p className="pl-6 text-xs text-muted-foreground">
          {rows.length}
          {tagFilter !== 'all' || periodRows.length !== rows.length
            ? ` of ${periodRows.length}`
            : ''}{' '}
          open · handle in visit workspace
        </p>
      </header>
      <div className="space-y-2" data-testid="ecm-exception-queue-filters">
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <ListFilter className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Filter by tag
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger
              className={cn(
                'h-8 w-auto min-w-[7.5rem] gap-1 rounded-full px-3 text-xs shadow-none',
                (tagFilter === 'all' || !tagChips.some((c) => c.id === tagFilter)) &&
                  'border-transparent bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
              )}
              data-testid="ecm-exception-queue-tag-select"
            >
              <span>
                {tagFilter === 'all' || tagChips.some((c) => c.id === tagFilter)
                  ? 'All tags'
                  : (tagCatalog.find((o) => o.id === tagFilter)?.label ?? 'All tags')}
                <span className="ml-1.5 tabular-nums opacity-80">
                  {tagFilter === 'all' || tagChips.some((c) => c.id === tagFilter)
                    ? periodRows.length
                    : (tagCatalog.find((o) => o.id === tagFilter)?.count ?? 0)}
                </span>
              </span>
            </SelectTrigger>
            <SelectContent>
              {tagCatalog.map((opt) => (
                <SelectItem key={opt.id} value={opt.id} className="text-xs">
                  {opt.label}
                  <span className="ml-1.5 tabular-nums text-muted-foreground">{opt.count}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {tagChips
            .filter((opt) => opt.id !== 'all')
            .map((opt) => {
              const active = tagFilter === opt.id
              return (
                <Button
                  key={opt.id}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  className="h-8 rounded-full px-3 text-xs"
                  aria-pressed={active}
                  onClick={() => setTagFilter(opt.id)}
                >
                  {opt.label}
                  <span className="ml-1.5 tabular-nums opacity-80">{opt.count}</span>
                </Button>
              )
            })}
        </div>
      </div>
      <div className="grid gap-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {periodRows.length > 0 && tagFilter !== 'all'
              ? 'No open exceptions match this tag. Choose All tags or another filter.'
              : allRows.length > 0 && dateFrom && dateTo
                ? 'No open exceptions in this period. Try This month or a wider custom range.'
                : 'No open ECM exceptions.'}
          </p>
        ) : (
          queueItems.map(item =>
            item.kind === 'sos' ? (
              <CarerSosCard
                key={sosGroupKey(item.jobId)}
                rows={item.rows}
                expanded={
                  expandedId === undefined
                    ? sosGroupKey(item.jobId) === defaultExpandedId
                    : expandedId === sosGroupKey(item.jobId)
                }
                onToggle={() =>
                  setExpandedId(current => {
                    const key = sosGroupKey(item.jobId)
                    const openId = current === undefined ? defaultExpandedId : current
                    return openId === key ? null : key
                  })
                }
                onOpenVisit={onOpenVisit}
              />
            ) : isLeftVisitArea(item.row) ? (
              <LockedVisitAreaCard
                key={item.row.id}
                row={item.row}
                expanded={
                  expandedId === undefined
                    ? item.row.id === defaultExpandedId
                    : expandedId === item.row.id
                }
                onToggle={() =>
                  setExpandedId(current => {
                    const openId = current === undefined ? defaultExpandedId : current
                    return openId === item.row.id ? null : item.row.id
                  })
                }
              />
            ) : (
              <ExceptionVisitCard
                key={item.row.id}
                row={item.row}
                expanded={expandedId === item.row.id}
                onToggle={() =>
                  setExpandedId(current => {
                    const openId = current === undefined ? defaultExpandedId : current
                    return openId === item.row.id ? null : item.row.id
                  })
                }
                onOpenVisit={onOpenVisit}
              />
            ),
          )
        )}
      </div>
    </ContentCard>
  )
}
