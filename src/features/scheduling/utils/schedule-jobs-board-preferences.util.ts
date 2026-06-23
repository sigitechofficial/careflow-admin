const STORAGE_KEY_PREFIX = 'care-admin-schedule-jobs-board-preferences'

export type ScheduleJobsBoardPreferences = {
  showRunsOnBoard: boolean
}

export const DEFAULT_SCHEDULE_JOBS_BOARD_PREFERENCES: ScheduleJobsBoardPreferences = {
  showRunsOnBoard: false,
}

export function scheduleJobsBoardPreferencesStorageKey(userId?: string | null): string {
  return userId ? `${STORAGE_KEY_PREFIX}:${userId}` : STORAGE_KEY_PREFIX
}

export function loadScheduleJobsBoardPreferences(userId?: string | null): ScheduleJobsBoardPreferences {
  try {
    const raw = localStorage.getItem(scheduleJobsBoardPreferencesStorageKey(userId))
    if (!raw) return { ...DEFAULT_SCHEDULE_JOBS_BOARD_PREFERENCES }
    const parsed = JSON.parse(raw) as Partial<ScheduleJobsBoardPreferences>
    return {
      showRunsOnBoard: parsed.showRunsOnBoard === true,
    }
  } catch {
    return { ...DEFAULT_SCHEDULE_JOBS_BOARD_PREFERENCES }
  }
}

export function saveScheduleJobsBoardPreferences(
  prefs: ScheduleJobsBoardPreferences,
  userId?: string | null,
): void {
  localStorage.setItem(scheduleJobsBoardPreferencesStorageKey(userId), JSON.stringify(prefs))
}
