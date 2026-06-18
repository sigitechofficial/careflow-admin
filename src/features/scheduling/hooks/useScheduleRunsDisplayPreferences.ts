import * as React from 'react'
import { useAuthStore } from '@/features/auth/store'
import {
  DEFAULT_SCHEDULE_RUNS_DISPLAY_PREFERENCES,
  loadScheduleRunsDisplayPreferences,
  saveScheduleRunsDisplayPreferences,
  type ScheduleRunsDisplayPreferences,
} from '@/features/scheduling/utils/schedule-runs-display-preferences.util'

export function useScheduleRunsDisplayPreferences() {
  const userId = useAuthStore((s) => s.user?.id)
  const [preferences, setPreferences] = React.useState<ScheduleRunsDisplayPreferences>(() =>
    loadScheduleRunsDisplayPreferences(userId),
  )

  React.useEffect(() => {
    setPreferences(loadScheduleRunsDisplayPreferences(userId))
  }, [userId])

  const updatePreferences = React.useCallback(
    (next: ScheduleRunsDisplayPreferences) => {
      setPreferences(next)
      saveScheduleRunsDisplayPreferences(next, userId)
    },
    [userId],
  )

  const resetPreferences = React.useCallback(() => {
    const defaults = {
      ...DEFAULT_SCHEDULE_RUNS_DISPLAY_PREFERENCES,
      labels: { ...DEFAULT_SCHEDULE_RUNS_DISPLAY_PREFERENCES.labels },
    }
    updatePreferences(defaults)
  }, [updatePreferences])

  return { preferences, updatePreferences, resetPreferences }
}
