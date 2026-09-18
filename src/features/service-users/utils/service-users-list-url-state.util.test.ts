import { describe, expect, it } from 'vitest'
import type { ServiceUserLookupsBundle } from '@/features/service-users/types'
import { DEFAULT_SERVICE_USER_STATUS_CODE } from '@/features/service-users/utils/service-users-list-query'
import {
  buildServiceUsersListSearch,
  enrichServiceUsersListUrlState,
  parseServiceUsersListSearch,
  validateServiceUsersListSearch,
} from '@/features/service-users/utils/service-users-list-url-state.util'

describe('service-users-list-url-state', () => {
  it('defaults to active status and page 1', () => {
    const state = parseServiceUsersListSearch({})
    expect(state.statusFilter).toBe(DEFAULT_SERVICE_USER_STATUS_CODE)
    expect(state.page).toBe(1)
    expect(state.listFilter).toBeNull()
    expect(state.advanced.hasActiveFlashMessage).toBe(false)
  })

  it('round-trips filters through search params', () => {
    const search = buildServiceUsersListSearch({
      search: 'jane',
      kwSearch: 'ann',
      statusFilter: 'ON_HOLD',
      listFilter: 'discharged',
      riskFilter: 'CRITICAL',
      unassignedOnly: true,
      onHoldOnly: false,
      page: 2,
      advanced: {
        ageMin: 65,
        ageMax: 90,
        careTypeId: 'ct-1',
        fundingTypeId: 'ft-1',
        serviceStartDateFrom: '2026-01-01',
        serviceStartDateTo: '2026-03-31',
        dateOfDeathFrom: '2026-02-01T09:15',
        dateOfDeathTo: '2026-02-01T18:45',
        carePlanListStatus: 'overdue',
        carePlanFormIds: ['f1', 'f2'],
        medicalConditionIds: ['c1'],
        initialAssessmentStatus: 'completed',
        missedVisitsMin: 3,
        missedVisitsFrom: '2026-02-01',
        missedVisitsTo: '2026-02-28',
        hasActiveFlashMessage: true,
        hospitalisedOnly: true,
        loneWorkerRisk: true,
        verbalAltercation: true,
        physicalAltercation: false,
        physicalAbuseToSu: true,
        domesticViolence: false,
        safeguardingHistory: true,
      },
    })
    expect(search).toMatchObject({
      q: 'jane',
      kw: 'ann',
      status: 'ON_HOLD',
      list: 'discharged',
      risk: 'CRITICAL',
      unassigned: '1',
      page: '2',
      ageMin: '65',
      ageMax: '90',
      carePlans: 'f1,f2',
      conditions: 'c1',
      missedMin: '3',
      flash: '1',
      hospitalised: '1',
      loneWorker: '1',
      verbal: '1',
      physicalAbuseSu: '1',
      safeguarding: '1',
      dodFrom: '2026-02-01T09:15',
      dodTo: '2026-02-01T18:45',
    })
    expect(search.onHold).toBeUndefined()
    expect(search.physical).toBeUndefined()

    const parsed = parseServiceUsersListSearch(search)
    expect(parsed.search).toBe('jane')
    expect(parsed.kwSearch).toBe('ann')
    expect(parsed.statusFilter).toBe('ON_HOLD')
    expect(parsed.listFilter).toBe('discharged')
    expect(parsed.riskFilter).toBe('CRITICAL')
    expect(parsed.unassignedOnly).toBe(true)
    expect(parsed.page).toBe(2)
    expect(parsed.advanced.ageMin).toBe(65)
    expect(parsed.advanced.carePlanFormIds).toEqual(['f1', 'f2'])
    expect(parsed.advanced.missedVisitsMin).toBe(3)
    expect(parsed.advanced.hasActiveFlashMessage).toBe(true)
    expect(parsed.advanced.physicalAltercation).toBe(false)
    expect(parsed.advanced.dateOfDeathFrom).toBe('2026-02-01T09:15')
    expect(parsed.advanced.dateOfDeathTo).toBe('2026-02-01T18:45')
  })

  it('omits default active status from search', () => {
    expect(
      buildServiceUsersListSearch({
        search: '',
        kwSearch: '',
        statusFilter: DEFAULT_SERVICE_USER_STATUS_CODE,
        listFilter: null,
        riskFilter: null,
        unassignedOnly: false,
        onHoldOnly: false,
        page: 1,
        advanced: {},
      }),
    ).toEqual({})
  })

  it('enriches care/funding labels from lookups', () => {
    const lookups = {
      careTypes: [{ id: 'ct-1', name: 'Domiciliary', code: 'DOM' }],
      fundingTypes: [{ id: 'ft-1', name: 'Local authority', code: 'LA' }],
    } as unknown as ServiceUserLookupsBundle
    const enriched = enrichServiceUsersListUrlState(
      parseServiceUsersListSearch({ careType: 'ct-1', fundingType: 'ft-1' }),
      lookups,
    )
    expect(enriched.advanced.careTypeLabel).toBe('Domiciliary')
    expect(enriched.advanced.fundingTypeLabel).toBe('Local authority')
  })

  it('validateSearch keeps only known string keys', () => {
    expect(
      validateServiceUsersListSearch({
        q: ' a ',
        junk: 'x',
        page: 3,
        flash: true,
      } as Record<string, unknown>),
    ).toEqual({ q: 'a', page: '3' })
  })
})
