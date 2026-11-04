import { describe, expect, it } from 'vitest'
import { serviceUserMissingItems } from '@/features/service-users/dashboard/service-user-missing-items'
import type { ServiceUserDetail } from '@/features/service-users/types'

const ref = { id: 'x', name: 'X', code: 'X' }

function complete(): ServiceUserDetail {
  return {
    id: 'su-1',
    firstName: 'Ann',
    lastName: 'Lee',
    dateOfBirth: '1940-01-01',
    nhsNumber: '9434765919',
    gender: ref,
    phone: '01234 567890',
    mobile: null,
    profilePhotoUrl: '/photo.jpg',
    profilePhoto: null,
    careType: ref,
    serviceStartDate: '2026-01-01',
    fundingType: ref,
    riskLevel: { ...ref, color: null },
    keyWorker: { id: 'e1' },
    assignment: null,
    contacts: [{ id: 'c1', firstName: 'Bob', isPrimary: true, isEmergencyContact: true }],
    address: {
      addressLine1: '1 High St',
      postcode: 'SW1A 2DD',
      accessMethod: 'key_safe',
      keySafeNumber: '1234',
      keySafeLocation: 'By the back door',
      accessInstructions: 'Ring twice',
    },
  } as unknown as ServiceUserDetail
}

const base = {
  allergyCount: 1,
  activeMedicationCount: 2,
  visitPlanStatus: 'ACTIVE',
  primaryFunding: { fundingTypeName: 'Local authority', reviewDate: '2027-01-01' },
}

describe('serviceUserMissingItems', () => {
  it('a complete record has nothing missing', () => {
    expect(serviceUserMissingItems({ ...base, detail: complete() })).toEqual([])
  })

  it('lists every missing item with where to fix it', () => {
    const d = {
      ...complete(),
      dateOfBirth: null,
      nhsNumber: null,
      gender: null,
      phone: null,
      profilePhotoUrl: null,
      careType: null,
      serviceStartDate: null,
      riskLevel: null,
      keyWorker: null,
      contacts: [],
      address: { addressLine1: null, postcode: null, accessMethod: null, keySafeNumber: null, keySafeLocation: null, accessInstructions: null },
    } as unknown as ServiceUserDetail
    const items = serviceUserMissingItems({
      detail: d,
      allergyCount: 0,
      activeMedicationCount: 0,
      visitPlanStatus: 'DRAFT',
      primaryFunding: { fundingTypeName: 'Direct payment', reviewDate: null },
    })
    const byId = Object.fromEntries(items.map((i) => [i.id, i]))
    expect(Object.keys(byId).sort()).toEqual(
      [
        'access-instructions',
        'access-method',
        'address',
        'allergies',
        'care-type',
        'contacts',
        'dob',
        'funding-review',
        'gender',
        'key-worker',
        'medication',
        'nhs',
        'phone',
        'photo',
        'risk-level',
        'service-start',
        'visit-plan-not-active',
      ].sort(),
    )
    // Links open the right tab and field.
    expect(byId['risk-level']).toMatchObject({ to: '/service-users/$serviceUserId/profile', search: { tab: 'personal', focus: 'Risk level' } })
    expect(byId['dob'].search).toEqual({ tab: 'personal', focus: 'Date of Birth' })
    expect(byId['address'].search).toEqual({ tab: 'dom', focus: 'Service location' })
    expect(byId['access-method'].search).toEqual({ tab: 'dom', focus: 'How to enter the home' })
    expect(byId['allergies'].search).toEqual({ tab: 'allergies' })
    expect(byId['contacts'].search).toEqual({ tab: 'contacts' })
    expect(byId['funding-review'].search).toEqual({ tab: 'funding' })
    expect(byId['medication'].to).toBe('/service-users/$serviceUserId/medication')
    expect(byId['visit-plan-not-active']).toMatchObject({ to: '/service-users/$serviceUserId/visit-plan', detail: expect.stringContaining('draft') })
  })

  it('narrower checks: emergency contact, key safe details, funding route', () => {
    const d = {
      ...complete(),
      fundingType: null,
      contacts: [{ id: 'c1', firstName: 'Bob', isPrimary: true, isEmergencyContact: false }],
      address: { ...complete().address, keySafeNumber: null },
    } as unknown as ServiceUserDetail
    const ids = serviceUserMissingItems({ ...base, detail: d, primaryFunding: null }).map((i) => i.id)
    expect(ids).toEqual(['funding', 'emergency-contact', 'key-safe'])
  })

  it('does not repeat what "Needs attention" already shows (no visit plan / suspended plan)', () => {
    expect(serviceUserMissingItems({ ...base, detail: complete(), visitPlanStatus: null })).toEqual([])
    expect(serviceUserMissingItems({ ...base, detail: complete(), visitPlanStatus: 'SUSPENDED' })).toEqual([])
  })
})
