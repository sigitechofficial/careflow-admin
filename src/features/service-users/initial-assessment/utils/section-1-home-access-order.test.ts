import { describe, expect, it } from 'vitest'
import { SECTION_1_HOLISTIC_EXTRA_CANONICAL } from '@/features/service-users/initial-assessment/utils/section-1-holistic-canonical'

describe('Section 1 holistic home-access canonical order', () => {
  it('groups live-alone, front door and keysafe together', () => {
    const texts = [...SECTION_1_HOLISTIC_EXTRA_CANONICAL]
    const start = texts.indexOf('Does the client live alone?')
    expect(start).toBeGreaterThan(-1)
    expect(texts.slice(start, start + 3)).toEqual([
      'Does the client live alone?',
      'Is client able to answer front door?',
      'Key safe present?',
    ])
    expect(texts.filter((text) => text === 'Key safe present?')).toHaveLength(1)
  })

  it('no longer lists the §1.2 key-safe code / access instructions (§3.5 / §3.6 own them)', () => {
    const texts = [...SECTION_1_HOLISTIC_EXTRA_CANONICAL] as string[]
    expect(texts).not.toContain('Key safe code')
    expect(texts).not.toContain('Instructions for gaining access to client’s home')
  })
})
