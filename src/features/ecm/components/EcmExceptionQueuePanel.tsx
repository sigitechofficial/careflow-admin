import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Loader2,
  Lock,
  MapPinOff,
  Radio,
  Users,
} from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { ContentCard } from '@/shared/ui/content-section'
import { FormField, Textarea } from '@/shared/ui/form-field'
import { cn } from '@/shared/lib/utils'
import { EcmStatusBadge } from '@/features/ecm/components/EcmStatusBadge'
import { useAllowVisitContinue, useEcmExceptions } from '@/features/ecm/hooks/useEcm'
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

function isLeftVisitArea(row: EcmExceptionRow): boolean {
  return row.kind === 'LEFT_VISIT_AREA'
}

function isAreaLockPending(row: EcmExceptionRow): boolean {
  return isLeftVisitArea(row) && row.areaLock?.status !== 'ALLOWED'
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

  const allRows = exceptions.data ?? []
  const rows = React.useMemo(() => {
    const filtered =
      dateFrom && dateTo
        ? allRows.filter((row) =>
            isDayInPeriod(exceptionPlannedDayKey(row), dateFrom, dateTo),
          )
        : allRows
    return [...filtered].sort((a, b) => {
      const aLock = isAreaLockPending(a) ? 0 : isLeftVisitArea(a) ? 1 : 2
      const bLock = isAreaLockPending(b) ? 0 : isLeftVisitArea(b) ? 1 : 2
      return aLock - bLock
    })
  }, [allRows, dateFrom, dateTo])

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
          {rows.length} open · handle in visit workspace
        </p>
      </header>
      <div className="grid gap-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {allRows.length > 0 && dateFrom && dateTo
              ? 'No open exceptions in this period. Try This month or a wider custom range.'
              : 'No open ECM exceptions.'}
          </p>
        ) : (
          rows.map(row =>
            isLeftVisitArea(row) ? (
              <LockedVisitAreaCard
                key={row.id}
                row={row}
                expanded={
                  expandedId === undefined
                    ? row.id === firstPendingLockId
                    : expandedId === row.id
                }
                onToggle={() =>
                  setExpandedId(current => {
                    const openId = current === undefined ? firstPendingLockId : current
                    return openId === row.id ? null : row.id
                  })
                }
              />
            ) : (
              <ExceptionVisitCard
                key={row.id}
                row={row}
                expanded={expandedId === row.id}
                onToggle={() =>
                  setExpandedId(current => {
                    const openId = current === undefined ? firstPendingLockId : current
                    return openId === row.id ? null : row.id
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
