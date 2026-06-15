import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  formatDurationLabel,
  formatScheduleJobsDateLabel,
  formatTimeHm,
  jobBlockTone,
  jobDurationMinutes,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { employeesLabel, serviceUserLabel } from '@/features/scheduling/utils/scheduling-format'

type Props = {
  job: TimelineJob
  date: string
  variant?: 'tooltip' | 'appointment' | 'availability'
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-xs leading-snug">
      <span className="w-[4.5rem] shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}

export function ScheduleJobHoverCard({ job, date, variant = 'tooltip' }: Props) {
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

  const start = formatTimeHm(job.scheduledStartDateTime)
  const end = job.scheduledEndDateTime
    ? formatTimeHm(job.scheduledEndDateTime)
    : formatTimeHm(
        new Date(
          new Date(job.scheduledStartDateTime).getTime() + jobDurationMinutes(job) * 60_000,
        ).toISOString(),
      )
  const carers = employeesLabel(job)
  const region = job.scheduleArea?.name

  return (
    <div className="w-[240px] rounded-md border border-border bg-popover shadow-lg">
      <div className={`border-b border-border px-3 py-2 text-center text-sm font-semibold ${TONE_HEADER_CLASS[tone]}`}>
        {header}
      </div>
      <div className="space-y-2 px-3 py-2.5">
        {variant !== 'availability' ? (
          <>
            <DetailRow label="Client:" value={serviceUserLabel(job.serviceUser)} />
            {region ? <DetailRow label="Region:" value={region} /> : null}
          </>
        ) : null}
        <DetailRow label="Time:" value={`${start} - ${end}`} />
        <DetailRow label="Duration:" value={formatDurationLabel(jobDurationMinutes(job))} />
        <DetailRow label="Start date:" value={formatScheduleJobsDateLabel(date).split(',').slice(1).join(',').trim() || date} />
        {variant !== 'availability' && carers !== '—' ? (
          <DetailRow label="Carer 1:" value={carers.split(',')[0]?.trim() ?? carers} />
        ) : null}
      </div>
    </div>
  )
}
