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

export function formatOrganisationDate(
  date: Date | string | null | undefined,
  options?: DisplayDateOptions,
): string {
  const formatted = formatDisplayDateFromDate(date, dateDisplayFormat, options)
  return formatted || '—'
}

export function formatOrganisationDateTime(
  date: Date | string | null | undefined,
  options?: DisplayDateOptions,
): string {
  return formatDisplayDateTimeFromDate(date, dateDisplayFormat, timeDisplayFormat, options)
}

export function formatOrganisationTime(
  date: Date | string | null | undefined,
  options?: DisplayDateOptions,
): string {
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
