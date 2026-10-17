import { describe, it, expect } from 'vitest'
import {
  isAdditionalVisitSlotCode,
  nextAdditionalVisitSlotCode,
  visitPlanSlotRoundCode,
  visitPlanSlotsFromMedicationRounds,
} from './visit-plan-time-slots.util'
import type { VisitPlanSlot } from './types'

const round = (code: string, name: string, sortOrder: number) => ({
  id: `r-${code}`,
  name,
  code,
  time: '08:00',
  windowStart: '07:00',
  windowEnd: '09:00',
  sortOrder,
})

const ROUNDS = [round('MORNING', 'Morning', 0), round('EVENING', 'Evening', 1)]

describe('visitPlanSlotsFromMedicationRounds — carers default', () => {
  it('defaults new slots to 1 carer when no option is given', () => {
    const slots = visitPlanSlotsFromMedicationRounds(ROUNDS)
    expect(slots.every((s) => s.requiredCarers === 1)).toBe(true)
  })

  it('defaults new slots to defaultRequiredCarers (2) when the lone-worker flag is set', () => {
    const slots = visitPlanSlotsFromMedicationRounds(ROUNDS, undefined, { defaultRequiredCarers: 2 })
    expect(slots.every((s) => s.requiredCarers === 2)).toBe(true)
  })

  it('never overrides a saved slot’s explicit carers value (prev wins)', () => {
    const existing = [{ slotCode: 'MORNING', requiredCarers: 1 } as VisitPlanSlot]
    const slots = visitPlanSlotsFromMedicationRounds(ROUNDS, existing, { defaultRequiredCarers: 2 })
    const morning = slots.find((s) => s.slotCode === 'MORNING')
    const evening = slots.find((s) => s.slotCode === 'EVENING')
    expect(morning?.requiredCarers).toBe(1) // saved value preserved
    expect(evening?.requiredCarers).toBe(2) // new slot uses the flagged default
  })
})

describe('several visits in one time slot', () => {
  const morning2 = {
    slotCode: 'MORNING__2',
    medicationRoundCode: 'MORNING',
    label: 'Morning',
    isEnabled: true,
    plannedStartTime: '09:00',
    plannedEndTime: '09:30',
    daysOfWeek: [1, 2],
    requiredCarers: 1,
  } as VisitPlanSlot

  it('keeps a saved additional visit row right after its time slot', () => {
    const slots = visitPlanSlotsFromMedicationRounds(ROUNDS, [morning2])
    expect(slots.map((s) => s.slotCode)).toEqual(['MORNING', 'MORNING__2', 'EVENING'])
    expect(slots[1]).toMatchObject({ label: 'Morning', medicationRoundCode: 'MORNING', plannedStartTime: '09:00' })
  })

  it('leaves plans without additional rows exactly as before', () => {
    expect(visitPlanSlotsFromMedicationRounds(ROUNDS).map((s) => s.slotCode)).toEqual(['MORNING', 'EVENING'])
  })

  it('drops rows whose time slot no longer exists and hidden extra-visit host rows', () => {
    const orphan = { ...morning2, slotCode: 'LATE__2', medicationRoundCode: 'LATE' } as VisitPlanSlot
    const host = { ...morning2, slotCode: 'MORNING__X', isEnabled: false } as VisitPlanSlot
    expect(visitPlanSlotsFromMedicationRounds(ROUNDS, [orphan, host]).map((s) => s.slotCode)).toEqual([
      'MORNING',
      'EVENING',
    ])
  })

  it('names the next row and resolves the time slot of a row', () => {
    expect(nextAdditionalVisitSlotCode('MORNING', [{ slotCode: 'MORNING' }])).toBe('MORNING__2')
    expect(nextAdditionalVisitSlotCode('MORNING', [{ slotCode: 'MORNING' }, { slotCode: 'MORNING__2' }])).toBe('MORNING__3')
    expect(visitPlanSlotRoundCode(morning2)).toBe('MORNING')
    expect(visitPlanSlotRoundCode({ slotCode: 'LUNCH', medicationRoundCode: null })).toBe('MIDDAY')
    expect(isAdditionalVisitSlotCode('MORNING__2')).toBe(true)
    expect(isAdditionalVisitSlotCode('MORNING__X')).toBe(false)
  })
})
