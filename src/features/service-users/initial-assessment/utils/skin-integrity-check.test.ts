import { describe, expect, it } from 'vitest'
import {
  defaultSkinIntegrityCheckRows,
  patchSkinIntegrityCheckRow,
} from '@/features/service-users/initial-assessment/utils/skin-integrity-check'

describe('patchSkinIntegrityCheckRow', () => {
  it('updates only the matching row right side', () => {
    const rows = defaultSkinIntegrityCheckRows()
    const next = patchSkinIntegrityCheckRow(rows, 'ears', 'right', 'Erythema noted')
    expect(next.find((r) => r.id === 'ears')?.right).toBe('Erythema noted')
    expect(next.find((r) => r.id === 'ears')?.left).toBe('')
    expect(next.find((r) => r.id === 'jaw')?.right).toBe('')
  })

  it('updates only the matching row left side', () => {
    const rows = defaultSkinIntegrityCheckRows()
    const withRight = patchSkinIntegrityCheckRow(rows, 'ears', 'right', 'Right only')
    const next = patchSkinIntegrityCheckRow(withRight, 'ears', 'left', 'Left only')
    expect(next.find((r) => r.id === 'ears')?.right).toBe('Right only')
    expect(next.find((r) => r.id === 'ears')?.left).toBe('Left only')
  })
})
