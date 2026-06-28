import { describe, expect, it, beforeEach } from 'vitest'
import {
  DEFAULT_SCHEDULE_JOBS_BOARD_PREFERENCES,
  loadScheduleJobsBoardPreferences,
  saveScheduleJobsBoardPreferences,
} from '@/features/scheduling/utils/schedule-jobs-board-preferences.util'

describe('schedule-jobs-board-preferences.util', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults showRunsOnBoard to false', () => {
    expect(loadScheduleJobsBoardPreferences()).toEqual(DEFAULT_SCHEDULE_JOBS_BOARD_PREFERENCES)
  })

  it('persists showRunsOnBoard', () => {
    saveScheduleJobsBoardPreferences({ showRunsOnBoard: true, rotaGapDisplay: 'both' })
    expect(loadScheduleJobsBoardPreferences().showRunsOnBoard).toBe(true)
  })

  it('persists rotaGapDisplay', () => {
    saveScheduleJobsBoardPreferences({ showRunsOnBoard: false, rotaGapDisplay: 'idle' })
    expect(loadScheduleJobsBoardPreferences().rotaGapDisplay).toBe('idle')
  })
})
