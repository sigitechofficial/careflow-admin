import type { ServiceUserBrief, TimelineJob } from '../types/scheduling.types'

export function serviceUserLabel(su: ServiceUserBrief): string {
  const name = su.preferredName?.trim() || [su.firstName, su.lastName].filter(Boolean).join(' ')
  const num = su.serviceUserNumber ? ` (${su.serviceUserNumber})` : ''
  return `${name}${num}`.trim() || su.id
}

export function formatDateTimeLocal(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatJobTimeRange(job: Pick<TimelineJob, 'scheduledStartDateTime' | 'scheduledEndDateTime' | 'durationMinutes'>): string {
  const start = new Date(job.scheduledStartDateTime)
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const end = job.scheduledEndDateTime ? new Date(job.scheduledEndDateTime) : null
  const mins = job.durationMinutes ?? (end ? Math.round((end.getTime() - start.getTime()) / 60_000) : 60)
  const endLabel = end ? fmt(end) : fmt(new Date(start.getTime() + mins * 60_000))
  return `${fmt(start)}/${mins}m/${endLabel}`
}

export function employeesLabel(job: TimelineJob): string {
  const active = job.allocations?.filter(a => a.employee) ?? []
  if (!active.length) return '—'
  return active
    .map(a => [a.employee?.firstName, a.employee?.lastName].filter(Boolean).join(' '))
    .join(', ')
}

export function jobNeedsAlert(job: TimelineJob): boolean {
  return ['NEEDS_ATTENTION', 'MISSED', 'PARTIALLY_COMPLETED', 'UNALLOCATED'].includes(job.status)
}

export function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
