import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  HelpCircle,
  History,
  ListChecks,
  Loader2,
  LogIn,
  LogOut,
  Moon,
  Phone,
  Scale,
  ScrollText,
  ShieldAlert,
  Sunrise,
  Sun,
  Timer,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { EcmStatusBadge } from '@/features/ecm/components/EcmStatusBadge'
import { EcmScheduleHistoryPanel } from '@/features/ecm/components/EcmScheduleHistoryPanel'
import { EcmAuditTrailPanel } from '@/features/ecm/components/EcmAuditTrailPanel'
import { EcmNotificationEvidenceForm } from '@/features/ecm/components/EcmOpsActions'
import { useEcmNotifications, useEcmVisitDetail } from '@/features/ecm/hooks/useEcm'

function visitTypeLabel(jobName: string, serviceUserName: string): string {
  const raw = (jobName ?? '').trim()
  if (!raw) return 'Visit'

  const emDashParts = raw.split(/\s+[—–-]\s+/).map(p => p.trim()).filter(Boolean)
  const slotPart = emDashParts[0]
  if (emDashParts.length >= 2 && slotPart) {
    const suffix = emDashParts.slice(1).join(' — ')
    const su = serviceUserName.trim().toLowerCase()
    const first = su.split(/\s+/)[0] ?? ''
    const suffixLower = suffix.toLowerCase()
    if (
      !suffix ||
      suffixLower === su ||
      suffixLower === first ||
      su.includes(suffixLower)
    ) {
      return /visit$/i.test(slotPart) ? slotPart : `${slotPart} visit`
    }
    return `${slotPart} visit`
  }

  const tokens = raw.split(/\s+/)
  const first = serviceUserName.trim().split(/\s+/)[0]
  const lastToken = tokens[tokens.length - 1]
  if (first && tokens.length >= 2 && lastToken && lastToken.toLowerCase() === first.toLowerCase()) {
    const slot = tokens.slice(0, -1).join(' ')
    return /visit$/i.test(slot) ? slot : `${slot} visit`
  }

  return raw
}

function visitTypeIcon(visitType: string): LucideIcon {
  const t = visitType.toLowerCase()
  if (t.includes('evening') || t.includes('night') || t.includes('bed')) return Moon
  if (t.includes('morning') || t.includes('breakfast')) return Sunrise
  if (t.includes('lunch') || t.includes('midday') || t.includes('noon')) return Sun
  return CalendarDays
}

function formatThresholdsHelper(input: {
  levelLabel: string | null
  thresholdRuleVersion: string | null | undefined
  lateArrivalToleranceMinutes?: number | null
}): string | null {
  const level = input.levelLabel?.trim() || null
  const version = input.thresholdRuleVersion?.trim() || null
  const lateFromSettings =
    typeof input.lateArrivalToleranceMinutes === 'number' &&
    Number.isFinite(input.lateArrivalToleranceMinutes)
      ? input.lateArrivalToleranceMinutes
      : null

  const lateFromVersion = (() => {
    if (!version) return null
    const m = version.match(/(?:^|-)late-(\d+)\b/i) ?? version.match(/^org-late-(\d+)$/i)
    return m ? Number(m[1]) : null
  })()

  const lateMins = lateFromSettings ?? lateFromVersion
  const lateBit =
    lateMins != null && Number.isFinite(lateMins) ? `late after ${lateMins} min` : null

  // Fall back to a cleaned version string if we can't interpret it.
  const versionBit =
    !lateBit && version
      ? version
          .replace(/^platform-v/i, 'platform v')
          .replace(/^lookup-v/i, 'lookup v')
          .replace(/-/g, ' ')
      : null

  const detail = lateBit ?? versionBit
  if (!level && !detail) return null
  if (level && detail) return `Thresholds: ${level} · ${detail}`
  if (level) return `Thresholds: ${level}`
  return `Thresholds: ${detail}`
}

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

function formatTimeOnly(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatLocalVisitDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—'
  const day = isoDate.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return isoDate
  try {
    return new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return day
  }
}

function formatVariance(mins: number | null | undefined): string {
  if (mins == null) return '—'
  return mins > 0 ? `+${mins} min` : `${mins} min`
}

const LEVEL_LABEL: Record<string, string> = {
  PLATFORM: 'Platform',
  ORGANISATION: 'Organisation',
  BRANCH: 'Branch',
  CONTRACT: 'Contract',
  SERVICE_USER: 'Service user',
  VISIT_TEMPLATE: 'Visit template',
  VISIT: 'Visit override',
}

function situationSummary(input: {
  missedClassification: string
  arrivalClassification: string
  confidence: string
  hasCheckIn: boolean
}): string {
  const missed = input.missedClassification?.toUpperCase() ?? ''
  const arrival = input.arrivalClassification?.toUpperCase() ?? ''

  if (missed === 'POTENTIAL_MISSED') {
    return input.hasCheckIn
      ? 'Possible missed visit — attendance needs confirmation'
      : 'Possible missed visit — no verified check-in'
  }
  if (missed === 'CONFIRMED_MISSED') return 'Missed visit confirmed'
  if (missed === 'FALSE_ECM_ALERT') return 'Marked as a false ECM alert'
  if (missed === 'DISPUTED') return 'Attendance outcome is disputed'
  if (missed === 'ATTENDANCE_VERIFICATION_PENDING') {
    return 'Attendance verification still in progress'
  }
  if (arrival.includes('VERY_LATE')) return 'Carer arrived very late'
  if (arrival.includes('LATE')) return 'Carer arrived late'
  if (arrival.includes('EARLY')) return 'Carer arrived early'
  if (!input.hasCheckIn) return 'No check-in recorded yet'
  if (input.confidence?.toUpperCase() === 'UNVERIFIED') {
    return 'Visit attended, but attendance is still unverified'
  }
  return 'Visit attendance looks within expected thresholds'
}

function situationIcon(missed: string, arrival: string, hasCheckIn: boolean): LucideIcon {
  const m = missed?.toUpperCase() ?? ''
  if (m === 'POTENTIAL_MISSED' || m === 'CONFIRMED_MISSED') return AlertTriangle
  if (m === 'FALSE_ECM_ALERT') return CheckCircle2
  if (m === 'DISPUTED') return Scale
  if (m === 'ATTENDANCE_VERIFICATION_PENDING') return HelpCircle
  if (!hasCheckIn) return ShieldAlert
  if (arrival?.toUpperCase().includes('LATE')) return Clock3
  return CheckCircle2
}

function primaryProblemCode(missed: string, arrival: string): string {
  const m = missed?.toUpperCase() ?? ''
  if (
    m === 'POTENTIAL_MISSED' ||
    m === 'CONFIRMED_MISSED' ||
    m === 'FALSE_ECM_ALERT' ||
    m === 'DISPUTED' ||
    m === 'ATTENDANCE_VERIFICATION_PENDING'
  ) {
    return missed
  }
  if (arrival && arrival !== 'ON_TIME' && arrival !== 'NOT_ASSESSED') return arrival
  return missed || arrival || 'NOT_ASSESSED'
}

function EvidenceDetails({
  title,
  icon: Icon,
  count,
  defaultOpen = false,
  children,
}: {
  title: string
  icon: LucideIcon
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(defaultOpen)

  React.useEffect(() => {
    if (defaultOpen) setOpen(true)
  }, [defaultOpen])

  return (
    <details
      className="group rounded-lg border border-border bg-card open:bg-card"
      open={open}
      onToggle={e => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1">
          {title}
          {typeof count === 'number' ? (
            <span className="ml-1.5 font-normal text-muted-foreground">({count})</span>
          ) : null}
        </span>
      </summary>
      <div className="space-y-3 border-t border-border px-3 py-3">{children}</div>
    </details>
  )
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: LucideIcon
  children: React.ReactNode
}) {
  return (
    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      {children}
    </p>
  )
}

export function EcmVisitDetailPanel({ jobId }: { jobId: string }) {
  const navigate = useNavigate()
  const detailQuery = useEcmVisitDetail(jobId)
  const notificationsQuery = useEcmNotifications(jobId)

  React.useEffect(() => {
    void detailQuery.refetch()
    void notificationsQuery.refetch()
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void detailQuery.refetch()
        void notificationsQuery.refetch()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on mount / visibility only
  }, [jobId])

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
  const hasCheckIn = Boolean(e.actual.checkInAt)
  const situation = situationSummary({
    missedClassification: e.missedClassification,
    arrivalClassification: e.timing.arrivalClassification,
    confidence: e.confidence,
    hasCheckIn,
  })
  const SituationIcon = situationIcon(
    e.missedClassification,
    e.timing.arrivalClassification,
    hasCheckIn,
  )
  const problemCode = primaryProblemCode(e.missedClassification, e.timing.arrivalClassification)
  const problemKind: 'missed' | 'arrival' =
    problemCode === e.missedClassification ||
    [
      'POTENTIAL_MISSED',
      'CONFIRMED_MISSED',
      'FALSE_ECM_ALERT',
      'DISPUTED',
      'ATTENDANCE_VERIFICATION_PENDING',
    ].includes((problemCode ?? '').toUpperCase())
      ? 'missed'
      : 'arrival'
  const ruleLevel = e.appliedSettings.level
    ? (LEVEL_LABEL[e.appliedSettings.level] ?? e.appliedSettings.level)
    : null
  const notificationCount = notificationsQuery.data?.length ?? 0
  const openNotificationsByDefault = notificationCount > 0
  const scheduleHistory = d.scheduleHistory
  const versions = scheduleHistory?.versions ?? []
  const originalSchedule =
    (scheduleHistory?.original && 'plannedStartDateTime' in scheduleHistory.original
      ? scheduleHistory.original
      : null) ??
    versions.find(v => v.isOriginal) ??
    versions[0] ??
    null
  const currentSchedule =
    (scheduleHistory?.current && 'plannedStartDateTime' in scheduleHistory.current
      ? scheduleHistory.current
      : null) ??
    (versions.length ? versions[versions.length - 1] : null)
  const hasScheduleHistory = Boolean(originalSchedule && currentSchedule)
  const scheduleChanged = Boolean(
    hasScheduleHistory &&
      (String(originalSchedule!.plannedStartDateTime) !==
        String(currentSchedule!.plannedStartDateTime) ||
        String(originalSchedule!.plannedEndDateTime ?? '') !==
          String(currentSchedule!.plannedEndDateTime ?? '') ||
        currentSchedule!.isOriginal === false),
  )

  const currentStart = e.planned.start || currentSchedule?.plannedStartDateTime
  const currentEnd = e.planned.end || currentSchedule?.plannedEndDateTime

  const thresholdsHelper = formatThresholdsHelper({
    levelLabel: ruleLevel,
    thresholdRuleVersion: e.appliedSettings.thresholdRuleVersion,
    lateArrivalToleranceMinutes: e.appliedSettings.lateArrivalToleranceMinutes,
  })

  const visitType = visitTypeLabel(d.jobName, d.serviceUser.name)
  const VisitIcon = visitTypeIcon(visitType)
  const carers = d.allocatedCarers
  const jobCompleted =
    d.jobStatus === 'COMPLETED' ||
    d.jobStatus === 'PARTIALLY_COMPLETED' ||
    d.visit?.status === 'COMPLETED' ||
    d.visit?.status === 'PARTIALLY_COMPLETED'
  const scheduleDate = (e.planned.localVisitDate || '').slice(0, 10)

  const openVisitOutcome = () => {
    void navigate({
      to: '/scheduling/schedule-jobs',
      search: {
        date: scheduleDate || undefined,
        visitAction: 'complete',
        actionJobId: jobId,
      },
    })
  }

  const openVisitWorkspace = () => {
    void navigate({
      to: '/scheduling/schedule-jobs',
      search: {
        date: scheduleDate || undefined,
        visitAction: 'workspace',
        actionJobId: jobId,
        visitTab: 'overview',
      },
    })
  }

  return (
    <div className="space-y-5" data-testid="ecm-visit-detail">
      {/* 1. Header */}
      <header className="space-y-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
          <h3 className="truncate text-lg font-semibold text-foreground">{d.serviceUser.name}</h3>
          <span className="text-muted-foreground" aria-hidden>
            ·
          </span>
          <p className="inline-flex min-w-0 items-center gap-1.5 truncate text-lg font-semibold text-foreground">
            <VisitIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            {visitType}
          </p>
        </div>

        {hasScheduleHistory ? (
          <p
            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-semibold tracking-tight text-foreground"
            data-testid="ecm-header-schedule"
          >
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span>{formatLocalVisitDate(e.planned.localVisitDate)}</span>
            <span className="font-normal text-muted-foreground" aria-hidden>
              ·
            </span>
            <Clock3 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span>
              <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Current
              </span>
              <span className="tabular-nums">
                {formatTimeOnly(currentStart)}
                {currentEnd ? ` – ${formatTimeOnly(currentEnd)}` : ''}
              </span>
            </span>
            <span className="font-normal text-muted-foreground" aria-hidden>
              ·
            </span>
            <span className="font-medium text-muted-foreground">
              <span className="mr-1 text-xs font-semibold uppercase tracking-wide">
                Original
              </span>
              <span
                className={cn(
                  'tabular-nums',
                  scheduleChanged && 'line-through decoration-muted-foreground/60',
                )}
              >
                {formatTimeOnly(originalSchedule!.plannedStartDateTime)}
                {originalSchedule!.plannedEndDateTime
                  ? ` – ${formatTimeOnly(originalSchedule!.plannedEndDateTime)}`
                  : ''}
              </span>
            </span>
            {scheduleChanged && currentSchedule?.changeClass ? (
              <EcmStatusBadge code={currentSchedule.changeClass} kind="generic" />
            ) : null}
          </p>
        ) : (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-semibold tracking-tight text-foreground">
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span>{formatLocalVisitDate(e.planned.localVisitDate)}</span>
            <span className="font-normal text-muted-foreground" aria-hidden>
              ·
            </span>
            <Clock3 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="tabular-nums">
              {formatTimeOnly(e.planned.start)}
              {e.planned.end ? ` – ${formatTimeOnly(e.planned.end)}` : ''}
            </span>
            {e.planned.durationMinutes != null ? (
              <span className="text-sm font-normal text-muted-foreground">
                · {e.planned.durationMinutes} min
              </span>
            ) : null}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="text-sm font-semibold text-muted-foreground">Carers</span>
          <span className="text-muted-foreground" aria-hidden>
            ·
          </span>
          {carers.length === 0 ? (
            <span className="text-sm font-medium text-muted-foreground">No carers allocated</span>
          ) : (
            carers.map((c, i) => (
              <span key={c.allocationId || c.employeeId} className="text-sm font-medium text-foreground">
                {i > 0 ? <span className="mr-2 text-muted-foreground">·</span> : null}
                {c.name || c.employeeId}
                {c.isLeadCarer ? (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">(lead)</span>
                ) : null}
              </span>
            ))
          )}
        </div>
      </header>

      {/* 2. Situation */}
      <section className="rounded-lg border border-border bg-muted/20 p-3.5">
        <div className="flex items-start gap-2.5">
          <SituationIcon
            className="mt-0.5 h-5 w-5 shrink-0 text-orange-600 dark:text-orange-400"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold leading-snug text-foreground">{situation}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <EcmStatusBadge code={problemCode} kind={problemKind} />
              <EcmStatusBadge code={e.confidence} kind="confidence" />
            </div>
            {thresholdsHelper ? (
              <p
                className="mt-2 text-xs text-muted-foreground"
                title={
                  e.appliedSettings.thresholdRuleVersion
                    ? `Rule version: ${e.appliedSettings.thresholdRuleVersion}`
                    : undefined
                }
              >
                {thresholdsHelper}
              </p>
            ) : null}
            {e.operationalExceptionCodes.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {e.operationalExceptionCodes.map(code => (
                  <EcmStatusBadge key={code} code={code} kind="generic" />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* 3. Primary action — visit workspace owns happened / missed / times */}
      <section className="space-y-3 rounded-lg border border-border bg-card p-3.5">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-foreground">
              {jobCompleted ? 'Visit outcome recorded' : 'Fix this in visit workspace'}
            </h4>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {jobCompleted
                ? 'Scheduling already has an outcome. Change it there if times or care delivered need correcting — ECM refreshes after save.'
                : 'Record whether the visit happened or was missed, with times and care delivered. Monitoring follows that outcome after save.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={openVisitOutcome}>
            <ExternalLink className="mr-2 h-3.5 w-3.5" />
            {jobCompleted ? 'Change visit outcome' : 'Record visit outcome'}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={openVisitWorkspace}>
            Open visit workspace
          </Button>
        </div>
      </section>

      {jobCompleted && e.missedClassification === 'POTENTIAL_MISSED' ? (
        <p className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">
          Visit is completed in scheduling but monitoring still shows a potential miss. Close this
          dialog and reopen after a moment, or wait for ECM to catch up after the outcome save.
        </p>
      ) : null}

      {/* 4. Actual attendance */}
      <section className="space-y-3 rounded-lg border border-border p-3.5">
        <SectionTitle icon={ListChecks}>Actual attendance</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-muted/30 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <LogIn className="h-3.5 w-3.5" aria-hidden />
              Check-in
            </p>
            <p
              className={cn(
                'mt-1 text-sm font-semibold tabular-nums',
                !hasCheckIn && 'font-medium text-muted-foreground',
              )}
            >
              {formatWhen(e.actual.checkInAt)}
            </p>
          </div>
          <div className="rounded-md bg-muted/30 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Check-out
            </p>
            <p
              className={cn(
                'mt-1 text-sm font-semibold tabular-nums',
                !e.actual.checkOutAt && 'font-medium text-muted-foreground',
              )}
            >
              {formatWhen(e.actual.checkOutAt)}
            </p>
          </div>
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <Timer className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            {e.actual.durationMinutes != null
              ? `${e.actual.durationMinutes} min on site`
              : 'No duration yet'}
          </span>
          <span aria-hidden>·</span>
          <span>
            Arrival window {formatTimeOnly(e.planned.earliestPermittedStart)} –{' '}
            {formatTimeOnly(e.planned.latestPermittedStart)}
          </span>
        </p>
      </section>

      {/* 5. Timing breakdown */}
      <EvidenceDetails title="Timing breakdown" icon={Timer}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Start variance</p>
            <p className="mt-1 text-sm font-semibold">{formatVariance(e.timing.startVarianceMinutes)}</p>
            <EcmStatusBadge code={e.timing.arrivalClassification} kind="arrival" className="mt-1.5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">End variance</p>
            <p className="mt-1 text-sm font-semibold">{formatVariance(e.timing.endVarianceMinutes)}</p>
            <EcmStatusBadge
              code={e.timing.departureClassification}
              kind="arrival"
              className="mt-1.5"
            />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Duration variance</p>
            <p className="mt-1 text-sm font-semibold">
              {formatVariance(e.timing.durationVarianceMinutes)}
            </p>
            <EcmStatusBadge
              code={e.timing.durationClassification}
              kind="arrival"
              className="mt-1.5"
            />
          </div>
        </div>
        {e.timing.summary ? (
          <p className="text-sm text-muted-foreground">{e.timing.summary}</p>
        ) : null}
      </EvidenceDetails>

      {/* 6. Evidence */}
      <div className="space-y-2">
        {scheduleChanged || versions.length > 1 ? (
          <EvidenceDetails
            title="Schedule history"
            icon={History}
            count={versions.length}
            defaultOpen={scheduleChanged}
          >
            <EcmScheduleHistoryPanel history={d.scheduleHistory} versionsOnly />
          </EvidenceDetails>
        ) : null}

        <EvidenceDetails
          title="Notification evidence"
          icon={Phone}
          count={notificationCount}
          defaultOpen={openNotificationsByDefault}
        >
          <EcmNotificationEvidenceForm jobId={jobId} />
        </EvidenceDetails>

        <EvidenceDetails title="Audit trail" icon={ScrollText}>
          <EcmAuditTrailPanel jobId={jobId} />
        </EvidenceDetails>

        <EvidenceDetails
          title="Attendance events"
          icon={ListChecks}
          count={d.attendanceEvents.length}
        >
          {d.attendanceEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No check-in/out events recorded.</p>
          ) : (
            <ul className="space-y-2">
              {d.attendanceEvents.map(ev => (
                <li
                  key={ev.id}
                  className="rounded-md border border-border bg-muted/30 px-3 py-2.5 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{ev.eventType}</span>
                    <span className="text-muted-foreground">{ev.verificationMethod}</span>
                    <span className="tabular-nums">{formatWhen(ev.occurredAt)}</span>
                  </div>
                  {(ev.outsideGeofence || ev.isMockLocation) && (
                    <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">
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
        </EvidenceDetails>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock3 className="h-3.5 w-3.5" aria-hidden />
        Last evaluated {formatWhen(e.evaluatedAt)}
      </p>
    </div>
  )
}
