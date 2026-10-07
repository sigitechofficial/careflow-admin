import { describe, expect, it } from 'vitest'
import {
  buildIncidentsListSearch,
  EMPTY_INCIDENTS_LIST_URL_STATE,
  hasActiveIncidentsListFilters,
  parseIncidentsListSearch,
  validateIncidentsListSearch,
} from './incidents-list-url-state'

const SU = '3f2c1b0a-1111-4222-8333-444455556666'

describe('incidents list URL state', () => {
  it('drops malformed values', () => {
    expect(
      validateIncidentsListSearch({
        status: 'NOPE',
        severity: 'huge',
        category: 'not-a-uuid',
        from: '01/10/2026',
        page: '0',
        open: 'yes',
        su: 42,
      }),
    ).toEqual({})
  })

  it('normalises severities into a fixed order', () => {
    expect(validateIncidentsListSearch({ severity: 'critical,HIGH,HIGH' })).toEqual({
      severity: 'HIGH,CRITICAL',
    })
  })

  it('round-trips a full state', () => {
    const state = {
      ...EMPTY_INCIDENTS_LIST_URL_STATE,
      search: 'INC-2026',
      status: 'REPORTED' as const,
      severities: ['HIGH' as const, 'CRITICAL' as const],
      openOnly: true,
      dateFrom: '2026-09-01',
      dateTo: '2026-09-30',
      serviceUserId: SU,
      page: 3,
    }
    expect(parseIncidentsListSearch(buildIncidentsListSearch(state))).toEqual(state)
  })

  it('uses a real boolean and number so the router does not quote them', () => {
    expect(validateIncidentsListSearch({ open: '1', page: '3' })).toEqual({ open: true, page: 3 })
    expect(validateIncidentsListSearch({ open: true, page: 3 })).toEqual({ open: true, page: 3 })
  })

  it('keeps page 1 and empty filters out of the URL', () => {
    expect(buildIncidentsListSearch(EMPTY_INCIDENTS_LIST_URL_STATE)).toEqual({})
    expect(hasActiveIncidentsListFilters(EMPTY_INCIDENTS_LIST_URL_STATE)).toBe(false)
    expect(hasActiveIncidentsListFilters({ ...EMPTY_INCIDENTS_LIST_URL_STATE, page: 4 })).toBe(false)
    expect(hasActiveIncidentsListFilters({ ...EMPTY_INCIDENTS_LIST_URL_STATE, employeeId: SU })).toBe(true)
  })
})
