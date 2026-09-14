import { describe, expect, it } from 'vitest'
import { isVisitJobTaskResettable } from '@/features/scheduling/types/visit-job-tasks.types'

describe('isVisitJobTaskResettable', () => {
  it('shows reset when the task has a recorded outcome', () => {
    expect(isVisitJobTaskResettable({ isCompleted: true })).toBe(true)
    expect(isVisitJobTaskResettable({ outcome: 'partial' })).toBe(true)
    expect(isVisitJobTaskResettable({ completedAt: '2026-09-14T08:10:00.000Z' })).toBe(true)
    expect(isVisitJobTaskResettable({ notes: 'Declined — not home' })).toBe(true)
  })

  it('hides reset when the task is still at the initial state', () => {
    expect(isVisitJobTaskResettable({ isCompleted: false })).toBe(false)
    expect(isVisitJobTaskResettable({ isCompleted: false, notes: '  ', recordedValue: '' })).toBe(
      false,
    )
  })
})
