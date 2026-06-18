import { describe, expect, it } from 'vitest'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  buildRunVisitLabelLines,
  DEFAULT_SCHEDULE_RUNS_DISPLAY_PREFERENCES,
  splitRunVisitLabelLines,
} from '@/features/scheduling/utils/schedule-runs-display-preferences.util'

function job(overrides: Partial<TimelineJob> = {}): TimelineJob {
  return {
    id: 'job-1',
    jobName: 'Morning call',
    status: 'SCHEDULED',
    serviceUserId: 'su-1',
    serviceUser: {
      id: 'su-1',
      firstName: 'Jane',
      lastName: 'Smith',
      location: { id: 'loc-1', name: 'North zone' },
    },
    scheduledStartDateTime: '2026-06-18T09:00:00.000Z',
    scheduledEndDateTime: '2026-06-18T10:00:00.000Z',
    requiredCarers: 1,
    notes: 'Use side entrance',
    scheduleArea: { id: 'area-1', name: 'Area A', code: 'A' },
    allocations: [],
    ...overrides,
  }
}

describe('schedule-runs-display-preferences.util', () => {
  it('builds multi-line labels when lines of data > 1', () => {
    const prefs = {
      ...DEFAULT_SCHEDULE_RUNS_DISPLAY_PREFERENCES,
      labels: {
        ...DEFAULT_SCHEDULE_RUNS_DISPLAY_PREFERENCES.labels,
        clientOrCarerName: true,
        appointmentNotes: true,
        clientRegion: true,
      },
      linesOfData: 2 as const,
    }
    const lines = buildRunVisitLabelLines(job(), prefs)
    expect(lines.length).toBeLessThanOrEqual(2)
    expect(lines[0]).toContain('Jane')
  })

  it('splits segments across requested line count', () => {
    const lines = splitRunVisitLabelLines(['A', 'B', 'C', 'D'], 2)
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('A')
    expect(lines[1]).toContain('C')
  })
})
