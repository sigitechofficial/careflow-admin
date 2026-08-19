import { describe, expect, it } from 'vitest'
import type { ServiceUserDetail } from '@/features/service-users/api'
import {
  applyPrefillToDraftAnswers,
  buildAnswerFromPrefill,
  buildPrefillMap,
  hasAssessmentAnswer,
  mapGenderToAssessmentOption,
} from '@/features/service-users/initial-assessment/utils/question-prefill'
import type {
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

function minimalDetail(overrides: Partial<ServiceUserDetail> = {}): ServiceUserDetail {
  return {
    id: 'su-1',
    serviceUserNumber: 'SU-100',
    residentId: null,
    residentGuid: null,
    firstName: 'Margaret',
    middleName: null,
    lastName: 'Hughes',
    preferredName: 'Margaret',
    dateOfBirth: '1944-03-12T00:00:00.000Z',
    email: 'm@example.com',
    phone: '02084661234',
    mobile: '07700900123',
    nhsNumber: '9434765821',
    socialServicesRef: null,
    nationalInsuranceNumber: null,
    serviceStartDate: null,
    serviceEndDate: null,
    profilePhotoUrl: null,
    notes: null,
    isActive: true,
    createdAt: '',
    updatedAt: '',
    title: null,
    gender: { id: 'g1', name: 'Female', code: 'FEMALE' },
    maritalStatus: null,
    status: null,
    careType: null,
    fundingType: { id: 'f1', name: 'Local Authority', code: 'local_authority' },
    riskLevel: null,
    location: null,
    keyWorker: { id: 'e1', firstName: 'A', lastName: 'B' },
    namedNurse: { id: 'e2', firstName: 'C', lastName: 'D' },
    address: {
      id: 'a1',
      addressLine1: '12 Oak Lane',
      addressLine2: null,
      town: 'London',
      county: null,
      country: null,
      postcode: 'SW1A 1AA',
      latitude: null,
      longitude: null,
      accessInstructions: null,
      keySafeNumber: null,
    },
    contacts: [
      {
        id: 'c1',
        firstName: 'Sarah',
        lastName: 'Hughes',
        phone: null,
        mobile: '07700111222',
        email: null,
        address: null,
        isPrimary: true,
        isEmergencyContact: true,
        canReceiveUpdates: true,
        notes: null,
        relationshipType: { id: 'r1', name: 'Daughter', code: 'DAUGHTER' },
      },
    ],
    references: [],
    assignment: null,
    profilePhoto: null,
    ...overrides,
  } as ServiceUserDetail
}

describe('buildPrefillMap', () => {
  it('populates known prefill keys from service user detail', () => {
    const map = buildPrefillMap({ detail: minimalDetail(), domCare: null })
    expect(map.get('firstName')).toBe('Margaret')
    expect(map.get('lastName')).toBe('Hughes')
    expect(map.get('preferredName')).toBe('Margaret')
    expect(map.get('dateOfBirth')).toBe('1944-03-12')
    expect(map.get('gender')).toBe('female')
    expect(map.get('nhsNumber')).toBe('9434765821')
    expect(map.get('fundingType')).toBe('local_authority')
    expect(map.get('addressContact')).toContain('12 Oak Lane')
    expect(map.get('emergencyContact')).toContain('Sarah')
  })

  it('prefills GP contact from GP relationship contact', () => {
    const map = buildPrefillMap({
      detail: minimalDetail({
        contacts: [
          {
            id: 'gp1',
            firstName: 'Dr',
            lastName: 'Patel',
            phone: '02079460958',
            mobile: null,
            email: null,
            address: 'Riverside Medical Centre',
            isPrimary: false,
            isEmergencyContact: false,
            canReceiveUpdates: false,
            notes: null,
            relationshipType: { id: 'rgp', name: 'GP', code: 'GP' },
          },
        ],
      }),
      domCare: null,
    })
    expect(map.get('gpContact')).toContain('Dr Patel')
    expect(map.get('gpContact')).toContain('02079460958')
    expect(map.get('gpContact')).toContain('Riverside Medical Centre')
  })

  it('prefills NI number when present on service user', () => {
    const map = buildPrefillMap({
      detail: minimalDetail({ nationalInsuranceNumber: 'AB123456C' }),
      domCare: null,
    })
    expect(map.get('nationalInsuranceNumber')).toBe('AB123456C')
  })

  it('prefills allergies summary from profile catalogue text', () => {
    const map = buildPrefillMap({
      detail: minimalDetail(),
      domCare: null,
      allergiesSummary: 'Penicillin — Anaphylaxis',
    })
    expect(map.get('allergies')).toBe('Penicillin — Anaphylaxis')
  })
})

describe('mapGenderToAssessmentOption', () => {
  it('maps FEMALE code to female option value', () => {
    expect(mapGenderToAssessmentOption({ code: 'FEMALE', name: 'Female' })).toBe('female')
  })
})

describe('applyPrefillToDraftAnswers', () => {
  const dateQ: InitialAssessmentQuestion = {
    id: 'q-dob',
    questionText: 'Date of birth',
    questionType: 'DATE',
    isRequired: true,
    sortOrder: 1,
    riskFlag: false,
    carePlanTrigger: false,
    metadata: { prefillKey: 'dateOfBirth' },
  }
  const sections: InitialAssessmentSection[] = [
    {
      id: 's1',
      sectionNumber: 1,
      title: 'Section 1',
      sortOrder: 1,
      questions: [dateQ],
    },
  ]

  it('fills empty draft answers from prefill map', () => {
    const map = buildPrefillMap({ detail: minimalDetail(), domCare: null })
    const merged = applyPrefillToDraftAnswers(sections, {}, map)
    expect(merged['q-dob']?.dateValue).toMatch(/^1944-03-12/)
  })

  it('does not overwrite existing answers', () => {
    const map = buildPrefillMap({ detail: minimalDetail(), domCare: null })
    const merged = applyPrefillToDraftAnswers(
      sections,
      { 'q-dob': { questionId: 'q-dob', dateValue: '2000-01-01T00:00:00.000Z' } },
      map,
    )
    expect(merged['q-dob']?.dateValue).toMatch(/^2000-01-01/)
  })
})

describe('hasAssessmentAnswer', () => {
  it('treats assessor notes as an answer', () => {
    const q: InitialAssessmentQuestion = {
      id: 'q-1',
      questionText: 'Pain',
      questionType: 'DATE',
      isRequired: false,
      sortOrder: 1,
      riskFlag: false,
      carePlanTrigger: false,
    }
    expect(hasAssessmentAnswer({ questionId: 'q-1', notes: 'worse in morning' }, q)).toBe(true)
  })
})

describe('buildAnswerFromPrefill', () => {
  it('uses selectedOptions for SINGLE_SELECT', () => {
    const q: InitialAssessmentQuestion = {
      id: 'q-g',
      questionText: 'Gender',
      questionType: 'SINGLE_SELECT',
      isRequired: false,
      sortOrder: 1,
      riskFlag: false,
      carePlanTrigger: false,
      metadata: { prefillKey: 'gender' },
    }
    const answer = buildAnswerFromPrefill(q, 'female')
    expect(answer?.selectedOptions).toEqual(['female'])
  })
})
