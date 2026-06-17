import { describe, expect, it } from 'vitest'
import {
  collectJobIdsInMarqueeRect,
  normalizeClientRect,
  rectsIntersect,
} from '@/features/scheduling/utils/schedule-jobs-marquee-select.util'

describe('schedule-jobs-marquee-select.util', () => {
  it('normalizes client rects', () => {
    expect(normalizeClientRect(10, 20, 30, 5)).toEqual({
      left: 10,
      top: 5,
      right: 30,
      bottom: 20,
    })
  })

  it('detects rect intersection', () => {
    const a = { left: 0, top: 0, right: 10, bottom: 10 }
    const b = { left: 5, top: 5, right: 15, bottom: 15 }
    const c = { left: 20, top: 20, right: 30, bottom: 30 }
    expect(rectsIntersect(a, b)).toBe(true)
    expect(rectsIntersect(a, c)).toBe(false)
  })

  it('collects job ids intersecting marquee', () => {
    const root = document.createElement('div')
    const inside = document.createElement('div')
    inside.dataset.scheduleJobBlock = ''
    inside.dataset.jobId = 'job-1'
    inside.getBoundingClientRect = () =>
      ({
        left: 20,
        top: 20,
        right: 80,
        bottom: 40,
        width: 60,
        height: 20,
        x: 20,
        y: 20,
        toJSON: () => ({}),
      }) as DOMRect
    const outside = document.createElement('div')
    outside.dataset.scheduleJobBlock = ''
    outside.dataset.jobId = 'job-2'
    outside.getBoundingClientRect = () =>
      ({
        left: 200,
        top: 200,
        right: 260,
        bottom: 220,
        width: 60,
        height: 20,
        x: 200,
        y: 200,
        toJSON: () => ({}),
      }) as DOMRect
    root.append(inside, outside)

    const ids = collectJobIdsInMarqueeRect(root, { left: 0, top: 0, right: 100, bottom: 100 })
    expect(ids).toEqual(['job-1'])
  })
})
