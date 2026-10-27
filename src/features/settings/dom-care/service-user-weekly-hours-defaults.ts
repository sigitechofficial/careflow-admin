import type { ServiceUserWeeklyHoursSettings } from '@/features/settings/types'

/** Same as the API defaults: the behaviour built first, used until the settings are saved. */
export const DEFAULT_SERVICE_USER_WEEKLY_HOURS_SETTINGS: ServiceUserWeeklyHoursSettings = {
  changeApproval: 'ALWAYS',
  decreaseAction: 'KEEP_WARN',
  planOverLimit: 'BLOCK',
  extraOverLimit: 'MANAGER_APPROVAL',
  extraApproveRecheck: false,
  extraRejectReasonRequired: true,
  extraEditOverLimit: 'BLOCK',
  bulkOverLimit: 'WARN',
  specialVisitsCount: true,
  specialVisitOverLimit: 'WARN',
  draftOverLimit: 'BLOCK',
  checkWeeks: 12,
}
