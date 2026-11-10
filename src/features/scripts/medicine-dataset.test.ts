import { describe, expect, it } from 'vitest'
import { MEDICINE_DATASET, pickDatasetMedicines } from '@/features/scripts/medicine-dataset'

describe('pickDatasetMedicines', () => {
  it('picks the asked number of Regular medicines, usual for the round first', () => {
    const picked = pickDatasetMedicines('MORNING', 3, [])
    expect(picked).toHaveLength(3)
    expect(picked.every((m) => m.kind === 'REGULAR')).toBe(true)
    expect(picked.every((m) => m.rounds.includes('MORNING'))).toBe(true)
  })

  it('never picks one already active (any case or spacing) or already on the visits', () => {
    const regularNames = MEDICINE_DATASET.filter((m) => m.kind === 'REGULAR').map((m) => m.name)
    const keep = regularNames.slice(0, 2)
    const exclude = regularNames.slice(2).map((n) => `  ${n.toUpperCase()} `)
    const picked = pickDatasetMedicines('NIGHT', 5, exclude)
    expect(picked.map((m) => m.name).sort()).toEqual([...keep].sort())
  })

  it('returns none for a count of 0 and no duplicates', () => {
    expect(pickDatasetMedicines('EVENING', 0, [])).toEqual([])
    const names = pickDatasetMedicines('EVENING', 10, []).map((m) => m.name)
    expect(new Set(names).size).toBe(names.length)
  })
})
