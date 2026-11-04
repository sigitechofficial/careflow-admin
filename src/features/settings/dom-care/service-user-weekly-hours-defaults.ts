import type { ServiceUserWeeklyHoursSettings } from '@/features/settings/types'

/** Same as the API defaults, used until the settings are saved. */
export const DEFAULT_SERVICE_USER_WEEKLY_HOURS_SETTINGS: ServiceUserWeeklyHoursSettings = {
  changeNeedsApproval: true,
  visitsNeedApproval: true,
  specialVisitsCount: true,
  useTimebank: false,
}
