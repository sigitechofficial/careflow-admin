import { describe, expect, it } from 'vitest'
import { actualTimes, tasksAsDone } from '@/features/scripts/complete-visits.runner'
import type { VisitJobTaskRow } from '@/features/scheduling/types/visit-job-tasks.types'

const task = (name: string, inputMode: 'tick' | 'value' | 'note' | 'value_and_note', isCompleted = false): VisitJobTaskRow => ({
  assignmentId: `a-${name}`,
  taskCatalogueTaskId: `t-${name}`,
  name,
  categoryName: 'Care',
  groupCode: 'G',
  consentRequired: false,
  supportLevelApplicable: false,
  completionInput: { inputMode, valueLabel: inputMode.startsWith('value') ? 'Reading' : undefined },
  carerInstructions: null,
  priority: 'routine',
  isCompleted,
  recordedValue: null,
  notes: null,
  completedAt: null,
})

describe('tasksAsDone', () => {
  it('ticks tick and note tasks, keeps done ones, and never invents a recorded value', () => {
    const { rows, done, left } = tasksAsDone([
      task('Assisted wash', 'tick'),
      task('Meal prep', 'note'),
      task('Blood pressure', 'value'),
      task('Bed-making', 'tick', true),
    ])
    expect(rows.map((r) => r.isCompleted)).toEqual([true, true, false, true])
    expect(rows[1]!.notes).toBe('Completed as planned')
    expect(rows[2]!.recordedValue).toBeNull()
    expect(done).toHaveLength(3)
    expect(left).toEqual(['Blood pressure — needs reading; record it on the visit'])
  })
})

describe('actualTimes', () => {
  const v = { plannedStart: '2026-11-10T08:00:00.000Z', plannedEnd: '2026-11-10T09:00:00.000Z' }
  it('as planned keeps the planned times', () => {
    expect(actualTimes(v, 'AS_PLANNED')).toEqual({ start: v.plannedStart, end: v.plannedEnd })
  })
  it('a late start moves both times 15 minutes, same length', () => {
    expect(actualTimes(v, 'LATE_START')).toEqual({ start: '2026-11-10T08:15:00.000Z', end: '2026-11-10T09:15:00.000Z' })
  })
  it('an overrun ends 15 minutes later', () => {
    expect(actualTimes(v, 'OVERRUN')).toEqual({ start: v.plannedStart, end: '2026-11-10T09:15:00.000Z' })
  })
})
