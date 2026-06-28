const STORAGE_KEY_PREFIX = 'care-admin-schedule-jobs-board-preferences'

import type { RotaGapDisplayMode } from '@/features/scheduling/utils/schedule-job-rota-gap.util'

export type ScheduleJobsBoardPreferences = {
  showRunsOnBoard: boolean
  /** How idle/travel gaps are drawn on carer rows in board view. */
  rotaGapDisplay: RotaGapDisplayMode
}

export const DEFAULT_SCHEDULE_JOBS_BOARD_PREFERENCES: ScheduleJobsBoardPreferences = {
  showRunsOnBoard: false,
  rotaGapDisplay: 'both',
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
      rotaGapDisplay:
        parsed.rotaGapDisplay === 'none' ||
        parsed.rotaGapDisplay === 'idle' ||
        parsed.rotaGapDisplay === 'travel' ||
        parsed.rotaGapDisplay === 'both'
          ? parsed.rotaGapDisplay
          : DEFAULT_SCHEDULE_JOBS_BOARD_PREFERENCES.rotaGapDisplay,
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
