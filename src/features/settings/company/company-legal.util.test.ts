import { describe, expect, it } from 'vitest'
import type { CompanyProfile } from '@/features/settings/api/company-settings-api'
import { companyLegalDraft, companyLegalPayload, parseSicCodes } from './company-legal.util'

describe('company legal & regulatory helpers', () => {
  it('parses SIC codes from comma / space separated text', () => {
    expect(parseSicCodes('86900, 87100 86900;88100')).toEqual(['86900', '87100', '88100'])
    expect(parseSicCodes('  ')).toEqual([])
  })

  it('round-trips the profile into a PATCH payload (blank clears, required codes kept)', () => {
    const draft = companyLegalDraft({
      legalName: 'ALLFOR CARE SERVICES LIMITED',
      companyNumber: '05142064',
      cqcProviderId: '1-101656545',
      companyStatus: 'Active',
      companyType: 'Private Limited Company',
      incorporationDate: '2004-06-01',
      sicCodes: ['86900'],
      registeredAddressLine1: '15 Maswell Park Road',
      registeredAddressLine2: null,
      registeredTown: 'Hounslow',
      registeredCounty: null,
      registeredPostcode: 'TW3 2DL',
      registeredCountry: 'England',
      countryCode: 'GB',
      currency: 'GBP',
      locale: 'en-GB',
    } as CompanyProfile)
    expect(draft.sicCodes).toBe('86900')
    const payload = companyLegalPayload({
      ...draft,
      companyType: '',
      incorporationDate: '',
      currency: ' ',
      countryCode: 'gb',
    })
    expect(payload).toMatchObject({
      legalName: 'ALLFOR CARE SERVICES LIMITED',
      companyNumber: '05142064',
      cqcProviderId: '1-101656545',
      companyType: '',
      incorporationDate: null,
      sicCodes: ['86900'],
      registeredAddressLine2: '',
      countryCode: 'GB',
      currency: undefined,
      locale: 'en-GB',
    })
  })
})
