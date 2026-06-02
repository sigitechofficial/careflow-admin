import { describe, expect, it } from 'vitest'
import {
  ADL_WORKSHEET_ACTIVITY_IDS,
  adlDependencyBand,
  adlWorksheetTotal,
  defaultAdlWorksheetRows,
  isAdlWorksheetComplete,
  normalizeAdlWorksheetRows,
} from '@/features/service-users/initial-assessment/utils/adl-scoring'

describe('adl-scoring', () => {
  it('defines 21 worksheet activities', () => {
    expect(ADL_WORKSHEET_ACTIVITY_IDS).toHaveLength(21)
    expect(defaultAdlWorksheetRows()).toHaveLength(21)
  })

  it('computes total and dependency band', () => {
    const rows = defaultAdlWorksheetRows().map((r, i) => ({ ...r, score: i % 3 }))
    expect(adlWorksheetTotal(rows)).toBeGreaterThan(0)
    expect(adlDependencyBand(0)).toBe('Low support')
    expect(adlDependencyBand(40)).toBe('High support')
  })

  it('requires every activity id to be scored', () => {
    const partial = defaultAdlWorksheetRows().slice(0, 5)
    expect(isAdlWorksheetComplete(partial)).toBe(false)
    expect(isAdlWorksheetComplete(defaultAdlWorksheetRows())).toBe(true)
  })

  it('migrates legacy six-item rows into worksheet ids', () => {
    const legacy = [
      { activity: 'Mobility', score: 2, notes: '' },
      { activity: 'Feeding', score: 1, notes: '' },
    ]
    const normalized = normalizeAdlWorksheetRows(legacy as never)
    expect(normalized.find((r) => r.id === 'walking')?.score).toBe(2)
    expect(normalized.find((r) => r.id === 'eating_drinking')?.score).toBe(1)
  })
})
