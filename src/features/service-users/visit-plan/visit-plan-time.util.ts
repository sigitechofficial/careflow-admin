/** Normalise stored time strings to HH:mm for `<input type="time">`. */
export function normalizeTimeForInput(value: string): string {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return ''
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return trimmed
  const hours = Number(match[1])
  const minutes = match[2]
  if (hours < 0 || hours > 23) return trimmed
  return `${String(hours).padStart(2, '0')}:${minutes}`
}

/** Extract HH:mm from an ISO datetime (UTC). */
export function isoDateTimeToTimeInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

/** Minutes between two HH:mm times on the same calendar day (handles overnight end). */
export function visitDurationMinutes(startHHmm: string, endHHmm: string): number | null {
  const startMatch = /^(\d{2}):(\d{2})$/.exec(startHHmm)
  const endMatch = /^(\d{2}):(\d{2})$/.exec(endHHmm)
  if (!startMatch || !endMatch) return null
  let startMins = Number(startMatch[1]) * 60 + Number(startMatch[2])
  let endMins = Number(endMatch[1]) * 60 + Number(endMatch[2])
  if (endMins <= startMins) endMins += 24 * 60
  return endMins - startMins
}

/** Add minutes to HH:mm; wraps within a 24-hour day. */
export function addMinutesToTime(startHHmm: string, minutes: number): string | null {
  const normalized = normalizeTimeForInput(startHHmm)
  const match = /^(\d{2}):(\d{2})$/.exec(normalized)
  if (!match || minutes <= 0) return null
  let totalMins = Number(match[1]) * 60 + Number(match[2]) + minutes
  totalMins = ((totalMins % (24 * 60)) + 24 * 60) % (24 * 60)
  const hours = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

export function visitPlanEndTimeFromStartAndDuration(
  plannedStartTime: string,
  durationMinutes: number | null | undefined,
): string | null {
  if (durationMinutes == null || durationMinutes <= 0) return null
  const start = normalizeTimeForInput(plannedStartTime)
  if (!start) return null
  return addMinutesToTime(start, durationMinutes)
}
