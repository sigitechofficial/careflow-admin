import { describe, expect, it } from 'vitest'
import {
  defaultAssessmentConsentMetadata,
  isAssessmentConsentCaptureExempt,
  validateAssessmentConsent,
} from '@/features/service-users/assessments/utils/assessment-consent'

describe('assessment-consent', () => {
  it('exempts photography consent form', () => {
    expect(isAssessmentConsentCaptureExempt('photography-consent')).toBe(true)
    expect(isAssessmentConsentCaptureExempt('waterlow')).toBe(false)
  })

  it('requires consent fields when consent obtained', () => {
    const incomplete = defaultAssessmentConsentMetadata({ consentObtained: true })
    expect(validateAssessmentConsent(incomplete, 'waterlow')).toMatch(/who gave consent/i)

    const complete = defaultAssessmentConsentMetadata({
      consentObtained: true,
      givenBy: 'service_user',
      method: 'verbal',
      consentDate: '2026-06-01',
      capacityIntact: true,
    })
    expect(validateAssessmentConsent(complete, 'waterlow')).toBeNull()
  })

  it('requires declined reason when consent not obtained', () => {
    const declined = defaultAssessmentConsentMetadata({ consentObtained: false })
    expect(validateAssessmentConsent(declined, 'must')).toMatch(/declined/i)

    const withReason = defaultAssessmentConsentMetadata({
      consentObtained: false,
      declinedReason: 'Service user refused screening today.',
    })
    expect(validateAssessmentConsent(withReason, 'must')).toBeNull()
  })
})
