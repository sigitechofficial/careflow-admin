import { describe, expect, it } from 'vitest'
import type { LocationTreeBranch } from './location-management.types'
import {
  addBranchDetailsPayload,
  addListItem,
  applyGoogleAddress,
  branchFormToPayload,
  branchToForm,
  cleanList,
  EMPTY_ADD_BRANCH_CQC,
  formatCqcRating,
  ratingChoiceFrom,
  ratingFieldsFromChoice,
  removeListItem,
  updateListItem,
} from './branch-form.util'

const HOUNSLOW: LocationTreeBranch = {
  id: 'sa-1',
  name: 'Allfor Care Hounslow',
  scheduleAreaId: 'sa-1',
  locationId: 'loc-1',
  locationName: 'Allfor Care Hounslow',
  address: '15 Maswell Park Road, Hounslow TW3 2DL',
  visitRefCode: 'HOU',
  areas: [],
  children: [],
  cqcLocationId: '1-115898258',
  officialCqcName: 'Allfor Care Alpha Care Recruitment West and Home Care Service Limited',
  addressLine1: '15 Maswell Park Road',
  addressLine2: null,
  town: 'Hounslow',
  county: 'Middlesex',
  postcode: 'TW3 2DL',
  country: 'England',
  countryCode: 'GB',
  localAuthority: 'Hounslow',
  phone: '020 8898 2867',
  email: null,
  website: 'https://www.allforcare.co.uk',
  serviceTypes: ['Homecare agency'],
  regulatedActivities: ['Personal care'],
  registeredManagers: ['Mrs Suzette Thomas'],
  nominatedIndividual: 'Mrs Suzette Thomas',
  cqcRegistrationDate: null,
  cqcRating: null,
  cqcRatingStatus: null,
  status: 'ACTIVE',
  timezone: 'Europe/London',
  currency: 'GBP',
  locale: 'en-GB',
  latitude: null,
  longitude: null,
}

describe('editable list helpers', () => {
  it('adds an empty row, edits it and removes by index', () => {
    let list = ['Mrs Suzette Thomas']
    list = addListItem(list)
    expect(list).toEqual(['Mrs Suzette Thomas', ''])
    list = updateListItem(list, 1, 'Miss Veron Minott')
    expect(list).toEqual(['Mrs Suzette Thomas', 'Miss Veron Minott'])
    list = removeListItem(list, 0)
    expect(list).toEqual(['Miss Veron Minott'])
  })

  it('cleanList trims, drops blanks and duplicates', () => {
    expect(cleanList([' A ', '', 'A', 'B', '   '])).toEqual(['A', 'B'])
  })
})

describe('CQC rating choice', () => {
  it('maps the single select to rating + status', () => {
    expect(ratingFieldsFromChoice('GOOD')).toEqual({ cqcRating: 'GOOD', cqcRatingStatus: 'RATED' })
    expect(ratingFieldsFromChoice('NOT_YET_RATED')).toEqual({
      cqcRating: null,
      cqcRatingStatus: 'NOT_YET_RATED',
    })
    expect(ratingFieldsFromChoice('')).toEqual({ cqcRating: null, cqcRatingStatus: null })
    expect(ratingChoiceFrom(null, 'NOT_YET_RATED')).toBe('NOT_YET_RATED')
    expect(ratingChoiceFrom('INADEQUATE', 'RATED')).toBe('INADEQUATE')
    expect(formatCqcRating({ cqcRating: null, cqcRatingStatus: 'NOT_YET_RATED' })).toBe('Not rated')
    expect(formatCqcRating({ cqcRating: 'REQUIRES_IMPROVEMENT', cqcRatingStatus: 'RATED' })).toBe(
      'Requires improvement',
    )
    expect(formatCqcRating({ cqcRating: null, cqcRatingStatus: null })).toBeNull()
  })
})

describe('branchFormToPayload', () => {
  it('sends every editable field, cleaned, and never visitRefCode or coordinates', () => {
    const form = branchToForm(HOUNSLOW)
    form.registeredManagers = addListItem(form.registeredManagers)
    form.registeredManagers = updateListItem(form.registeredManagers, 1, '  Mr New Manager ')
    form.serviceTypes = [...form.serviceTypes, '']
    form.rating = 'NOT_YET_RATED'
    form.email = '  '
    form.postcode = 'tw3 2dl'
    const payload = branchFormToPayload(form)
    expect(payload.registeredManagers).toEqual(['Mrs Suzette Thomas', 'Mr New Manager'])
    expect(payload.serviceTypes).toEqual(['Homecare agency'])
    expect(payload.cqcRating).toBeNull()
    expect(payload.cqcRatingStatus).toBe('NOT_YET_RATED')
    expect(payload.email).toBe('')
    expect(payload.postcode).toBe('TW3 2DL')
    expect(payload.cqcRegistrationDate).toBeNull()
    expect(payload.cqcLocationId).toBe('1-115898258')
    expect(payload).not.toHaveProperty('visitRefCode')
    expect(payload).not.toHaveProperty('code')
    expect(payload).not.toHaveProperty('latitude')
    expect(payload).not.toHaveProperty('longitude')
  })

  it('sends coordinates only after a Google suggestion supplied them', () => {
    const typed = applyGoogleAddress(branchToForm(HOUNSLOW), '15 Maswell Park Rd', undefined)
    expect(typed.addressLine1).toBe('15 Maswell Park Road')
    expect(branchFormToPayload(typed)).not.toHaveProperty('latitude')

    const picked = applyGoogleAddress(branchToForm(HOUNSLOW), '15 Maswell Park Rd, Hounslow TW3 2DL, UK', {
      addressLine1: '15 Maswell Park Rd',
      city: 'Hounslow',
      county: 'Greater London',
      postcode: 'TW3 2DL',
      country: 'United Kingdom',
      lat: 51.4676,
      lng: -0.3613,
    })
    const payload = branchFormToPayload(picked)
    expect(payload.addressLine1).toBe('15 Maswell Park Rd')
    expect(payload.county).toBe('Greater London')
    expect(payload.latitude).toBe(51.4676)
    expect(payload.longitude).toBe(-0.3613)
  })
})

describe('addBranchDetailsPayload', () => {
  it('sends the Google-resolved parts + coordinates and only filled CQC fields', () => {
    expect(
      addBranchDetailsPayload(
        '1 Test Street, London SW1A 1AA, UK',
        { addressLine1: '1 Test Street', city: 'London', postcode: 'SW1A 1AA', lat: 51.5, lng: -0.14 },
        { ...EMPTY_ADD_BRANCH_CQC, cqcLocationId: ' 1-123456789 ', registeredManagers: ['A', ' '] },
      ),
    ).toEqual({
      address: '1 Test Street, London SW1A 1AA, UK',
      addressLine1: '1 Test Street',
      town: 'London',
      postcode: 'SW1A 1AA',
      latitude: 51.5,
      longitude: -0.14,
      cqcLocationId: '1-123456789',
      registeredManagers: ['A'],
    })
  })

  it('typed address without a suggestion sends no parts or coordinates', () => {
    expect(addBranchDetailsPayload('Somewhere', undefined, EMPTY_ADD_BRANCH_CQC)).toEqual({
      address: 'Somewhere',
    })
    expect(addBranchDetailsPayload('', undefined, { ...EMPTY_ADD_BRANCH_CQC, rating: 'GOOD' })).toEqual({
      cqcRating: 'GOOD',
      cqcRatingStatus: 'RATED',
    })
  })
})
