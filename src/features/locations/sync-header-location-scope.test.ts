import { describe, expect, it } from 'vitest'
import { resolveScopedLocationId } from '@/features/locations/sync-header-location-scope'

describe('resolveScopedLocationId', () => {
  it('keeps current selection for company-wide users', () => {
    expect(resolveScopedLocationId(null, 'loc-a')).toBe('loc-a')
    expect(resolveScopedLocationId(null, null)).toBe(null)
  })

  it('forces the assigned branch when only one is allowed', () => {
    expect(resolveScopedLocationId(['greenwich'], null)).toBe('greenwich')
    expect(resolveScopedLocationId(['greenwich'], 'other')).toBe('greenwich')
    expect(resolveScopedLocationId(['greenwich'], 'greenwich')).toBe('greenwich')
  })

  it('allows switching only inside assigned branches', () => {
    expect(resolveScopedLocationId(['a', 'b'], 'b')).toBe('b')
    expect(resolveScopedLocationId(['a', 'b'], 'c')).toBe('a')
  })
})
