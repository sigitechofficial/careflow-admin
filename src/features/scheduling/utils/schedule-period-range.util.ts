import { shiftIsoDate } from '@/features/scheduling/utils/schedule-jobs-timeline.util'

/** Soft cap for multi-day schedule list fetches (parallel day timelines). */
export const MAX_SCHEDULE_FILTER_RANGE_DAYS = 31

export function clampIsoDateToRange(date: string, dateFrom: string, dateTo: string): string {
  const from = dateFrom <= dateTo ? dateFrom : dateTo
  const to = dateFrom <= dateTo ? dateTo : dateFrom
  if (date < from) return from
  if (date > to) return to
  return date
}

/** Inclusive ISO day enumeration, capped at `maxDays` from the start of the range. */
export function enumerateScheduleIsoDays(
  dateFrom: string,
  dateTo: string,
  maxDays = MAX_SCHEDULE_FILTER_RANGE_DAYS,
): string[] {
  const from = dateFrom <= dateTo ? dateFrom : dateTo
  const to = dateFrom <= dateTo ? dateTo : dateFrom
  const days: string[] = []
  let cursor = from
  while (cursor <= to && days.length < maxDays) {
    days.push(cursor)
    cursor = shiftIsoDate(cursor, 1)
  }
  return days
}

export function schedulePeriodDayCount(dateFrom: string, dateTo: string): number {
  const from = dateFrom <= dateTo ? dateFrom : dateTo
  const to = dateFrom <= dateTo ? dateTo : dateFrom
  let count = 0
  let cursor = from
  while (cursor <= to) {
    count += 1
    cursor = shiftIsoDate(cursor, 1)
    if (count > 3660) break
  }
  return count
}
