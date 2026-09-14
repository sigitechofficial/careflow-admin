import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'

/** Compact board label: GPS / Manual / NFC / QR after the carer has clocked in. */
export function timelineJobCheckInMethodLabel(job: TimelineJob): string | null {
  const label = job.checkIn?.methodLabel?.trim()
  if (label) return label
  const method = job.checkIn?.method?.trim()
  return method || null
}

export function timelineJobCheckInMethodTitle(job: TimelineJob): string | null {
  const method = timelineJobCheckInMethodLabel(job)
  if (!method) return null
  const extra = [job.checkIn?.reasonLabel, job.checkIn?.notes].filter(Boolean).join(' · ')
  return extra ? `Clock-in: ${method} · ${extra}` : `Clock-in: ${method}`
}

/** SOS / live alerts take over the visit card; Crit. late can sit beside the method chip. */
export function boardShowsCheckInMethod(options: {
  methodLabel: string | null
  liveAlertCount: number
}): boolean {
  return Boolean(options.methodLabel) && options.liveAlertCount === 0
}
