import { describe, expect, it } from 'vitest'
import {
  isIaPhotographyConsentComplete,
  isPhotographyConsentComplete,
  normalizePhotographyConsentMetadata,
} from '@/features/service-users/initial-assessment/utils/photography-consent'

const compactRecord = {
  photographyNeeded: 'yes' as const,
  statementsAgreed: true,
  consentPrintName: 'Margaret Thompson',
  consentDate: '2026-09-29T00:00:00.000Z',
  professionalName: 'Wendy Clark',
}

const paperForm = {
  surname: 'Thompson',
  firstNames: 'Margaret',
  consentSubjectName: 'Margaret Thompson',
  consentSignature: 'M Thompson',
  consentDate: '2026-09-29T00:00:00.000Z',
  consentPrintName: 'Margaret Thompson',
}

describe('isIaPhotographyConsentComplete', () => {
  it('is complete when photographs are not needed (No / Not now)', () => {
    expect(isIaPhotographyConsentComplete({ photographyNeeded: 'no' })).toBe(true)
    expect(isIaPhotographyConsentComplete({ photographyNeeded: 'not_now' })).toBe(true)
  })

  it('needs the gate answered', () => {
    expect(isIaPhotographyConsentComplete({})).toBe(false)
  })

  it('needs the compact record when photographs are needed', () => {
    expect(isIaPhotographyConsentComplete(compactRecord)).toBe(true)
    expect(isIaPhotographyConsentComplete({ ...compactRecord, statementsAgreed: undefined })).toBe(false)
    expect(isIaPhotographyConsentComplete({ ...compactRecord, professionalName: ' ' })).toBe(false)
    expect(isIaPhotographyConsentComplete({ ...compactRecord, consentPrintName: undefined })).toBe(false)
  })

  it('still accepts an IA saved with the full paper form before the gate existed', () => {
    expect(isIaPhotographyConsentComplete(paperForm)).toBe(true)
  })

  it('leaves the standalone paper-form check unchanged (typed signature still required)', () => {
    expect(isPhotographyConsentComplete(compactRecord)).toBe(false)
    expect(isPhotographyConsentComplete(paperForm)).toBe(true)
  })
})

describe('normalizePhotographyConsentMetadata', () => {
  it('keeps the gate fields and drops unknown gate values', () => {
    expect(normalizePhotographyConsentMetadata(compactRecord)).toMatchObject({
      photographyNeeded: 'yes',
      statementsAgreed: true,
    })
    expect(normalizePhotographyConsentMetadata({ photographyNeeded: 'maybe' }).photographyNeeded).toBeUndefined()
  })
})
