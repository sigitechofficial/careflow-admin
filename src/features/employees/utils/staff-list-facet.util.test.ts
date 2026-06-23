import { describe, expect, it } from 'vitest'
import { staffListFacetOptions } from './staff-list-facet.util'

describe('staffListFacetOptions', () => {
  it('sorts facet rows by count descending with labels', () => {
    const options = staffListFacetOptions(
      [
        { id: 'a', name: 'Alpha' },
        { id: 'b', name: 'Beta' },
      ],
      [
        { id: 'b', count: 5 },
        { id: 'a', count: 2 },
      ],
      [],
    )
    expect(options.map((row) => row.value)).toEqual(['b', 'a'])
    expect(options[0]?.label).toBe('Beta (5)')
  })

  it('includes all lookup rows with zero counts when facets are empty', () => {
    const options = staffListFacetOptions(
      [
        { id: 'a', name: 'Alpha' },
        { id: 'b', name: 'Beta' },
        { id: 'c', name: 'Gamma' },
      ],
      [],
      [],
    )
    expect(options).toHaveLength(3)
    expect(options.every((row) => row.label.endsWith('(0)'))).toBe(true)
  })
})
