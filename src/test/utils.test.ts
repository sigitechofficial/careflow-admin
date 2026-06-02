import { describe, it, expect } from 'vitest'
import { cn, truncate, initials, slugify, formatCurrency } from '@/shared/lib/utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })
  it('handles conditional classes', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c')
  })
  it('deduplicates tailwind classes', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })
})

describe('truncate', () => {
  it('returns string unchanged if within length', () => {
    expect(truncate('Hello', 10)).toBe('Hello')
  })
  it('truncates long strings', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...')
  })
})

describe('initials', () => {
  it('returns initials from full name', () => {
    expect(initials('Margaret Thompson')).toBe('MT')
  })
  it('handles single name', () => {
    expect(initials('James')).toBe('JA')
  })
})

describe('slugify', () => {
  it('converts text to slug', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })
  it('removes special characters', () => {
    expect(slugify('Accident & Incident')).toBe('accident-incident')
  })
})

describe('formatCurrency', () => {
  it('formats GBP correctly', () => {
    const result = formatCurrency(1250.5)
    expect(result).toContain('1,250')
    expect(result).toContain('Â£')
  })
})
