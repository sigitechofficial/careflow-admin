import type { ReactNode } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { TooltipContent } from '@/shared/ui/tooltip'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { timeCriticalLabel } from '@/features/service-users/visit-plan/TimeCriticalDot'
import {
  callPatternTimeRange,
  carePlansForJobHover,
  formatJobTimeRangeLabel,
  jobRotaTimeRange,
  resolveVisitPlanSlotForJob,
  rotaTimingDiffersFromCallPattern,
  visitPlanScheduleSummary,
} from '@/features/scheduling/utils/schedule-job-hover-details.util'
import { buildNextVisitTravelDetail } from '@/features/scheduling/utils/schedule-job-travel-distance.util'
import {
  formatDurationLabel,
  formatScheduleJobsDateLabel,
  jobBlockTone,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import {
  activeJobAllocationCount,
  employeesLabel,
  jobStatusLabel,
  leadCarerAllocation,
  serviceUserLabel,
} from '@/features/scheduling/utils/scheduling-format'
import { isScheduleJobCompleted } from '@/features/scheduling/types/schedule-job-context-actions.types'
import { isoToLocalTimeInput } from '@/features/scheduling/utils/schedule-jobs-drag.util'
import {
  handleScheduleJobHoverWheel,
  SCHEDULE_JOB_HOVER_SCROLL_ATTR,
} from '@/features/scheduling/utils/schedule-jobs-scroll.util'

type Props = {
  job: TimelineJob
  date: string
  variant?: 'tooltip' | 'appointment' | 'availability'
  visitPlanSlotsByServiceUser?: Map<string, VisitPlanSlot[]>
  acceptedCarePlansByServiceUser?: Map<string, AcceptedCarePlanItem[]>
  rowJobs?: TimelineJob[]
  travelBufferMinutes?: number
}

const HOVER_COLLISION_PADDING = { top: 64, bottom: 48, left: 24, right: 24 } as const

const TONE_HEADER: Record<ReturnType<typeof jobBlockTone>, string> = {
  completed: 'Visit completed',
  green: 'Appointment',
  orange: 'Possibly Available',
  red: 'Not Available',
  neutral: 'Scheduled job',
}

const TONE_HEADER_CLASS: Record<ReturnType<typeof jobBlockTone>, string> = {
  completed: 'bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-800',
  green: 'text-[#2d7a32]',
  orange: 'text-[#c47a1a]',
  red: 'text-red-600',
  neutral: 'text-slate-700',
}

type DetailField = {
  label: string
  value: string
  valueClassName?: string
  emphasis?: boolean
}

function DetailRow({ label, value, valueClassName, emphasis, compact }: DetailField & { compact?: boolean }) {
  return (
    <div
      className={cn(
        'grid items-baseline gap-x-3 gap-y-0.5 py-1',
        compact ? 'grid-cols-[4.5rem_minmax(0,1fr)]' : 'grid-cols-[5.5rem_minmax(0,1fr)]',
      )}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          'text-sm leading-snug text-foreground break-words',
          emphasis ? 'font-semibold' : 'font-medium',
          valueClassName,
        )}
      >
        {value}
      </span>
    </div>
  )
}

function DetailGrid({ fields, compact }: { fields: DetailField[]; compact?: boolean }) {
  if (fields.length === 0) return null
  return (
    <div className="divide-y divide-border/50">
      {fields.map((field, index) => (
        <DetailRow key={`${field.label}-${index}`} {...field} compact={compact} />
      ))}
    </div>
  )
}

function SectionCard({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-lg border border-border/70 bg-muted/20 px-3.5 py-3', className)}>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      {children}
    </section>
  )
}

function AlertBox({
  tone,
  title,
  children,
}: {
  tone: 'amber' | 'orange'
  title: string
  children: ReactNode
}) {
  const styles =
    tone === 'amber'
      ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100'
      : 'border-orange-300 bg-orange-50 text-orange-950 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-100'

  return (
    <div className={cn('rounded-lg border px-3.5 py-3', styles)}>
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-2 text-sm leading-relaxed">{children}</div>
    </div>
  )
}

export function JobHoverPanel({
  job,
  date,
  variant = 'tooltip',
  visitPlanSlotsByServiceUser,
  acceptedCarePlansByServiceUser,
  rowJobs,
  travelBufferMinutes = 0,
}: Props) {
  const tone = jobBlockTone(job)
  const completed = isScheduleJobCompleted(job)
  const header = completed
    ? 'Visit completed'
    : variant === 'availability'
      ? tone === 'green'
        ? 'Booked'
        : tone === 'red'
          ? 'Not Available'
          : tone === 'orange'
            ? 'Possibly Available'
            : 'Available'
      : TONE_HEADER[tone]

  const rota = jobRotaTimeRange(job)
  const visitSlot = resolveVisitPlanSlotForJob(job, visitPlanSlotsByServiceUser)
  const callPattern = visitSlot ? callPatternTimeRange(visitSlot) : null
  const timingChanged = visitSlot ? rotaTimingDiffersFromCallPattern(job, visitSlot) : false
  const carers = employeesLabel(job)
  const allocated = activeJobAllocationCount(job)
  const leadAllocation = leadCarerAllocation(job)
  const leadName = leadAllocation?.employee
    ? [leadAllocation.employee.firstName, leadAllocation.employee.lastName].filter(Boolean).join(' ')
    : null
  const region = job.scheduleArea?.name
  const serviceUserLocation = job.serviceUser.location?.name
  const runName = job.scheduleRun?.name
  const startDateLabel =
    formatScheduleJobsDateLabel(date).split(',').slice(1).join(',').trim() || date
  const nextVisitTravel = completed
    ? null
    : buildNextVisitTravelDetail(job, rowJobs, {
        bufferMinutes: travelBufferMinutes,
      })
  const acceptedCarePlans = acceptedCarePlansByServiceUser?.get(job.serviceUserId) ?? []
  const { plans: carePlans, source: carePlanSource } = carePlansForJobHover(
    job,
    visitSlot,
    acceptedCarePlans,
  )

  const callPatternFields: DetailField[] = visitSlot
    ? [
        { label: 'Slot', value: `${visitSlot.label} (${visitSlot.slotCode})` },
        { label: 'Planned', value: formatJobTimeRangeLabel(callPattern!) },
        ...(visitSlot.medicationRoundCode
          ? [{ label: 'Round', value: visitSlot.medicationRoundCode }]
          : []),
        { label: 'Carers', value: `${visitSlot.requiredCarers} required` },
        { label: 'Schedule', value: visitPlanScheduleSummary(visitSlot) },
        ...(visitSlot.timeCritical
          ? [{ label: 'Time critical', value: timeCriticalLabel(visitSlot.timeToleranceMinutes) }]
          : []),
      ]
    : []

  const actualStart = job.actualStartDateTime
  const actualEnd = job.actualEndDateTime
  const actualTimeLabel =
    actualStart && actualEnd
      ? `${isoToLocalTimeInput(actualStart)} – ${isoToLocalTimeInput(actualEnd)}`
      : actualStart
        ? isoToLocalTimeInput(actualStart)
        : actualEnd
          ? isoToLocalTimeInput(actualEnd)
          : null

  const visitFields: DetailField[] = [
    ...(completed
      ? [
          {
            label: 'Status',
            value: 'Completed',
            valueClassName: 'text-emerald-800 dark:text-emerald-200 font-semibold',
            emphasis: true,
          },
          ...(actualTimeLabel
            ? [{ label: 'Actual time', value: actualTimeLabel, emphasis: true }]
            : []),
        ]
      : []),
    {
      label: timingChanged ? 'Rota time' : 'Time',
      value: formatJobTimeRangeLabel(rota),
      emphasis: true,
    },
    { label: 'Duration', value: formatDurationLabel(rota.durationMinutes) },
    { label: 'Date', value: startDateLabel },
    ...(serviceUserLocation ? [{ label: 'Location', value: serviceUserLocation }] : []),
    {
      label: 'Allocated',
      value: `${allocated} / ${job.requiredCarers}`,
      valueClassName:
        allocated < job.requiredCarers ? 'text-amber-700 dark:text-amber-300' : undefined,
      emphasis: allocated < job.requiredCarers,
    },
    ...(carers !== '—' ? [{ label: 'Carer(s)', value: carers }] : []),
    ...(runName
      ? [
          {
            label: 'Run',
            value: job.runSequence != null ? `${job.runSequence}. ${runName}` : runName,
          },
        ]
      : []),
    ...(region ? [{ label: 'Region', value: region }] : []),
    ...(leadName && !carers.includes(leadName) ? [{ label: 'Lead', value: leadName }] : []),
  ]

  const travelFields: DetailField[] = nextVisitTravel
    ? [
        {
          label: 'Next client',
          value: `${nextVisitTravel.nextClientLabel} · ${nextVisitTravel.nextVisitTimeLabel}`,
        },
        { label: 'Gap', value: `${nextVisitTravel.gapMinutes} min` },
        { label: 'Travel', value: nextVisitTravel.travelLabel },
        { label: 'Arrival', value: nextVisitTravel.estimatedArrivalLabel },
        ...(nextVisitTravel.bufferMinutes > 0
          ? [{ label: 'Buffer', value: `${nextVisitTravel.bufferMinutes} min` }]
          : []),
        { label: 'Distance', value: nextVisitTravel.distanceLabel },
      ]
    : []

  return (
    <div className="flex w-[min(48rem,calc(var(--radix-tooltip-content-available-width,100vw)-1rem))] max-h-[var(--radix-tooltip-content-available-height,calc(100vh-2rem))] flex-col overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
      <div
        className={cn(
          'shrink-0 border-b px-4 py-2.5 text-center text-base font-semibold',
          completed ? TONE_HEADER_CLASS.completed : TONE_HEADER_CLASS[tone],
        )}
      >
        <span className="inline-flex items-center justify-center gap-2">
          {completed ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : null}
          {header}
        </span>
      </div>

      <div
        {...{ [SCHEDULE_JOB_HOVER_SCROLL_ATTR]: '' }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3.5 [scrollbar-width:thin]"
        onWheel={handleScheduleJobHoverWheel}
      >
        <div className="mb-3 space-y-1 border-b border-border/60 pb-3">
          <p className="text-base font-semibold leading-snug text-foreground">
            {serviceUserLabel(job.serviceUser)}
          </p>
          {serviceUserLocation ? (
            <p className="text-sm text-muted-foreground">{serviceUserLocation}</p>
          ) : null}
          <div className="grid gap-x-6 sm:grid-cols-2">
            <DetailRow label="Job" value={job.jobName} compact />
            <DetailRow label="Status" value={jobStatusLabel(job.status)} compact />
          </div>
        </div>

        {timingChanged && callPattern ? (
          <div className="mb-3">
            <AlertBox tone="amber" title="Rescheduled on rota">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-amber-800/80 dark:text-amber-300">Call pattern</p>
                  <p className="mt-0.5 text-base font-semibold">
                    {formatJobTimeRangeLabel(callPattern)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-amber-800/80 dark:text-amber-300">Rota now</p>
                  <p className="mt-0.5 text-base font-semibold">{formatJobTimeRangeLabel(rota)}</p>
                </div>
              </div>
            </AlertBox>
          </div>
        ) : null}

        <div className="grid items-start gap-3 sm:grid-cols-2">
          <div className="space-y-3">
            {visitSlot ? (
              <SectionCard title="Call pattern">
                <DetailGrid fields={callPatternFields} compact />
              </SectionCard>
            ) : null}

            {carePlans.length > 0 ? (
              <SectionCard title="Care plans">
                <ul className="space-y-1.5 text-sm leading-snug">
                  {carePlans.map((plan) => (
                    <li key={plan.formId} className="text-foreground">
                      <span className="font-medium">{plan.formName}</span>
                      {plan.carePlanArea && plan.carePlanArea !== plan.formName ? (
                        <span className="text-muted-foreground"> · {plan.carePlanArea}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {carePlanSource === 'suggested' ? (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Suggested for this call — confirm on the visit plan to save links.
                  </p>
                ) : null}
              </SectionCard>
            ) : acceptedCarePlans.length > 0 ? (
              <SectionCard title="Care plans">
                <p className="text-sm text-muted-foreground">None linked to this call.</p>
              </SectionCard>
            ) : null}
          </div>

          <div className="space-y-3">
            <SectionCard title={visitSlot ? 'Visit on rota' : 'Visit'}>
              <DetailGrid fields={visitFields} compact />
            </SectionCard>

            {nextVisitTravel ? (
              <SectionCard title="Next visit travel">
                {nextVisitTravel.hasTravelConflict ? (
                  <AlertBox tone="orange" title="Not enough time to reach next visit">
                    <p>
                      Needs ~{nextVisitTravel.requiredGapMinutes} min, only{' '}
                      {nextVisitTravel.gapMinutes} min gap — carer may arrive ~
                      {nextVisitTravel.lateByMinutes} min late (
                      {nextVisitTravel.estimatedArrivalLabel} vs{' '}
                      {nextVisitTravel.nextVisitTimeLabel} start).
                    </p>
                  </AlertBox>
                ) : null}
                <div className={nextVisitTravel.hasTravelConflict ? 'mt-3' : undefined}>
                  <DetailGrid fields={travelFields} compact />
                </div>
              </SectionCard>
            ) : null}
          </div>
        </div>
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
      collisionPadding={HOVER_COLLISION_PADDING}
      className="z-[100] flex max-h-[var(--radix-tooltip-content-available-height)] max-w-[var(--radix-tooltip-content-available-width)] flex-col overflow-hidden border-0 bg-transparent p-0 shadow-none"
      onWheel={handleScheduleJobHoverWheel}
    >
      <JobHoverPanel {...props} />
    </TooltipContent>
  )
}
