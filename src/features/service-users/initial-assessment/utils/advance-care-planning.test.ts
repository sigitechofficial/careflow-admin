import { describe, expect, it } from 'vitest'
import {
  isAdvanceCarePlanningComplete,
  normalizeAdvanceCarePlanningMetadata,
  type AdvanceCarePlanningMetadata,
} from '@/features/service-users/initial-assessment/utils/advance-care-planning'

function filledAcp(overrides: Partial<AdvanceCarePlanningMetadata> = {}): AdvanceCarePlanningMetadata {
  return {
    patientName: 'Helen Wright',
    address: '12 Maple Close, Leeds, LS1 4AP',
    dateOfBirth: '1948-06-15',
    hospitalOrNhsNumber: '999 000 0001',
    dateCompleted: '2026-03-12',
    gpDetails: 'Dr A. Patel, Oak Tree Medical Practice',
    hospitalContact: 'Leeds Teaching Hospitals NHS Trust',
    familyMemberName: 'Sarah Wright',
    familyContactTel: '07700 900123',
    professionalName: 'Sarah Thompson',
    professionalRole: 'Registered Manager',
    professionalContactTel: '0113 496 0789',
    patientSignature: 'Helen Wright',
    patientSignatureDate: '2026-03-12',
    nextOfKinSignature: 'Sarah Wright',
    nextOfKinSignatureDate: '2026-03-12',
    homecareProfessionalSignature: 'Sarah Thompson',
    homecareProfessionalSignatureDate: '2026-03-12',
    reviewDate: '2026-09-12',
    personalValues: 'I want to stay in my own home.',
    carePreferences: 'I prefer staff to explain what they are doing.',
    concernsAndFears: 'I do not want to be moved without my family knowing.',
    legalAdvanceDecision: false,
    proxyContact1: { name: 'Sarah Wright', tel: '07700 900123', lpoa: false },
    proxyContact2: { name: 'James Wright', tel: '07700 900456', lpoa: false },
    placeOfCareFirstChoice: 'Own home',
    placeOfCareSecondChoice: 'With family',
    placeOfCareComments: 'Home is my first choice.',
    specialRequests: 'Please ring the bell.',
    thirdPartyComments: 'Sarah Wright agrees home is the priority.',
    ...overrides,
  }
}

describe('Advance Care Planning worksheet completeness', () => {
  it('is complete when date, ADRT answer and thinking-ahead wishes are present', () => {
    expect(isAdvanceCarePlanningComplete(filledAcp())).toBe(true)
  })

  it('is incomplete when thinking-ahead wishes are missing', () => {
    expect(isAdvanceCarePlanningComplete(filledAcp({ personalValues: '' }))).toBe(false)
  })

  it('reload via normalize keeps visible fields and drops hidden ADRT details when No', () => {
    const saved = filledAcp({ legalAdvanceDecision: false, legalAdvanceDecisionDetails: undefined })
    const reloaded = normalizeAdvanceCarePlanningMetadata(JSON.parse(JSON.stringify(saved)))
    expect(reloaded.patientName).toBe('Helen Wright')
    expect(reloaded.legalAdvanceDecision).toBe(false)
    expect(reloaded.legalAdvanceDecisionDetails).toBeUndefined()
    expect(isAdvanceCarePlanningComplete(reloaded)).toBe(true)
  })

  it('keeps ADRT details after reload when the Yes gate is open', () => {
    const saved = filledAcp({
      legalAdvanceDecision: true,
      legalAdvanceDecisionDetails: 'A copy is held by the GP and Sarah Wright.',
    })
    const reloaded = normalizeAdvanceCarePlanningMetadata(JSON.parse(JSON.stringify(saved)))
    expect(reloaded.legalAdvanceDecision).toBe(true)
    expect(reloaded.legalAdvanceDecisionDetails).toContain('GP')
  })
})
