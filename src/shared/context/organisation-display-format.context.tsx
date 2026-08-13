import * as React from 'react'
import { useAuthStore } from '@/features/auth/store'
import { useGeneralSettings } from '@/features/settings/hooks/useGeneralSettings'
import {
  DEFAULT_DATE_DISPLAY_FORMAT,
  DEFAULT_TIME_DISPLAY_FORMAT,
  formatDisplayDateLong,
  formatDisplayDateShort,
  formatDisplayHourLabel,
  formatDisplayPeriodRange,
  formatDisplayTimeFromIso,
  formatDisplayTimeHm,
  formatDisplayTimeRangeHm,
  formatDisplayWeekdayShort,
  type DateDisplayFormat,
  type TimeDisplayFormat,
} from '@/shared/lib/display-format.util'
import {
  getOrganisationDisplayFormats,
  syncOrganisationDisplayFormats,
} from '@/shared/lib/organisation-display-format.store'
import {
  DEFAULT_OPERATIONAL_TIMEZONE,
  syncOrganisationOperationalTimezone,
} from '@/shared/lib/operational-day.util'
import type { ScheduleJobsDayPeriodBand } from '@/features/scheduling/utils/schedule-jobs-timeline.util'

export type OrganisationDisplayFormatters = {
  dateDisplayFormat: DateDisplayFormat
  timeDisplayFormat: TimeDisplayFormat
  formatDate: (isoDate: string) => string
  formatDateLong: (isoDate: string) => string
  formatWeekdayShort: (isoDate: string) => string
  formatTime: (iso: string) => string
  formatTimeHm: (hm: string) => string
  formatTimeRangeHm: (start: string, end: string) => string
  formatHourLabel: (hour: number) => string
  formatPeriodRange: (band: ScheduleJobsDayPeriodBand) => string
}

function buildFormatters(
  dateDisplayFormat: DateDisplayFormat,
  timeDisplayFormat: TimeDisplayFormat,
): OrganisationDisplayFormatters {
  return {
    dateDisplayFormat,
    timeDisplayFormat,
    formatDate: (isoDate) => formatDisplayDateShort(isoDate, dateDisplayFormat),
    formatDateLong: (isoDate) => formatDisplayDateLong(isoDate, dateDisplayFormat),
    formatWeekdayShort: formatDisplayWeekdayShort,
    formatTime: (iso) => formatDisplayTimeFromIso(iso, timeDisplayFormat),
    formatTimeHm: (hm) => formatDisplayTimeHm(hm, timeDisplayFormat),
    formatTimeRangeHm: (start, end) => formatDisplayTimeRangeHm(start, end, timeDisplayFormat),
    formatHourLabel: (hour) => formatDisplayHourLabel(hour, timeDisplayFormat),
    formatPeriodRange: (band) =>
      formatDisplayPeriodRange(band.startHour, band.endHour, timeDisplayFormat),
  }
}

const DEFAULT_FORMATTERS = buildFormatters(DEFAULT_DATE_DISPLAY_FORMAT, DEFAULT_TIME_DISPLAY_FORMAT)

const OrganisationDisplayFormatContext = React.createContext<OrganisationDisplayFormatters | null>(
  null,
)

export function OrganisationDisplayFormatProvider({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const { data } = useGeneralSettings(Boolean(accessToken))
  const dateDisplayFormat = data?.dateDisplayFormat ?? DEFAULT_DATE_DISPLAY_FORMAT
  const timeDisplayFormat = data?.timeDisplayFormat ?? DEFAULT_TIME_DISPLAY_FORMAT
  const operationalTimezone = data?.timezone ?? DEFAULT_OPERATIONAL_TIMEZONE

  React.useEffect(() => {
    syncOrganisationDisplayFormats(dateDisplayFormat, timeDisplayFormat)
  }, [dateDisplayFormat, timeDisplayFormat])

  React.useEffect(() => {
    syncOrganisationOperationalTimezone(operationalTimezone)
  }, [operationalTimezone])

  const value = React.useMemo(
    () => buildFormatters(dateDisplayFormat, timeDisplayFormat),
    [dateDisplayFormat, timeDisplayFormat],
  )

  return (
    <OrganisationDisplayFormatContext.Provider value={value}>
      {children}
    </OrganisationDisplayFormatContext.Provider>
  )
}

export function useOrganisationDisplayFormat(): OrganisationDisplayFormatters {
  return React.useContext(OrganisationDisplayFormatContext) ?? DEFAULT_FORMATTERS
}

/** Non-React callers (utils, pure functions) read the last synced organisation formats. */
export function useOrganisationDisplayFormatsFromStore(): {
  dateDisplayFormat: DateDisplayFormat
  timeDisplayFormat: TimeDisplayFormat
} {
  return getOrganisationDisplayFormats()
}
