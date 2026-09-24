import { describe, it, expect } from 'vitest'
import { visitPlanSlotsFromMedicationRounds } from './visit-plan-time-slots.util'
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
