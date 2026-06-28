import { describe, expect, it } from 'vitest'
import { resolveReadableRotaGapBlockLayout } from '@/features/scheduling/components/ScheduleJobRotaGapSegments'

describe('resolveReadableRotaGapBlockLayout', () => {
  it('keeps natural width when already readable', () => {
    expect(resolveReadableRotaGapBlockLayout({ leftPx: 200, widthPx: 120 })).toEqual({
      leftPx: 200,
      widthPx: 120,
      expanded: false,
    })
  })

  it('does not expand left past the natural segment start', () => {
    expect(resolveReadableRotaGapBlockLayout({ leftPx: 300, widthPx: 24 })).toEqual({
      leftPx: 300,
      widthPx: 24,
      expanded: false,
    })
  })

  it('never expands into time before the natural segment start', () => {
    const result = resolveReadableRotaGapBlockLayout({ leftPx: 100, widthPx: 40 })
    expect(result).toEqual({ leftPx: 100, widthPx: 40, expanded: false })
  })
})
