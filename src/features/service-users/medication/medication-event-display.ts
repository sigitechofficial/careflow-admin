import type { MedicationEventUserRef } from '@/features/service-users/api/medication-mar.api'
import { administrationStatusToDisplayCode } from '@/features/service-users/medication/mar-status-utils'

const REVIEWABLE_STATUSES = new Set(['REFUSED', 'MISSED', 'NOT_GIVEN', 'HELD'])

export function userDisplayName(user?: MedicationEventUserRef | null): string {
  if (!user) return '—'
  const n = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return n || user.email || '—'
}

/** Carer who administered, or staff who recorded the event. */
export function eventCarerDisplay(ev: {
  administeredBy?: {
    personalDetail?: { firstName: string | null; lastName: string | null } | null
  } | null
  enteredBy?: MedicationEventUserRef | null
  createdBy?: MedicationEventUserRef | null
}): string {
  const pd = ev.administeredBy?.personalDetail
  if (pd) {
    const n = [pd.firstName, pd.lastName].filter(Boolean).join(' ').trim()
    if (n) return n
  }
  if (ev.enteredBy) return `${userDisplayName(ev.enteredBy)} (recorded)`
  if (ev.createdBy) return userDisplayName(ev.createdBy)
  return '—'
}

export function snapshotDiffersFromCurrent(
  snapshotName: string | null | undefined,
  currentName: string,
): boolean {
  return Boolean(snapshotName && snapshotName !== currentName)
}

import {
  formatOrganisationDate,
  formatOrganisationDateTime,
  formatOrganisationTime,
} from '@/shared/lib/organisation-display-format.store'

// Medication/clinical timestamps use organisation operational timezone +
// Settings date/time display formats (not the viewer's browser locale).
export function formatGbDateTime(iso: string | null | undefined): string {
  return formatOrganisationDateTime(iso)
}

export function formatGbDate(iso: string | null | undefined): string {
  return formatOrganisationDate(iso)
}

export function formatGbTime(iso: string | null | undefined): string {
  return formatOrganisationTime(iso)
}

type EventTimeSource = {
  scheduledDateTime?: string | null
  actualDateTime?: string | null
  createdAt?: string
  schedule?: {
    dueTime?: string | null
    dueVisitName?: string | null
    round?: { name?: string | null; time?: string | null } | null
  } | null
  round?: { name?: string | null; time?: string | null } | null
}

/** Scheduled slot time (HH:mm) — not MAR “Due” cell state. */
export function eventScheduledDueTime(ev: EventTimeSource): string {
  const due = ev.schedule?.dueTime?.trim()
  if (due && /^\d{1,2}:\d{2}$/.test(due)) {
    const [h, m] = due.split(':')
    return `${h!.padStart(2, '0')}:${m}`
  }
  const roundTime = ev.schedule?.round?.time?.trim() ?? ev.round?.time?.trim()
  if (roundTime && /^\d{1,2}:\d{2}/.test(roundTime)) {
    const [h, m] = roundTime.split(':')
    return `${h!.padStart(2, '0')}:${m}`
  }
  if (ev.scheduledDateTime) return formatGbTime(ev.scheduledDateTime)
  return '—'
}

export function eventTimeSlotLabel(ev: EventTimeSource): string {
  return (
    ev.schedule?.round?.name?.trim() ??
    ev.round?.name?.trim() ??
    ev.schedule?.dueVisitName?.trim() ??
    '—'
  )
}

type RoundWindowSource = {
  windowStart?: string | null
  windowEnd?: string | null
}

export function eventRoundWindow(ev: {
  schedule?: { round?: RoundWindowSource | null } | null
  round?: RoundWindowSource | null
}): string | null {
  const r = ev.schedule?.round ?? ev.round
  const ws = r?.windowStart?.trim()
  const we = r?.windowEnd?.trim()
  if (ws && we) return `${ws}–${we}`
  return null
}

export function eventDisplayCode(ev: {
  status: string
  statusCode?: string | null
}): string {
  const code = ev.statusCode?.trim()
  if (code) return code
  return administrationStatusToDisplayCode(ev.status)
}

export function eventReason(ev: {
  notGivenReason?: { name: string } | null
  reason?: string | null
  notes?: string | null
}): string {
  return ev.notGivenReason?.name ?? ev.reason ?? '—'
}

export function eventReviewLabel(ev: {
  status: string
  managerReviewedAt?: string | null
}): string {
  if (!REVIEWABLE_STATUSES.has(ev.status)) return 'N/A'
  return ev.managerReviewedAt ? 'Reviewed' : 'Pending'
}

export function eventDateLabel(ev: {
  scheduledDateTime?: string | null
  actualDateTime?: string | null
  createdAt?: string
}): string {
  const iso = ev.scheduledDateTime ?? ev.actualDateTime ?? ev.createdAt
  return formatGbDate(iso)
}

export function carerAdministeredName(
  administeredBy?: {
    personalDetail?: { firstName: string | null; lastName: string | null } | null
  } | null,
): string {
  const pd = administeredBy?.personalDetail
  if (!pd) return '—'
  const n = [pd.firstName, pd.lastName].filter(Boolean).join(' ').trim()
  return n || '—'
}
