import { describe, expect, it } from 'vitest'
import { SECTION_1_HOLISTIC_EXTRA_CANONICAL } from '@/features/service-users/initial-assessment/utils/section-1-holistic-canonical'

describe('Section 1 holistic home-access canonical order', () => {
  it('groups live-alone, front door, keysafe, and access instructions together', () => {
    const texts = [...SECTION_1_HOLISTIC_EXTRA_CANONICAL]
    const start = texts.indexOf('Does the client live alone?')
    expect(start).toBeGreaterThan(-1)
    expect(texts.slice(start, start + 5)).toEqual([
      'Does the client live alone?',
      'Is client able to answer front door?',
      'Key safe present?',
      'Key safe code',
      'Instructions for gaining access to client’s home',
    ])
    expect(texts.filter((text) => text === 'Key safe present?')).toHaveLength(1)
    expect(texts.filter((text) => text === 'Key safe code')).toHaveLength(1)
  })
})
