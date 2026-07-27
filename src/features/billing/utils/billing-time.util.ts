/** Normalise stored time strings to HH:mm for `<input type="time">` (24-hour). */
export function normalizeBillingTimeInput(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return ''
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return trimmed
  const hours = Number(match[1])
  const minutes = match[2]
  if (hours < 0 || hours > 23) return trimmed
  return `${String(hours).padStart(2, '0')}:${minutes}`
}

const MINUTES_PER_DAY = 24 * 60

/** Parse HH:mm (or HH:mm:ss) to minutes from midnight. Returns null if invalid. */
export function parseBillingTimeToMinutes(value: string | null | undefined): number | null {
  const normalized = normalizeBillingTimeInput(value)
  if (!normalized) return null
  const match = normalized.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
}

type MinuteSegment = { start: number; end: number }

/**
 * Expand a clock window into non-wrapping segments.
 * Night bands that cross midnight (e.g. 22:00→07:00) become two segments.
 * Missing times are treated as a full day (00:00–24:00).
 * End is exclusive so adjacent bands that meet (19:00 / 19:00) do not overlap.
 */
export function billingTimeWindowToSegments(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
): MinuteSegment[] {
  const start = parseBillingTimeToMinutes(startTime)
  const end = parseBillingTimeToMinutes(endTime)

  if (start == null && end == null) {
    return [{ start: 0, end: MINUTES_PER_DAY }]
  }

  const startMin = start ?? 0
  // 23:59 is the UI “end of day” — treat as covering through midnight.
  let endMin = end ?? MINUTES_PER_DAY
  if (end != null && end === 23 * 60 + 59) {
    endMin = MINUTES_PER_DAY
  }

  if (endMin > startMin) {
    return [{ start: startMin, end: endMin }]
  }
  if (endMin === startMin) {
    return [{ start: 0, end: MINUTES_PER_DAY }]
  }
  // Wraps midnight.
  return [
    { start: startMin, end: MINUTES_PER_DAY },
    { start: 0, end: endMin },
  ]
}

function segmentsOverlap(a: MinuteSegment, b: MinuteSegment): boolean {
  return a.start < b.end && b.start < a.end
}

/** True when two clock windows overlap (including midnight-wrapping night bands). */
export function billingTimeWindowsOverlap(
  a: { startTime?: string | null; endTime?: string | null },
  b: { startTime?: string | null; endTime?: string | null },
): boolean {
  const aSegs = billingTimeWindowToSegments(a.startTime, a.endTime)
  const bSegs = billingTimeWindowToSegments(b.startTime, b.endTime)
  return aSegs.some(sa => bSegs.some(sb => segmentsOverlap(sa, sb)))
}
