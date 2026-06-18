import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { employeesLabel } from '@/features/scheduling/utils/scheduling-format'
import {
  carePlansForJobHover,
  resolveVisitPlanSlotForJob,
} from '@/features/scheduling/utils/schedule-job-hover-details.util'

export type ScheduleRunsNameFormat = 'full' | 'first-last-initial' | 'last-first'

export type ScheduleRunsDisplayLabelKey =
  | 'clientOrCarerName'
  | 'tasks'
  | 'appointmentNotes'
  | 'financeNotes'
  | 'invoiceGroup'
  | 'paymentGroup'
  | 'clientRegion'
  | 'carerRegion'

export type ScheduleRunsDisplayLabels = Record<ScheduleRunsDisplayLabelKey, boolean>

export type ScheduleRunsDisplayPreferences = {
  labels: ScheduleRunsDisplayLabels
  nameFormat: ScheduleRunsNameFormat
  linesOfData: 1 | 2 | 3
  showDoubleUpIcon: boolean
  showTravelMethodIcons: boolean
}

export const SCHEDULE_RUNS_DISPLAY_LABEL_OPTIONS: Array<{
  key: ScheduleRunsDisplayLabelKey
  label: string
}> = [
  { key: 'clientOrCarerName', label: 'Client or carer name' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'appointmentNotes', label: 'Appointment notes' },
  { key: 'financeNotes', label: 'Finance notes' },
  { key: 'invoiceGroup', label: 'Invoice group' },
  { key: 'paymentGroup', label: 'Payment group' },
  { key: 'clientRegion', label: 'Client region' },
  { key: 'carerRegion', label: 'Carer region' },
]

export const DEFAULT_SCHEDULE_RUNS_DISPLAY_PREFERENCES: ScheduleRunsDisplayPreferences = {
  labels: {
    clientOrCarerName: true,
    tasks: false,
    appointmentNotes: false,
    financeNotes: false,
    invoiceGroup: false,
    paymentGroup: false,
    clientRegion: false,
    carerRegion: false,
  },
  nameFormat: 'full',
  linesOfData: 1,
  showDoubleUpIcon: true,
  showTravelMethodIcons: true,
}

const STORAGE_KEY_PREFIX = 'care-admin-runs-display-preferences'

export function scheduleRunsStorageKey(userId?: string | null): string {
  return userId ? `${STORAGE_KEY_PREFIX}:${userId}` : STORAGE_KEY_PREFIX
}

export function parseScheduleRunsDisplayPreferences(raw: unknown): ScheduleRunsDisplayPreferences {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SCHEDULE_RUNS_DISPLAY_PREFERENCES, labels: { ...DEFAULT_SCHEDULE_RUNS_DISPLAY_PREFERENCES.labels } }
  const o = raw as Partial<ScheduleRunsDisplayPreferences>
  const labels = { ...DEFAULT_SCHEDULE_RUNS_DISPLAY_PREFERENCES.labels }
  if (o.labels && typeof o.labels === 'object') {
    for (const key of Object.keys(labels) as ScheduleRunsDisplayLabelKey[]) {
      if (typeof o.labels[key] === 'boolean') labels[key] = o.labels[key]
    }
  }
  const lines = o.linesOfData
  return {
    labels,
    nameFormat:
      o.nameFormat === 'first-last-initial' || o.nameFormat === 'last-first'
        ? o.nameFormat
        : 'full',
    linesOfData: lines === 2 || lines === 3 ? lines : 1,
    showDoubleUpIcon: o.showDoubleUpIcon ?? DEFAULT_SCHEDULE_RUNS_DISPLAY_PREFERENCES.showDoubleUpIcon,
    showTravelMethodIcons:
      o.showTravelMethodIcons ?? DEFAULT_SCHEDULE_RUNS_DISPLAY_PREFERENCES.showTravelMethodIcons,
  }
}

export function loadScheduleRunsDisplayPreferences(userId?: string | null): ScheduleRunsDisplayPreferences {
  try {
    const raw = localStorage.getItem(scheduleRunsStorageKey(userId))
    if (!raw) return parseScheduleRunsDisplayPreferences(null)
    return parseScheduleRunsDisplayPreferences(JSON.parse(raw))
  } catch {
    return parseScheduleRunsDisplayPreferences(null)
  }
}

export function saveScheduleRunsDisplayPreferences(
  prefs: ScheduleRunsDisplayPreferences,
  userId?: string | null,
): void {
  localStorage.setItem(scheduleRunsStorageKey(userId), JSON.stringify(prefs))
}

function readJobMetaString(job: TimelineJob, key: string): string | null {
  const meta = (job as TimelineJob & { metadata?: Record<string, unknown> }).metadata
  if (!meta || typeof meta !== 'object') return null
  const value = meta[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function formatRunVisitPersonName(
  job: TimelineJob,
  nameFormat: ScheduleRunsNameFormat,
  mode: 'client' | 'carer',
): string {
  if (mode === 'carer') {
    const carers = employeesLabel(job)
    return carers === '—' ? 'Unassigned' : carers
  }
  const su = job.serviceUser
  const first = su.firstName?.trim() ?? ''
  const last = su.lastName?.trim() ?? ''
  const preferred = su.preferredName?.trim()
  const num = su.serviceUserNumber ? ` (${su.serviceUserNumber})` : ''

  if (nameFormat === 'last-first') {
    const base = [last, first].filter(Boolean).join(', ')
    return `${base}${num}`.trim() || su.id
  }
  if (nameFormat === 'first-last-initial') {
    const initial = last ? `${last.charAt(0)}.` : ''
    const base = [first, initial].filter(Boolean).join(' ')
    return `${base}${num}`.trim() || su.id
  }
  const base = preferred || [first, last].filter(Boolean).join(' ')
  return `${base}${num}`.trim() || su.id
}

export type RunVisitLabelContext = {
  visitPlanSlotsByServiceUser?: Map<string, VisitPlanSlot[]>
  acceptedCarePlansByServiceUser?: Map<string, AcceptedCarePlanItem[]>
}

function resolveTasksLabel(job: TimelineJob, context?: RunVisitLabelContext): string | null {
  const slot = resolveVisitPlanSlotForJob(job, context?.visitPlanSlotsByServiceUser)
  const accepted = context?.acceptedCarePlansByServiceUser?.get(job.serviceUserId) ?? []
  const { plans } = carePlansForJobHover(job, slot, accepted)
  const parts: string[] = []
  if (slot?.label?.trim()) parts.push(slot.label.trim())
  else if (job.visitPlan?.label?.trim()) parts.push(job.visitPlan.label.trim())
  else if (job.jobName?.trim()) parts.push(job.jobName.trim())
  if (plans.length > 0) parts.push(plans.map((p) => p.formName).filter(Boolean).join(', '))
  return parts.length > 0 ? parts.join(' · ') : null
}

function resolveClientRegion(job: TimelineJob): string | null {
  return job.serviceUser.location?.name?.trim() ?? job.scheduleArea?.name?.trim() ?? null
}

function resolveCarerRegion(job: TimelineJob): string | null {
  return job.scheduleArea?.name?.trim() ?? null
}

export function buildRunVisitLabelSegments(
  job: TimelineJob,
  prefs: ScheduleRunsDisplayPreferences,
  context?: RunVisitLabelContext,
): string[] {
  const segments: string[] = []
  const { labels } = prefs

  if (labels.clientOrCarerName) {
    segments.push(formatRunVisitPersonName(job, prefs.nameFormat, 'client'))
  }
  if (labels.tasks) {
    const tasks = resolveTasksLabel(job, context)
    if (tasks) segments.push(tasks)
  }
  if (labels.appointmentNotes && job.notes?.trim()) {
    segments.push(job.notes.trim())
  }
  if (labels.financeNotes) {
    const v = readJobMetaString(job, 'financeNotes')
    if (v) segments.push(v)
  }
  if (labels.invoiceGroup) {
    const v = readJobMetaString(job, 'invoiceGroup')
    if (v) segments.push(v)
  }
  if (labels.paymentGroup) {
    const v = readJobMetaString(job, 'paymentGroup')
    if (v) segments.push(v)
  }
  if (labels.clientRegion) {
    const v = resolveClientRegion(job)
    if (v) segments.push(v)
  }
  if (labels.carerRegion) {
    const v = resolveCarerRegion(job)
    if (v) segments.push(v)
  }

  return segments
}

export function splitRunVisitLabelLines(segments: string[], linesOfData: 1 | 2 | 3): string[] {
  if (segments.length === 0) return []
  if (linesOfData === 1) return [segments.join(' · ')]
  if (linesOfData >= segments.length) return segments
  const perLine = Math.ceil(segments.length / linesOfData)
  const lines: string[] = []
  for (let i = 0; i < segments.length; i += perLine) {
    lines.push(segments.slice(i, i + perLine).join(' · '))
  }
  return lines.slice(0, linesOfData)
}

export function buildRunVisitLabelLines(
  job: TimelineJob,
  prefs: ScheduleRunsDisplayPreferences,
  context?: RunVisitLabelContext,
): string[] {
  const segments = buildRunVisitLabelSegments(job, prefs, context)
  if (segments.length === 0) {
    return [formatRunVisitPersonName(job, prefs.nameFormat, 'client')]
  }
  return splitRunVisitLabelLines(segments, prefs.linesOfData)
}

export function runVisitDisplayName(
  job: TimelineJob,
  prefs: ScheduleRunsDisplayPreferences,
  context?: RunVisitLabelContext,
): string {
  return buildRunVisitLabelLines(job, prefs, context)[0] ?? formatRunVisitPersonName(job, prefs.nameFormat, 'client')
}
