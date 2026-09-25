/**
 * Match a medication dueTime (HH:mm) to a visit window.
 * Inclusive bounds. Overnight windows (end <= start) span midnight.
 */

const HM_RE = /^(\d{1,2}):(\d{2})$/

export function parseHmToMinutes(value: string | null | undefined): number | null {
  if (!value?.trim()) return null
  const m = HM_RE.exec(value.trim())
  if (!m) return null
  const hours = Number(m[1])
  const minutes = Number(m[2])
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
}

/**
 * True when dueTime falls inside [windowStart, windowEnd] inclusive.
 * If windowEnd < windowStart, treat as overnight (e.g. 22:00–06:00).
 */
export function dueTimeFallsInHmWindow(
  dueTime: string | null | undefined,
  windowStart: string | null | undefined,
  windowEnd: string | null | undefined,
): boolean {
  const due = parseHmToMinutes(dueTime)
  const start = parseHmToMinutes(windowStart)
  const end = parseHmToMinutes(windowEnd)
  if (due == null || start == null || end == null) return false

  if (end < start) {
    return due >= start || due <= end
  }
  return due >= start && due <= end
}

export function marRowMatchesVisitWindow(
  row: { dueTime?: string | null; timeSlot?: string | null },
  windowStart: string | null | undefined,
  windowEnd: string | null | undefined,
): boolean {
  if (dueTimeFallsInHmWindow(row.dueTime, windowStart, windowEnd)) return true
  // timeSlot sometimes stores HH:mm instead of a label
  return dueTimeFallsInHmWindow(row.timeSlot, windowStart, windowEnd)
}

export function compartmentMatchesVisitWindow(
  compartment: { dueTime?: string | null },
  windowStart: string | null | undefined,
  windowEnd: string | null | undefined,
): boolean {
  return dueTimeFallsInHmWindow(compartment.dueTime, windowStart, windowEnd)
}

export function filterCompartmentsForVisitWindow<T extends { dueTime?: string | null }>(
  compartments: T[],
  windowStart: string | null | undefined,
  windowEnd: string | null | undefined,
): T[] {
  if (!windowStart || !windowEnd) return []
  return compartments.filter(c => compartmentMatchesVisitWindow(c, windowStart, windowEnd))
}

export type VisitHmWindow = { start: string; end: string }

/**
 * True when a scheduled dose time is not covered by any visit plan window.
 * PRN / missing dueTime: not flagged (caller should skip).
 * Empty windows list: every timed dose is "not on a visit".
 */
export function dueTimeOutsideAllVisitWindows(
  dueTime: string | null | undefined,
  windows: VisitHmWindow[],
): boolean {
  if (!dueTime?.trim()) return false
  if (windows.length === 0) return true
  return !windows.some(w => dueTimeFallsInHmWindow(dueTime, w.start, w.end))
}
