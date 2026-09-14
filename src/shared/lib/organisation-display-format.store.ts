import {
  DEFAULT_DATE_DISPLAY_FORMAT,
  DEFAULT_TIME_DISPLAY_FORMAT,
  formatDisplayDateFromDate,
  formatDisplayDateLong,
  formatDisplayDateShort,
  formatDisplayDateTimeFromDate,
  formatDisplayHourLabel,
  formatDisplayPeriodRange,
  formatDisplayTimeFromDate,
  formatDisplayTimeFromIso,
  formatDisplayTimeHm,
  formatDisplayTimeRangeHm,
  formatDisplayWeekdayShort,
  formatDisplayMonthYear,
  type DateDisplayFormat,
  type DisplayDateOptions,
  type TimeDisplayFormat,
} from '@/shared/lib/display-format.util'
import { dayKeyFromInstant, formatOpsHm } from '@/shared/lib/operational-day.util'

let dateDisplayFormat: DateDisplayFormat = DEFAULT_DATE_DISPLAY_FORMAT
let timeDisplayFormat: TimeDisplayFormat = DEFAULT_TIME_DISPLAY_FORMAT

export function syncOrganisationDisplayFormats(
  date: DateDisplayFormat,
  time: TimeDisplayFormat,
): void {
  dateDisplayFormat = date
  timeDisplayFormat = time
}

export function getOrganisationDisplayFormats(): {
  dateDisplayFormat: DateDisplayFormat
  timeDisplayFormat: TimeDisplayFormat
} {
  return { dateDisplayFormat, timeDisplayFormat }
}

function toIsoInstant(date: Date | string): string | null {
  if (typeof date === 'string') {
    const trimmed = date.trim()
    if (!trimmed) return null
    return trimmed
  }
  if (date instanceof Date && !Number.isNaN(date.getTime())) return date.toISOString()
  return null
}

/**
 * Calendar date in organisation display format.
 * ISO instants use the organisation operational timezone (not browser local).
 * Pass `{ utc: true }` for civil YYYY-MM-DD markers stored as UTC noon/midnight.
 */
export function formatOrganisationDate(
  date: Date | string | null | undefined,
  options?: DisplayDateOptions,
): string {
  if (date == null || date === '') return '—'
  if (options?.utc === true) {
    return formatDisplayDateFromDate(date, dateDisplayFormat, options) || '—'
  }
  if (typeof date === 'string') {
    const trimmed = date.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return formatDisplayDateShort(trimmed, dateDisplayFormat)
    }
  }
  const iso = toIsoInstant(date)
  if (iso && (iso.includes('T') || iso.includes(' '))) {
    const day = dayKeyFromInstant(iso)
    if (day) return formatDisplayDateShort(day, dateDisplayFormat)
  }
  return formatDisplayDateFromDate(date, dateDisplayFormat, options) || '—'
}

/**
 * Date + time in organisation display formats.
 * ISO instants / Date objects use the organisation operational timezone.
 */
export function formatOrganisationDateTime(
  date: Date | string | null | undefined,
  options?: DisplayDateOptions,
): string {
  if (date == null || date === '') return '—'
  if (options?.utc === true) {
    return formatDisplayDateTimeFromDate(date, dateDisplayFormat, timeDisplayFormat, options)
  }
  const iso = toIsoInstant(date as Date | string)
  if (iso && (iso.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(iso))) {
    const day = dayKeyFromInstant(iso)
    const hm = formatOpsHm(iso)
    if (day && hm) {
      return `${formatDisplayDateShort(day, dateDisplayFormat)} ${formatDisplayTimeHm(hm, timeDisplayFormat)}`
    }
    if (day) return formatDisplayDateShort(day, dateDisplayFormat)
  }
  return formatDisplayDateTimeFromDate(date, dateDisplayFormat, timeDisplayFormat, options)
}

/** Clock time in organisation display format (operational timezone for instants). */
export function formatOrganisationTime(
  date: Date | string | null | undefined,
  options?: DisplayDateOptions,
): string {
  if (date == null || date === '') return '—'
  if (options?.utc === true) {
    return formatDisplayTimeFromDate(date, timeDisplayFormat, options)
  }
  const iso = toIsoInstant(date as Date | string)
  if (iso && iso.includes('T')) {
    return formatDisplayTimeFromIso(iso, timeDisplayFormat)
  }
  return formatDisplayTimeFromDate(date, timeDisplayFormat, options)
}

export function formatOrganisationIsoDate(isoDate: string): string {
  return formatDisplayDateShort(isoDate, dateDisplayFormat)
}

export function formatOrganisationIsoDateLong(isoDate: string): string {
  return formatDisplayDateLong(isoDate, dateDisplayFormat)
}

export function formatOrganisationIsoTime(iso: string): string {
  return formatDisplayTimeFromIso(iso, timeDisplayFormat)
}

export function formatOrganisationTimeHm(hm: string): string {
  return formatDisplayTimeHm(hm, timeDisplayFormat)
}

export function formatOrganisationTimeRangeHm(start: string, end: string): string {
  return formatDisplayTimeRangeHm(start, end, timeDisplayFormat)
}

export function formatOrganisationHourLabel(hour: number): string {
  return formatDisplayHourLabel(hour, timeDisplayFormat)
}

export function formatOrganisationPeriodRange(startHour: number, endHour: number): string {
  return formatDisplayPeriodRange(startHour, endHour, timeDisplayFormat)
}

export function formatOrganisationWeekdayShort(isoDate: string): string {
  return formatDisplayWeekdayShort(isoDate)
}

export function formatOrganisationMonthYear(month: string): string {
  return formatDisplayMonthYear(month, dateDisplayFormat)
}
