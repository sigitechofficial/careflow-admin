import { describe, expect, it } from 'vitest'
import {
  resolveTravelTimingStatus,
  TRAVEL_TIGHT_SPARE_MINUTES,
} from '@/features/scheduling/utils/schedule-job-travel-timing.util'

describe('schedule-job-travel-timing.util', () => {
  it('marks conflict when gap is shorter than travel plus buffer', () => {
    expect(resolveTravelTimingStatus(20, 21, 5)).toBe('conflict')
  })

  it('marks tight when spare minutes are within threshold', () => {
    expect(resolveTravelTimingStatus(26, 21, 5)).toBe('tight')
    expect(resolveTravelTimingStatus(26 + TRAVEL_TIGHT_SPARE_MINUTES, 21, 5)).toBe('tight')
  })

  it('marks ok when there is comfortable spare time', () => {
    expect(resolveTravelTimingStatus(40, 21, 5)).toBe('ok')
  })
})
