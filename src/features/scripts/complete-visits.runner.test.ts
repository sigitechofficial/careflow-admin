import { describe, expect, it } from 'vitest'
import { actualTimes, givenMedicinePayload, tasksAsDone, visitMedicinesDue } from '@/features/scripts/complete-visits.runner'
import type { MarChartMedicationRow } from '@/features/service-users/api/medication-mar.api'
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

describe('visit medicines', () => {
  const row = (
    name: string,
    dueTime: string,
    state: 'due' | 'recorded' | 'na' | 'prn',
    scheduleType: MarChartMedicationRow['scheduleType'] = 'daily',
  ): MarChartMedicationRow => ({
    medicationId: `m-${name}`,
    scheduleId: `s-${name}`,
    medicationName: name,
    packName: null,
    dose: '1 tablet',
    strength: null,
    routeName: null,
    type: null,
    frequency: null,
    scheduleType,
    timeSlot: dueTime,
    dueTime,
    roundWindowStart: null,
    roundWindowEnd: null,
    startDate: null,
    endDate: null,
    days: [
      {
        day: 16,
        date: '2026-11-16',
        cellState: state,
        recordId: state === 'recorded' ? 'r1' : null,
        statusCode: state === 'recorded' ? 'G' : null,
        statusLabel: null,
        color: null,
        textColor: null,
        requiresReview: false,
      },
    ],
  })

  it('takes the scheduled medicines due inside the visit window, like the Medication tab', () => {
    const { due, alreadyRecorded } = visitMedicinesDue(
      [
        row('Paracetamol', '08:00', 'due'),
        row('Metformin', '08:30', 'recorded'),
        row('Ramipril', '13:00', 'due'),
        row('Not today', '08:00', 'na'),
        row('Oramorph', '08:00', 'prn', 'prn'),
      ],
      '2026-11-16',
      '07:30',
      '09:00',
    )
    expect(due.map((r) => r.medicationName)).toEqual(['Paracetamol'])
    expect(alreadyRecorded.map((r) => r.medicationName)).toEqual(['Metformin'])
  })

  it('records nothing without a visit window', () => {
    expect(visitMedicinesDue([row('Paracetamol', '08:00', 'due')], '2026-11-16', null, '09:00').due).toEqual([])
  })

  it('records the dose as given, for the carer, on the visit, in its MAR slot', () => {
    expect(givenMedicinePayload(row('Paracetamol', '08:00', 'due'), '2026-11-16', '2026-11-16T08:15:00.000Z', 'emp-1', 'visit-1')).toEqual({
      serviceUserMedicationId: 'm-Paracetamol',
      medicationScheduleId: 's-Paracetamol',
      statusCode: 'G',
      scheduledDateTime: '2026-11-16T08:00:00.000Z',
      actualDateTime: '2026-11-16T08:15:00.000Z',
      doseGiven: '1 tablet',
      notes: 'Recorded from Scripts → Visit Completion',
      recordOnBehalfOfCarer: true,
      administeredById: 'emp-1',
      visitId: 'visit-1',
    })
  })
})
