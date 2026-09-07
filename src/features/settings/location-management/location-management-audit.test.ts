import { describe, expect, it } from 'vitest'
import {
  formatLocationAuditLine,
  LOCATION_AUDIT_HISTORY_SEARCH,
} from './location-management-audit'

describe('formatLocationAuditLine', () => {
  it('returns null when no timestamps exist', () => {
    expect(formatLocationAuditLine({})).toBeNull()
  })

  it('shows added date and actor', () => {
    const line = formatLocationAuditLine({
      createdAt: '2026-09-06T10:00:00.000Z',
      createdByName: 'Super Admin',
    })
    expect(line).toMatch(/^Added /)
    expect(line).toContain('Super Admin')
  })

  it('appends updated when it differs from added', () => {
    const line = formatLocationAuditLine({
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-06T10:00:00.000Z',
      updatedByName: 'Office User',
    })
    expect(line).toContain('Added')
    expect(line).toContain('Updated')
    expect(line).toContain('Office User')
  })
})

describe('LOCATION_AUDIT_HISTORY_SEARCH', () => {
  it('filters the shared audit page to location.* actions', () => {
    expect(LOCATION_AUDIT_HISTORY_SEARCH).toEqual({
      module: 'SCHEDULING',
      search: 'location.',
    })
  })
})
