export type DateDisplayFormat = 'DD_MM_YYYY' | 'MM_DD_YYYY' | 'YYYY_MM_DD'

export type TimeDisplayFormat = 'HH_XX' | 'HH_MM'

export const DEFAULT_DATE_DISPLAY_FORMAT: DateDisplayFormat = 'DD_MM_YYYY'
export const DEFAULT_TIME_DISPLAY_FORMAT: TimeDisplayFormat = 'HH_MM'

function parseToDate(date: Date | string | null | undefined): Date | null {
  if (date == null) return null
  const parsed = date instanceof Date ? date : new Date(date)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function dateParts(
  parsed: Date,
  utc: boolean,
): { year: string; month: string; day: string } {
  const y = utc ? parsed.getUTCFullYear() : parsed.getFullYear()
  const m = String((utc ? parsed.getUTCMonth() : parsed.getMonth()) + 1).padStart(2, '0')
  const d = String(utc ? parsed.getUTCDate() : parsed.getDate()).padStart(2, '0')
  return { year: String(y), month: m, day: d }
}

export function formatDisplayDate(
  isoDate: string,
  format: DateDisplayFormat = DEFAULT_DATE_DISPLAY_FORMAT,
): string {
  const trimmed = isoDate?.trim()
  if (!trimmed) return ''
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (!match) return trimmed
  const [, year, month, day] = match
  switch (format) {
    case 'MM_DD_YYYY':
      return `${month}/${day}/${year}`
    case 'YYYY_MM_DD':
      return `${year}-${month}-${day}`
    case 'DD_MM_YYYY':
    default:
      return `${day}/${month}/${year}`
  }
}

function parseIsoDateLocal(isoDate: string): Date | null {
  const d = new Date(`${isoDate.trim()}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDisplayDateLong(
  isoDate: string,
  format: DateDisplayFormat = DEFAULT_DATE_DISPLAY_FORMAT,
): string {
  const d = parseIsoDateLocal(isoDate)
  if (!d) return isoDate
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' })
  return `${weekday}, ${formatDisplayDate(isoDate, format)}`
}

export function formatDisplayDateShort(
  isoDate: string,
  format: DateDisplayFormat = DEFAULT_DATE_DISPLAY_FORMAT,
): string {
  return formatDisplayDate(isoDate, format)
}

export type DisplayDateOptions = { utc?: boolean }

export function formatDisplayDateFromDate(
  date: Date | string | null | undefined,
  format: DateDisplayFormat = DEFAULT_DATE_DISPLAY_FORMAT,
  options?: DisplayDateOptions,
): string {
  const parsed = parseToDate(date)
  if (!parsed) return ''
  const { year, month, day } = dateParts(parsed, options?.utc === true)
  return formatDisplayDate(`${year}-${month}-${day}`, format)
}

export function formatDisplayTimeFromDate(
  date: Date | string | null | undefined,
  format: TimeDisplayFormat = DEFAULT_TIME_DISPLAY_FORMAT,
  options?: DisplayDateOptions,
): string {
  const parsed = parseToDate(date)
  if (!parsed) return '—'
  const hours = options?.utc === true ? parsed.getUTCHours() : parsed.getHours()
  const minutes = options?.utc === true ? parsed.getUTCMinutes() : parsed.getMinutes()
  if (format === 'HH_XX') return String(hours)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}`
}

export function formatDisplayDateTimeFromDate(
  date: Date | string | null | undefined,
  dateFormat: DateDisplayFormat = DEFAULT_DATE_DISPLAY_FORMAT,
  timeFormat: TimeDisplayFormat = DEFAULT_TIME_DISPLAY_FORMAT,
  options?: DisplayDateOptions,
): string {
  const datePart = formatDisplayDateFromDate(date, dateFormat, options)
  if (!datePart) return '—'
  const timePart = formatDisplayTimeFromDate(date, timeFormat, options)
  return `${datePart} ${timePart}`
}

export function formatDisplayWeekdayShort(isoDate: string): string {
  const d = parseIsoDateLocal(isoDate)
  if (!d) return '—'
  return d.toLocaleDateString('en-GB', { weekday: 'short' })
}

export function formatDisplayTimeFromIso(
  iso: string,
  format: TimeDisplayFormat = DEFAULT_TIME_DISPLAY_FORMAT,
): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const hours = d.getUTCHours()
  if (format === 'HH_XX') return String(hours)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(hours)}:${pad(d.getUTCMinutes())}`
}

export function formatDisplayTimeHm(
  hm: string,
  format: TimeDisplayFormat = DEFAULT_TIME_DISPLAY_FORMAT,
): string {
  const trimmed = hm?.trim()
  if (!trimmed) return '—'
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed)
  if (!match) return trimmed
  const hours = Number(match[1])
  if (format === 'HH_XX') return String(hours)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(hours)}:${match[2]}`
}

export function formatDisplayHourLabel(
  hour: number,
  format: TimeDisplayFormat = DEFAULT_TIME_DISPLAY_FORMAT,
): string {
  if (format === 'HH_XX') return String(hour)
  return `${String(hour).padStart(2, '0')}:00`
}

export function formatDisplayPeriodRange(
  startHour: number,
  endHour: number,
  format: TimeDisplayFormat = DEFAULT_TIME_DISPLAY_FORMAT,
): string {
  const endLabel = endHour >= 24 ? formatDisplayHourLabel(24, format) : formatDisplayHourLabel(endHour, format)
  return `${formatDisplayHourLabel(startHour, format)} – ${endLabel}`
}

export function formatDisplayTimeRangeHm(
  start: string,
  end: string,
  format: TimeDisplayFormat = DEFAULT_TIME_DISPLAY_FORMAT,
): string {
  return `${formatDisplayTimeHm(start, format)} – ${formatDisplayTimeHm(end, format)}`
}

export function timeDisplayFormatLabel(format: TimeDisplayFormat): string {
  if (format === 'HH_XX') return '24-hour without minutes (14)'
  return '24-hour with minutes (14:30)'
}

export function dateDisplayFormatLabel(format: DateDisplayFormat): string {
  switch (format) {
    case 'MM_DD_YYYY':
      return 'MM/DD/YYYY'
    case 'YYYY_MM_DD':
      return 'YYYY-MM-DD'
    case 'DD_MM_YYYY':
    default:
      return 'DD/MM/YYYY'
  }
}

/** Month key `YYYY-MM` formatted per organisation date style (month + year only). */
export function formatDisplayMonthYear(
  month: string,
  format: DateDisplayFormat = DEFAULT_DATE_DISPLAY_FORMAT,
): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month.trim())
  if (!match) return month
  const [, year, mon] = match
  switch (format) {
    case 'MM_DD_YYYY':
      return `${mon}/${year}`
    case 'YYYY_MM_DD':
      return `${year}-${mon}`
    case 'DD_MM_YYYY':
    default:
      return `${mon}/${year}`
  }
}
