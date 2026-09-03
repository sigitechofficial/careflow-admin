import { describe, expect, it } from 'vitest'
import { addressContactDraftFromDetail } from '@/features/service-users/initial-assessment/components/InitialAssessmentAddressContactField'
import type { ServiceUserDetail } from '@/features/service-users/api'

describe('InitialAssessmentAddressContactField widget source', () => {
  it('reads address/phone/email from the Service User profile, not an IA text blob', () => {
    const empty = addressContactDraftFromDetail({} as ServiceUserDetail)
    expect(empty.addressLine1).toBe('')
    expect(empty.postcode).toBe('')
    expect(empty.phone).toBe('')

    const reloaded = addressContactDraftFromDetail({
      address: {
        addressLine1: '12 Maple Close',
        addressLine2: 'Little Woodhouse',
        town: 'Leeds',
        county: 'West Yorkshire',
        postcode: 'LS1 4AP',
      },
      phone: '0113 496 0123',
      mobile: '07700 900123',
      email: 'qa.client@example.net',
    } as ServiceUserDetail)

    expect(reloaded.addressLine1).toBe('12 Maple Close')
    expect(reloaded.addressLine2).toBe('Little Woodhouse')
    expect(reloaded.town).toBe('Leeds')
    expect(reloaded.county).toBe('West Yorkshire')
    expect(reloaded.postcode).toBe('LS1 4AP')
    expect(reloaded.phone).toBe('0113 496 0123')
    expect(reloaded.mobile).toBe('07700 900123')
    expect(reloaded.email).toBe('qa.client@example.net')
  })
})
