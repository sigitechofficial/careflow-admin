import { cn } from '@/shared/lib/utils'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
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

type Props = {
  job: TimelineJob
  date: string
  /** Affects header label only (e.g. "Booked" on carer rows). Body always shows full visit details. */
  variant?: 'tooltip' | 'appointment' | 'availability'
  visitPlanSlotsByServiceUser?: Map<string, VisitPlanSlot[]>
  acceptedCarePlansByServiceUser?: Map<string, AcceptedCarePlanItem[]>
  /** Other jobs on the same board row — used to compute travel to the next visit. */
  rowJobs?: TimelineJob[]
}

const TONE_HEADER: Record<ReturnType<typeof jobBlockTone>, string> = {
  green: 'Appointment',
  orange: 'Possibly Available',
  red: 'Not Available',
  neutral: 'Scheduled job',
}

const TONE_HEADER_CLASS: Record<ReturnType<typeof jobBlockTone>, string> = {
  green: 'text-[#2d7a32]',
  orange: 'text-[#c47a1a]',
  red: 'text-red-600',
  neutral: 'text-slate-700',
}

type DetailField = {
  label: string
  value: string
  valueClassName?: string
  colSpan?: 1 | 2 | 'full'
}

function DetailItem({ label, value, valueClassName, colSpan = 1 }: DetailField) {
  return (
    <div
      className={cn(
        'min-w-0',
        colSpan === 'full' && 'col-span-full',
        colSpan === 2 && 'col-span-2',
      )}
    >
      <p className="text-[10px] leading-tight text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-xs font-medium leading-snug text-foreground break-words',
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  )
}

function DetailGrid({ fields, columns = 3 }: { fields: DetailField[]; columns?: 2 | 3 }) {
  if (fields.length === 0) return null
  return (
    <div
      className={cn(
        'grid gap-x-3 gap-y-2',
        columns === 2 ? 'grid-cols-2' : 'grid-cols-3',
      )}
    >
      {fields.map((field, index) => (
        <DetailItem key={`${field.label}-${index}`} {...field} />
      ))}
    </div>
  )
}

function SectionTitle({ children }: { children: string }) {
  return (
    <p className="border-t border-border/80 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground first:border-t-0 first:pt-0">
      {children}
    </p>
  )
}

export function ScheduleJobHoverCard({
  job,
  date,
  variant = 'tooltip',
  visitPlanSlotsByServiceUser,
  acceptedCarePlansByServiceUser,
  rowJobs,
}: Props) {
  const tone = jobBlockTone(job)
  const header =
    variant === 'availability'
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
  const region = job.scheduleArea?.name
  const runName = job.scheduleRun?.name
  const startDateLabel =
    formatScheduleJobsDateLabel(date).split(',').slice(1).join(',').trim() || date
  const nextVisitTravel = buildNextVisitTravelDetail(job, rowJobs)
  const acceptedCarePlans = acceptedCarePlansByServiceUser?.get(job.serviceUserId) ?? []
  const { plans: carePlans, source: carePlanSource } = carePlansForJobHover(
    job,
    visitSlot,
    acceptedCarePlans,
  )

  const overviewFields: DetailField[] = [
    { label: 'Client', value: serviceUserLabel(job.serviceUser), colSpan: 'full' },
    { label: 'Job', value: job.jobName },
    { label: 'Status', value: jobStatusLabel(job.status) },
  ]

  const callPatternFields: DetailField[] = visitSlot
    ? [
        { label: 'Slot', value: `${visitSlot.label} (${visitSlot.slotCode})` },
        { label: 'Planned', value: formatJobTimeRangeLabel(callPattern!) },
        ...(visitSlot.medicationRoundCode
          ? [{ label: 'Round', value: visitSlot.medicationRoundCode }]
          : [{ label: 'Carers', value: `${visitSlot.requiredCarers} required` }]),
        { label: 'Schedule', value: visitPlanScheduleSummary(visitSlot), colSpan: 'full' },
        ...(visitSlot.medicationRoundCode
          ? [{ label: 'Carers', value: `${visitSlot.requiredCarers} required` }]
          : []),
      ]
    : []

  const visitFields: DetailField[] = [
    ...(timingChanged || !visitSlot
      ? []
      : [{ label: 'Time', value: formatJobTimeRangeLabel(rota) }]),
    { label: 'Duration', value: formatDurationLabel(rota.durationMinutes) },
    { label: 'Date', value: startDateLabel },
    {
      label: 'Allocated',
      value: `${allocated} / ${job.requiredCarers}`,
      valueClassName:
        allocated < job.requiredCarers ? 'text-amber-700 dark:text-amber-300' : undefined,
    },
    ...(carers !== '—' ? [{ label: 'Carer(s)', value: carers, colSpan: 'full' as const }] : []),
    ...(leadAllocation?.employee
      ? [
          {
            label: 'Lead',
            value: [leadAllocation.employee.firstName, leadAllocation.employee.lastName]
              .filter(Boolean)
              .join(' '),
          },
        ]
      : []),
    ...(runName ? [{ label: 'Run', value: runName }] : []),
    ...(region ? [{ label: 'Region', value: region }] : []),
  ]

  const travelFields: DetailField[] = nextVisitTravel
    ? [
        {
          label: 'Next client',
          value: `${nextVisitTravel.nextClientLabel} · ${nextVisitTravel.nextVisitTimeLabel}`,
          colSpan: 'full',
        },
        { label: 'Distance', value: nextVisitTravel.distanceLabel },
        { label: 'Est. travel', value: nextVisitTravel.travelLabel },
      ]
    : []

  return (
    <div className="w-[min(38rem,94vw)] rounded-md border border-border bg-popover shadow-lg">
      <div
        className={`border-b border-border px-4 py-2 text-center text-sm font-semibold ${TONE_HEADER_CLASS[tone]}`}
      >
        {header}
      </div>
      <div className="space-y-2.5 px-4 py-3">
        <DetailGrid fields={overviewFields} columns={2} />

        {visitSlot ? (
          <>
            <SectionTitle>Call pattern</SectionTitle>
            <DetailGrid fields={callPatternFields} />
          </>
        ) : null}

        {carePlans.length > 0 ? (
          <>
            <SectionTitle>Care plans</SectionTitle>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] leading-snug">
              {carePlans.map((plan) => (
                <li key={plan.formId} className="min-w-0 truncate text-muted-foreground">
                  <span className="text-foreground/90">{plan.formName}</span>
                  {plan.carePlanArea && plan.carePlanArea !== plan.formName ? (
                    <span> · {plan.carePlanArea}</span>
                  ) : null}
                </li>
              ))}
            </ul>
            {carePlanSource === 'suggested' ? (
              <p className="text-[10px] leading-snug text-muted-foreground">
                Suggested for this call — confirm on the visit plan to save links.
              </p>
            ) : null}
          </>
        ) : acceptedCarePlans.length > 0 ? (
          <>
            <SectionTitle>Care plans</SectionTitle>
            <p className="text-[10px] text-muted-foreground">None linked to this call.</p>
          </>
        ) : null}

        {timingChanged && callPattern ? (
          <div className="rounded-md border border-amber-300/80 bg-amber-50/90 px-2.5 py-2 text-xs dark:border-amber-800 dark:bg-amber-950/40">
            <p className="font-semibold text-amber-950 dark:text-amber-100">Rescheduled on rota</p>
            <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-amber-900 dark:text-amber-200">
              <div className="min-w-0">
                <p className="text-[10px] text-amber-800/80 dark:text-amber-300">Call pattern</p>
                <p className="font-medium">{formatJobTimeRangeLabel(callPattern)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-amber-800/80 dark:text-amber-300">Rota now</p>
                <p className="font-semibold">{formatJobTimeRangeLabel(rota)}</p>
              </div>
            </div>
          </div>
        ) : null}

        {!timingChanged && visitSlot ? <SectionTitle>Rota</SectionTitle> : null}
        {!timingChanged && !visitSlot ? <SectionTitle>Visit</SectionTitle> : null}
        {!timingChanged ? (
          <DetailGrid
            fields={
              visitSlot
                ? visitFields
                : [{ label: 'Time', value: formatJobTimeRangeLabel(rota) }, ...visitFields]
            }
          />
        ) : (
          <DetailGrid fields={visitFields} />
        )}

        {nextVisitTravel ? (
          <>
            <SectionTitle>Next visit travel</SectionTitle>
            <DetailGrid fields={travelFields} columns={2} />
          </>
        ) : null}
      </div>
    </div>
  )
}
