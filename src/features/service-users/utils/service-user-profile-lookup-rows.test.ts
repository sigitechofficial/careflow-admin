import { describe, expect, it } from 'vitest'
import {
  profileLookupSelectRows,
  resolveStoredLookupCode,
} from '@/features/service-users/utils/service-user-profile-lookup-rows'

const ROWS = [
  { id: '1', name: 'English', code: 'ENGLISH' },
  { id: '2', name: 'Welsh', code: 'WELSH' },
]

describe('resolveStoredLookupCode', () => {
  it('resolves legacy name text to code', () => {
    expect(resolveStoredLookupCode('English', ROWS)).toBe('ENGLISH')
  })

  it('keeps unknown legacy values', () => {
    expect(resolveStoredLookupCode('Custom dialect', ROWS)).toBe('Custom dialect')
  })
})

describe('profileLookupSelectRows', () => {
  it('includes a legacy value when it is not in the catalogue', () => {
    const rows = profileLookupSelectRows(ROWS, 'Custom dialect')
    expect(rows[0]?.id).toBe('Custom dialect')
    expect(rows.some((r) => r.id === 'ENGLISH')).toBe(true)
  })
})
