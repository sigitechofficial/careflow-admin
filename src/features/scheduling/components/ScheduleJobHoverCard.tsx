import type { ReactNode } from 'react'
import {
  AlertTriangle,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock,
  MapPin,
  Truck,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { TooltipContent } from '@/shared/ui/tooltip'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { timeCriticalLabel } from '@/features/service-users/visit-plan/TimeCriticalDot'
import {
  callPatternTimeRange,
  formatServiceUserAddressLine,
  jobRotaTimeRange,
  resolveVisitPlanSlotForJob,
  rotaRescheduleShift,
  rotaTimingDiffersFromCallPattern,
  visitPlanScheduleSummary,
} from '@/features/scheduling/utils/schedule-job-hover-details.util'
import {
  formatInboundTravelSummary,
  formatOutboundTravelSummary,
  resolveTravelTimingBadge,
} from '@/features/scheduling/utils/schedule-job-hover-travel.util'
import {
  buildInboundVisitTravelDetail,
  buildNextVisitTravelDetail,
  findNextJobInRow,
  findPreviousJobInRow,
} from '@/features/scheduling/utils/schedule-job-travel-distance.util'
import {
  formatDurationLabel,
  jobBlockTone,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { useScheduleJobsDisplayFormat } from '@/features/scheduling/context/schedule-jobs-display-format.context'
import { formatServiceUserBranchLabel } from '@/features/settings/location-management/format-service-user-branch-label'
import {
  activeJobAllocationCount,
  serviceUserNameOnly,
} from '@/features/scheduling/utils/scheduling-format'
import { VisitRefDisplay } from '@/features/scheduling/components/VisitRefDisplay'
import {
  isScheduleJobCancelled,
  isScheduleJobCareNotDelivered,
  isScheduleJobCompleted,
} from '@/features/scheduling/types/schedule-job-context-actions.types'
import { isoToLocalTimeInput } from '@/features/scheduling/utils/schedule-jobs-drag.util'
import {
  assessTimelineJobDelivery,
  boardVisibleDeliveryFlags,
  deliveryFlagChipClass,
  deliveryFlagShortLabel,
} from '@/features/scheduling/utils/schedule-job-delivery-flags.util'
import {
  handleScheduleJobHoverWheel,
} from '@/features/scheduling/utils/schedule-jobs-scroll.util'
import {
  liveOfficeAlertChipIsSentence,
  type LiveOfficeAlert,
} from '@/features/scheduling/utils/schedule-job-live-office-alerts.util'
import {
  timelineJobCheckInMethodLabel,
  timelineJobCheckInMethodTitle,
} from '@/features/scheduling/utils/schedule-job-check-in-method.util'
import { formatOpsHm } from '@/shared/lib/operational-day.util'

type Props = {
  job: TimelineJob
  date: string
  variant?: 'tooltip' | 'appointment' | 'availability'
  visitPlanSlotsByServiceUser?: Map<string, VisitPlanSlot[]>
  acceptedCarePlansByServiceUser?: Map<string, AcceptedCarePlanItem[]>
  rowJobs?: TimelineJob[]
  travelBufferMinutes?: number
  showRowTravelDetails?: boolean
  excessContracted?: boolean
  outsidePattern?: boolean
  overAllocated?: boolean
  isUnassignedRow?: boolean
  liveAlerts?: LiveOfficeAlert[]
}

const HOVER_COLLISION_PADDING = { top: 16, bottom: 16, left: 16, right: 16 } as const

/** Keep the card inside the floating-ui available box (viewport after collision padding). */
const HOVER_PANEL_SIZE_CLASS =
  'w-[min(32rem,calc(var(--radix-tooltip-content-available-width,100vw)-1.5rem))] max-h-[min(40rem,var(--radix-tooltip-content-available-height,calc(100dvh-2rem)))] overflow-x-hidden overflow-y-auto'

type CardStatus =
  | 'booked'
  | 'possibly-available'
  | 'not-available'
  | 'unassigned'
  | 'cancelled'
  | 'completed'
  | 'unableToStart'

type StatusBadgeStyle = {
  label: string
  className: string
}

type TimeBandTone = 'amber' | 'rose' | 'slate' | 'emerald'

const STATUS_BADGE: Record<CardStatus, StatusBadgeStyle> = {
  booked: {
    label: 'Booked',
    className:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
  'possibly-available': {
    label: 'Possibly available',
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  },
  'not-available': {
    label: 'Not available',
    className: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  },
  unassigned: {
    label: 'Unassigned',
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300',
  },
  completed: {
    label: 'Completed',
    className:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
  unableToStart: {
    label: 'Unable to start',
    className: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  },
}

const TIME_BAND_CLASS: Record<TimeBandTone, string> = {
  amber:
    'bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/50 text-amber-800 dark:text-amber-200',
  rose: 'bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/50 text-rose-800 dark:text-rose-200',
  slate:
    'bg-slate-50 dark:bg-zinc-800/40 border-slate-100 dark:border-zinc-800 text-slate-500 dark:text-zinc-400',
  emerald:
    'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-100',
}

function resolveCardStatus(
  job: TimelineJob,
  tone: ReturnType<typeof jobBlockTone>,
  variant: Props['variant'],
  isUnassignedRow?: boolean,
): CardStatus {
  if (isScheduleJobCareNotDelivered(job)) return 'unableToStart'
  if (isScheduleJobCompleted(job)) return 'completed'
  if (isScheduleJobCancelled(job)) return 'cancelled'
  if (isUnassignedRow) return 'unassigned'
  if (variant === 'availability') {
    if (tone === 'green') return 'booked'
    if (tone === 'red') return 'not-available'
    if (tone === 'orange') return 'possibly-available'
  }
  if (tone === 'red') return 'not-available'
  if (tone === 'orange') return 'possibly-available'
  return 'booked'
}

function resolveTimeBandTone(
  status: CardStatus,
  timingChanged: boolean,
  underStaffed: boolean,
): TimeBandTone {
  if (status === 'unableToStart') return 'amber'
  if (status === 'cancelled' || status === 'completed') return 'slate'
  if (status === 'not-available' || status === 'unassigned') return 'rose'
  if (status === 'possibly-available' || timingChanged || underStaffed) return 'amber'
  return 'emerald'
}

function serviceUserInitial(job: TimelineJob): string {
  const name = serviceUserNameOnly(job.serviceUser)
  return name.charAt(0).toUpperCase() || '?'
}

function formatBranchLine(job: TimelineJob): string | null {
  const label = formatServiceUserBranchLabel(job.serviceUser)
  if (!label || label === '—' || label === 'Not assigned') return null
  const lastLayer = label.includes(' · ') ? label.split(' · ').pop()! : label
  return lastLayer.toLowerCase().includes('branch') ? lastLayer : `${lastLayer} branch`
}

function carerNames(job: TimelineJob): string[] {
  return (job.allocations ?? [])
    .filter((allocation) => allocation.employee)
    .map((allocation) => {
      const employee = allocation.employee!
      return [employee.firstName, employee.lastName].filter(Boolean).join(' ')
    })
    .filter(Boolean)
}

function StaffingBadge({
  allocated,
  required,
}: {
  allocated: number
  required: number
}) {
  const full = allocated >= required && required > 0
  const none = allocated === 0

  const className = full
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900/60'
    : none
      ? 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900/60'
      : 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900/60'

  const label = `${allocated} of ${required} carer${required === 1 ? '' : 's'}`

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[13px] font-semibold ring-1',
        className,
      )}
    >
      {full ? <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} /> : null}
      {!full && !none ? <CircleAlert className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> : null}
      {none ? <CircleAlert className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> : null}
      {label}
    </span>
  )
}

function TravelTimingBadge({
  label,
  tone,
}: {
  label: string
  tone: 'rose' | 'amber' | 'emerald'
}) {
  const className =
    tone === 'rose'
      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
      : tone === 'amber'
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'

  return (
    <span className={cn('rounded-md px-2 py-0.5 text-[13px] font-semibold', className)}>
      {label}
    </span>
  )
}

function TravelDetailsSection({
  title,
  badge,
  headline,
  subline,
  defaultOpen = true,
}: {
  title: string
  badge: { label: string; tone: 'rose' | 'amber' | 'emerald' } | null
  headline: string
  subline: string
  defaultOpen?: boolean
}) {
  return (
    <details
      open={defaultOpen}
      className="group border-t border-slate-100 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-800/40 [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-2 px-4 py-3 sm:px-5">
        <span className="text-[13px] font-medium text-slate-600 dark:text-zinc-400 sm:text-sm">
          {title}
        </span>
        <span className="flex items-center gap-2">
          {badge ? <TravelTimingBadge label={badge.label} tone={badge.tone} /> : null}
          <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="-mt-1 space-y-0.5 px-4 pb-3 text-[13px] leading-relaxed text-slate-600 dark:text-zinc-400 sm:px-5 sm:text-sm">
        <p className="text-slate-900 dark:text-zinc-100">{headline}</p>
        <p>{subline}</p>
      </div>
    </details>
  )
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2.5 dark:border-zinc-800 sm:py-3">
      <span className="pt-0.5 text-[13px] font-medium text-slate-600 dark:text-zinc-400 sm:text-sm">
        {label}
      </span>
      <div className="text-right">{children}</div>
    </div>
  )
}

function AlertChip({
  tone,
  children,
}: {
  tone: 'amber' | 'orange'
  children: ReactNode
}) {
  const className =
    tone === 'amber'
      ? 'bg-amber-50 text-amber-800 ring-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60'
      : 'bg-orange-50 text-orange-800 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-900/60'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md py-1 pl-2.5 pr-2 text-[13px] font-medium ring-1',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function JobHoverPanel({
  job,
  date,
  variant = 'tooltip',
  visitPlanSlotsByServiceUser,
  rowJobs,
  travelBufferMinutes = 0,
  showRowTravelDetails = true,
  excessContracted = false,
  outsidePattern = false,
  isUnassignedRow = false,
  liveAlerts = [],
}: Props) {
  const displayFormat = useScheduleJobsDisplayFormat()
  const tone = jobBlockTone(job)
  const completed = isScheduleJobCompleted(job)
  const cancelled = isScheduleJobCancelled(job)
  const status = resolveCardStatus(job, tone, variant, isUnassignedRow)
  const statusBadge = STATUS_BADGE[status]

  const rota = jobRotaTimeRange(job)
  const visitSlot = resolveVisitPlanSlotForJob(job, visitPlanSlotsByServiceUser)
  const callPattern = visitSlot ? callPatternTimeRange(visitSlot) : null
  const timingChanged = visitSlot ? rotaTimingDiffersFromCallPattern(job, visitSlot) : false
  const rescheduleShift =
    timingChanged && callPattern ? rotaRescheduleShift(rota, callPattern) : null

  const allocated = activeJobAllocationCount(job)
  const required = job.requiredCarers
  const underStaffed = !completed && !cancelled && allocated < required
  const carers = carerNames(job)
  const timeBandTone = resolveTimeBandTone(status, timingChanged, underStaffed)

  const formatRangeLabel = (range: { start: string; end: string }) =>
    displayFormat.formatTimeRangeHm(range.start, range.end)

  const timeRangeLabel = formatRangeLabel(rota)
  const durationLabel = formatDurationLabel(rota.durationMinutes)

  const serviceUserNumber = job.serviceUser.serviceUserNumber?.trim()
  const metaLine = [serviceUserNumber, displayFormat.formatDate(date)].filter(Boolean).join(' · ')
  const addressLine = formatServiceUserAddressLine({
    serviceUser: job.serviceUser,
    jobAddress: job.address,
    jobPostcode: job.postcode,
  })
  const branchLine = formatBranchLine(job)

  const nextVisitTravel =
    completed || cancelled || !showRowTravelDetails
      ? null
      : buildNextVisitTravelDetail(job, rowJobs, { bufferMinutes: travelBufferMinutes })

  const inboundVisitTravel =
    completed || cancelled || !showRowTravelDetails
      ? null
      : buildInboundVisitTravelDetail(job, rowJobs, { bufferMinutes: travelBufferMinutes })

  const previousJob = rowJobs?.length ? findPreviousJobInRow(job, rowJobs) : null
  const nextJob = rowJobs?.length ? findNextJobInRow(job, rowJobs) : null

  const inboundSummary =
    inboundVisitTravel && previousJob
      ? formatInboundTravelSummary(
          inboundVisitTravel,
          previousJob,
          displayFormat.formatTimeHm(rota.start),
        )
      : null

  const outboundSummary = nextVisitTravel
    ? formatOutboundTravelSummary(nextVisitTravel, job)
    : null

  const inboundBadge = inboundVisitTravel ? resolveTravelTimingBadge(inboundVisitTravel) : null
  const outboundBadge = nextVisitTravel ? resolveTravelTimingBadge(nextVisitTravel) : null

  const showTravelSections = showRowTravelDetails && !completed && !cancelled

  const inboundTravelContent = !showTravelSections
    ? null
    : inboundSummary
      ? { headline: inboundSummary.headline, subline: inboundSummary.subline, badge: inboundBadge }
      : !previousJob
        ? {
            headline: 'First visit of the day',
            subline: 'No inbound travel on this rota',
            badge: null,
          }
        : {
            headline: `After ${serviceUserNameOnly(previousJob.serviceUser)}`,
            subline: 'Travel time unavailable — missing address coordinates',
            badge: null,
          }

  const outboundTravelContent = !showTravelSections
    ? null
    : outboundSummary
      ? { headline: outboundSummary.headline, subline: outboundSummary.subline, badge: outboundBadge }
      : !nextJob
        ? {
            headline: 'Last visit of the day',
            subline: 'No outbound travel on this rota',
            badge: null,
          }
        : {
            headline: `On to ${serviceUserNameOnly(nextJob.serviceUser)}`,
            subline: 'Travel time unavailable — missing address coordinates',
            badge: null,
          }

  const roundLabel =
    visitSlot?.medicationRoundCode?.trim() || visitSlot?.label?.trim() || null
  const scheduleLabel = visitSlot ? visitPlanScheduleSummary(visitSlot) : null

  const actualStart = job.actualStartDateTime
  const actualEnd = job.actualEndDateTime
  const actualTimeLabel =
    actualStart && actualEnd
      ? displayFormat.formatTimeRangeHm(
          isoToLocalTimeInput(actualStart),
          isoToLocalTimeInput(actualEnd),
        )
      : actualStart
        ? displayFormat.formatTimeHm(isoToLocalTimeInput(actualStart))
        : null

  const deliveryFlags = boardVisibleDeliveryFlags(assessTimelineJobDelivery(job))
  const checkInMethodLabel = timelineJobCheckInMethodLabel(job)
  const checkInMethodTitle = timelineJobCheckInMethodTitle(job)

  const timeCritical = visitSlot?.timeCritical
  const timeCriticalText = timeCritical
    ? timeCriticalLabel(visitSlot.timeToleranceMinutes)
    : null

  const durationPillClass =
    timeBandTone === 'rose'
      ? 'bg-white/80 text-rose-900 ring-rose-200 dark:bg-zinc-900/70 dark:text-rose-200 dark:ring-rose-900/60'
      : timeBandTone === 'slate'
        ? 'bg-white/80 text-slate-600 ring-slate-200 dark:bg-zinc-900/70 dark:text-zinc-300 dark:ring-zinc-700'
        : timeBandTone === 'emerald'
          ? 'bg-white/80 text-emerald-900 ring-emerald-200 dark:bg-zinc-900/70 dark:text-emerald-200 dark:ring-emerald-900/60'
          : 'bg-white/80 text-amber-900 ring-amber-200 dark:bg-zinc-900/70 dark:text-amber-200 dark:ring-amber-900/60'

  const subtitleClass =
    timeBandTone === 'rose'
      ? 'text-rose-700 dark:text-rose-300/90'
      : timeBandTone === 'slate'
        ? 'text-slate-500 dark:text-zinc-400'
        : timeBandTone === 'emerald'
          ? 'text-emerald-700 dark:text-emerald-300/90'
          : 'text-amber-700 dark:text-amber-300/90'

  return (
    <div
      data-schedule-job-hover-scroll=""
      className={cn(
        HOVER_PANEL_SIZE_CLASS,
        'rounded-2xl bg-popover shadow-xl ring-1 ring-black/5 dark:ring-white/10',
        cancelled && 'opacity-90',
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 pb-3 pt-3 dark:border-zinc-800 sm:px-5">
        <div className="flex min-w-0 items-start gap-2.5">
          <div
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold',
              status === 'unableToStart'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                : cancelled || completed
                ? 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400'
                : 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
            )}
          >
            {serviceUserInitial(job)}
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold leading-tight sm:text-lg">
              {serviceUserNameOnly(job.serviceUser)}
            </p>
            <VisitRefDisplay
              visitRef={job.visitRef}
              className="mt-0.5 text-slate-600 dark:text-zinc-300"
            />
            {metaLine ? (
              <p className="text-[13px] font-medium text-slate-500 dark:text-zinc-400">{metaLine}</p>
            ) : null}
            {addressLine || branchLine ? (
              <div className="mt-1.5 space-y-1">
                {addressLine ? (
                  <p className="flex items-start gap-1.5 text-[13px] font-medium text-slate-600 dark:text-zinc-300">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={1.6} />
                    <span>{addressLine}</span>
                  </p>
                ) : null}
                {branchLine ? (
                  <p className="flex items-center gap-1.5 text-[13px] font-medium text-slate-600 dark:text-zinc-300">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={1.5} />
                    <span>{branchLine}</span>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-md px-2.5 py-1 text-[13px] font-semibold',
            statusBadge.className,
          )}
        >
          {statusBadge.label}
        </span>
      </div>

      <div onWheel={handleScheduleJobHoverWheel}>
        <div className={cn('border-b px-4 py-3 sm:px-5', TIME_BAND_CLASS[timeBandTone])}>
          {isUnassignedRow && !cancelled && !completed ? (
            <p className={cn('text-[13px] font-medium opacity-80', subtitleClass)}>
              Planned time · not on a rota yet
            </p>
          ) : null}
          {completed && actualTimeLabel ? (
            <p className={cn('text-[13px] font-medium', subtitleClass)}>Actual visit time</p>
          ) : null}
          <div className={cn('flex flex-wrap items-center gap-2', isUnassignedRow ? 'mt-0.5' : undefined)}>
            <span
              className={cn(
                'text-lg font-semibold leading-tight sm:text-xl',
                cancelled && 'line-through decoration-slate-400',
              )}
            >
              {completed && actualTimeLabel ? actualTimeLabel : timeRangeLabel}
            </span>
            <span
              className={cn(
                'inline-flex items-center rounded-md px-2 py-0.5 text-[13px] font-semibold ring-1',
                durationPillClass,
              )}
            >
              {durationLabel}
            </span>
            {timeCritical && timeCriticalText && !cancelled && !completed ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[13px] font-semibold text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900/60">
                <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                Time critical · {timeCriticalText}
              </span>
            ) : null}
          </div>
          {timingChanged && callPattern && !cancelled && !completed ? (
            <p className={cn('mt-1 text-[13px] font-medium sm:text-sm', subtitleClass)}>
              Rescheduled · moved ~{rescheduleShift?.label ?? 'some time'} {rescheduleShift?.direction ?? 'from'}{' '}
              call pattern{' '}
              <span className="line-through">{formatRangeLabel(callPattern)}</span>
            </p>
          ) : null}
          {underStaffed && !timingChanged && !cancelled && !completed ? (
            <p className={cn('mt-1 text-[13px] font-medium sm:text-sm', subtitleClass)}>
              Needs {required} carer{required === 1 ? '' : 's'} — only {allocated}{' '}
              {allocated === 1 ? 'is' : 'are'} assigned
            </p>
          ) : null}
          {status === 'possibly-available' && !cancelled && !completed ? (
            <p className={cn('mt-1 text-[13px] font-medium italic sm:text-sm', subtitleClass)}>
              Carer availability not yet confirmed
            </p>
          ) : null}
          {cancelled ? (
            <p className={cn('mt-1 text-[13px] font-medium sm:text-sm', subtitleClass)}>
              {underStaffed
                ? `Was unstaffed — needed ${required} carer${required === 1 ? '' : 's'}`
                : 'Visit cancelled on rota'}
            </p>
          ) : null}
          {liveAlerts.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5" data-testid="schedule-job-hover-live-alerts">
              {liveAlerts.map((alert) => (
                <span
                  key={alert.kind}
                  className={cn(
                    'inline-flex items-center text-[11px]',
                    liveOfficeAlertChipIsSentence(alert)
                      ? 'font-bold'
                      : cn('rounded-md px-2 py-0.5 font-semibold', alert.chipClass),
                  )}
                >
                  {alert.label}
                  {alert.hint ? ` · ${alert.hint}` : ''}
                  {alert.sentAt ? ` · ${formatOpsHm(alert.sentAt)}` : ''}
                  {alert.hasGps === false ? ' · No GPS' : alert.hasGps ? ' · GPS' : ''}
                </span>
              ))}
              {liveAlerts.some((alert) => alert.message) ? (
                <p className="w-full text-[12px] font-medium text-foreground">
                  {liveAlerts.find((alert) => alert.message)?.message}
                </p>
              ) : null}
            </div>
          ) : null}
          {deliveryFlags.length > 0 || checkInMethodLabel ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {checkInMethodLabel ? (
                <span
                  title={checkInMethodTitle ?? undefined}
                  className="inline-flex items-center rounded-md bg-orange-700 px-2 py-0.5 text-[11px] font-semibold text-white"
                >
                  Clock-in · {checkInMethodLabel}
                </span>
              ) : null}
              {deliveryFlags.map((flag) => (
                <span
                  key={flag.code}
                  title={flag.detail ?? flag.label}
                  className={cn(
                    'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold',
                    deliveryFlagChipClass(flag.severity),
                  )}
                >
                  {deliveryFlagShortLabel(flag)}
                  {flag.detail ? (
                    <span className="ml-1 font-normal opacity-90">· {flag.detail}</span>
                  ) : null}
                </span>
              ))}
            </div>
          ) : null}
          {job.careNotDelivered?.reasonCode || job.careNotDelivered?.reasonLabel ? (
            <p
              className={cn('mt-1.5 text-[13px] font-medium sm:text-sm', subtitleClass)}
              title={job.careNotDelivered.notes ?? undefined}
            >
              Care could not be delivered
              {job.careNotDelivered.reasonLabel || job.careNotDelivered.reasonCode
                ? ` · ${
                    job.careNotDelivered.reasonLabel ??
                    job.careNotDelivered.reasonCode?.replace(/_/g, ' ')
                  }`
                : null}
            </p>
          ) : null}
        </div>

        {!cancelled && (excessContracted || outsidePattern) ? (
          <div className="flex flex-wrap gap-2 px-4 pt-3 sm:px-5">
            {excessContracted ? (
              <AlertChip tone="amber">
                <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.7} />
                Exceeds contracted hours
                <span className="text-amber-600/80 dark:text-amber-400/80">· Manage carers</span>
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.7} />
              </AlertChip>
            ) : null}
            {outsidePattern ? (
              <AlertChip tone="orange">
                <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.7} />
                Outside carer working pattern
              </AlertChip>
            ) : null}
          </div>
        ) : null}

        {!cancelled ? (
          <div className="px-4 sm:px-5">
            <InfoRow label="Staffing">
              <StaffingBadge allocated={allocated} required={required} />
              {carers.length > 0 ? (
                <div className="mt-1 space-y-0.5">
                  {carers.map((name) => (
                    <p key={name} className="text-[15px] font-medium sm:text-base">
                      {name}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-[13px] font-medium text-rose-600 dark:text-rose-400">
                  Not yet assigned
                </p>
              )}
              {underStaffed && allocated > 0 ? (
                <p className="text-[13px] font-medium text-amber-700 dark:text-amber-400">
                  + {required - allocated} still needed
                </p>
              ) : null}
            </InfoRow>
            {roundLabel ? (
              <InfoRow label="Round">
                <span className="text-[15px] font-medium sm:text-base">{roundLabel}</span>
              </InfoRow>
            ) : null}
            {scheduleLabel ? (
              <div className="flex items-baseline justify-between gap-3 py-2.5 sm:py-3">
                <span className="text-[13px] font-medium text-slate-600 dark:text-zinc-400 sm:text-sm">
                  Schedule
                </span>
                <span className="text-[15px] font-medium sm:text-base">{scheduleLabel}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {inboundTravelContent ? (
          <TravelDetailsSection
            title="Travel from previous"
            badge={inboundTravelContent.badge}
            headline={inboundTravelContent.headline}
            subline={inboundTravelContent.subline}
          />
        ) : null}

        {outboundTravelContent ? (
          <TravelDetailsSection
            title="Travel to next"
            badge={outboundTravelContent.badge}
            headline={outboundTravelContent.headline}
            subline={outboundTravelContent.subline}
          />
        ) : null}
      </div>
    </div>
  )
}

export function ScheduleJobHoverTooltip(props: Props) {
  return (
    <TooltipContent
      side="top"
      align="center"
      sideOffset={10}
      avoidCollisions
      sticky="always"
      collisionPadding={HOVER_COLLISION_PADDING}
      className="z-[100] max-w-none overflow-visible border-0 bg-transparent p-0 shadow-none"
      onWheel={handleScheduleJobHoverWheel}
    >
      <JobHoverPanel {...props} />
    </TooltipContent>
  )
}

export function ScheduleRotaGapHoverTooltip({
  timeRangeLabel,
  durationLabel,
  title,
}: {
  timeRangeLabel: string
  durationLabel: string
  title: string
}) {
  return (
    <TooltipContent side="top" className="max-w-xs rounded-xl px-4 py-3 ring-1 ring-black/5 dark:ring-white/10">
      <div className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500 dark:text-zinc-400">
        <Truck className="h-4 w-4" strokeWidth={1.5} />
        Travel time
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="text-base font-semibold leading-tight sm:text-lg">{timeRangeLabel}</span>
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[13px] font-semibold text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">
          {durationLabel}
        </span>
      </div>
      <p className="mt-0.5 text-[13px] font-medium text-slate-600 dark:text-zinc-300 sm:text-sm">{title}</p>
    </TooltipContent>
  )
}
