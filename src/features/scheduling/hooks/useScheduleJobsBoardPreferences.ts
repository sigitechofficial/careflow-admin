import * as React from 'react'
import { useAuthStore } from '@/features/auth/store'
import {
  DEFAULT_SCHEDULE_JOBS_BOARD_PREFERENCES,
  loadScheduleJobsBoardPreferences,
  saveScheduleJobsBoardPreferences,
  type ScheduleJobsBoardPreferences,
} from '@/features/scheduling/utils/schedule-jobs-board-preferences.util'

export function useScheduleJobsBoardPreferences() {
  const userId = useAuthStore((s) => s.user?.id)
  const [preferences, setPreferences] = React.useState<ScheduleJobsBoardPreferences>(() =>
    loadScheduleJobsBoardPreferences(userId),
  )

  React.useEffect(() => {
    setPreferences(loadScheduleJobsBoardPreferences(userId))
  }, [userId])

  const setShowRunsOnBoard = React.useCallback(
    (showRunsOnBoard: boolean) => {
      setPreferences((prev) => {
        const next = { ...prev, showRunsOnBoard }
        saveScheduleJobsBoardPreferences(next, userId)
        return next
      })
    },
    [userId],
  )

  const setRotaGapDisplay = React.useCallback(
    (rotaGapDisplay: ScheduleJobsBoardPreferences['rotaGapDisplay']) => {
      setPreferences((prev) => {
        const next = { ...prev, rotaGapDisplay }
        saveScheduleJobsBoardPreferences(next, userId)
        return next
      })
    },
    [userId],
  )

  const resetPreferences = React.useCallback(() => {
    const defaults = { ...DEFAULT_SCHEDULE_JOBS_BOARD_PREFERENCES }
    setPreferences(defaults)
    saveScheduleJobsBoardPreferences(defaults, userId)
  }, [userId])

  return { preferences, setShowRunsOnBoard, setRotaGapDisplay, resetPreferences }
}
