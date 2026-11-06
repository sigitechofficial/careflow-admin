import {
  dayKeyInTimeZone,
  formatOpsHm,
  getSyncedOperationalTimeZone,
  isoToOrgDatetimeLocal,
  orgDatetimeLocalToIso,
} from '@/shared/lib/operational-day.util'

/**
 * Survey dates and times are always the organisation's operational timezone (Europe/London by
 * default), never the browser's — the create dialog, the builder and the send dialog all use
 * these helpers, matching the API's recurrence calendar.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** UK date, e.g. "5 Nov 2026" ('—' when missing). */
export function formatSurveyDate(
  iso: string | null | undefined,
  timeZone = getSyncedOperationalTimeZone(),
): string {
  if (!iso || Number.isNaN(new Date(iso).getTime())) return '—'
  const [y, m, d] = dayKeyInTimeZone(iso, timeZone).split('-').map(Number)
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`
}

/** UK date and 24-hour time, e.g. "5 Nov 2026, 09:00" ('—' when missing). */
export function formatSurveyDateTime(
  iso: string | null | undefined,
  timeZone = getSyncedOperationalTimeZone(),
): string {
  const date = formatSurveyDate(iso, timeZone)
  return date === '—' ? date : `${date}, ${formatOpsHm(iso, timeZone)}`
}

/** `<input type="datetime-local">` value (organisation wall clock) → UTC ISO, or undefined. */
export function surveyLocalToIso(value: string | null | undefined): string | undefined {
  return orgDatetimeLocalToIso(value) || undefined
}

/** UTC ISO → `<input type="datetime-local">` value in the organisation timezone. */
export function isoToSurveyLocal(iso: string | null | undefined): string {
  return isoToOrgDatetimeLocal(iso)
}

/**
 * When an open survey ends, or that it closed at its end date: "Ends 5 Nov 2026, 17:00" /
 * "Closed at its end date". null when there is nothing to say (no end date, draft, closed by someone).
 */
export function surveyEndLabel(s: {
  status: string
  closesAt: string | null
  closedAtEndDate?: boolean
}): string | null {
  if (s.status === 'CLOSED' && s.closedAtEndDate) return 'Closed at its end date'
  if (s.status === 'ACTIVE' && s.closesAt) return `Ends ${formatSurveyDateTime(s.closesAt)}`
  return null
}

/** The end date has passed (reopening it needs a new one, or none). */
export function surveyEndPassed(closesAt: string | null | undefined, now: Date = new Date()): boolean {
  return Boolean(closesAt && new Date(closesAt).getTime() <= now.getTime())
}
