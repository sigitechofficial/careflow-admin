import { describe, expect, it } from 'vitest'
import {
  LEANING_SVG_MARKER_LABELS,
  leaningMarkerKeyFromElement,
} from '@/features/service-users/body-map/catalog/leaning-svg-marker-labels'

describe('LEANING_SVG_MARKER_LABELS', () => {
  it('maps side-lean elbow marker to Elbow, not Leg', () => {
    expect(LEANING_SVG_MARKER_LABELS['92.885,218.988']?.bodyPart).toBe('Elbow')
  })

  it('maps side-lean shoulder marker to Shoulder, not Inner side of the knee', () => {
    expect(LEANING_SVG_MARKER_LABELS['77.02,207.514']?.bodyPart).toBe('Shoulder')
  })

  it('maps inner knee marker to Inner side of the knee, not Leg', () => {
    expect(LEANING_SVG_MARKER_LABELS['242.554,193.159']?.bodyPart).toBe(
      'Inner side of the knee',
    )
  })

  it('reads marker keys from SVG path elements', () => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    el.setAttribute(
      'd',
      'M92.885,218.988c0-2.741,2.222-4.963,4.963-4.963s4.965,2.222,4.965,4.963-2.223,4.966-4.965,4.966-4.963-2.225-4.963-4.966Z',
    )
    expect(leaningMarkerKeyFromElement(el)).toBe('92.885,218.988')
  })
})
