import { describe, expect, it } from 'vitest'
import { withSectionHeadings } from '@/features/surveys/survey-sections'

describe('withSectionHeadings', () => {
  it('gives each section heading once, before its first question', () => {
    const rows = withSectionHeadings([
      { id: 'a', sectionTitle: 'Your visits' },
      { id: 'b', sectionTitle: 'Your visits' },
      { id: 'c', sectionTitle: null },
      { id: 'd', sectionTitle: ' Your say ' },
      { id: 'e' },
    ])
    expect(rows.map(r => [r.item.id, r.index, r.heading])).toEqual([
      ['a', 0, 'Your visits'],
      ['b', 1, null],
      ['c', 2, null],
      ['d', 3, 'Your say'],
      ['e', 4, null],
    ])
  })

  it('repeats a heading when a section starts again after another one', () => {
    const rows = withSectionHeadings([{ sectionTitle: 'A' }, { sectionTitle: 'B' }, { sectionTitle: 'A' }])
    expect(rows.map(r => r.heading)).toEqual(['A', 'B', 'A'])
  })
})
