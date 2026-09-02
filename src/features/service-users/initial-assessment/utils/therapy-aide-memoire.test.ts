import { describe, expect, it } from 'vitest'
import { parseSubmissionMetadata } from '@/features/service-users/initial-assessment/utils/submission-metadata'
import {
  isTherapyAideMemoireComplete,
  normalizeTherapyAideMemoireMetadata,
} from '@/features/service-users/initial-assessment/utils/therapy-aide-memoire'
import { buildHolisticWorksheetMetadata } from '@/features/service-users/initial-assessment/utils/ia-holistic-metadata-autofill'

const sixUnchecked = {
  choking: { checked: false },
  chestInfections: { checked: false },
  speechConcern: { checked: false },
  mobilityChange: { checked: false },
  selfCareChange: { checked: false },
  carePackageConcern: { checked: false },
}

describe('isTherapyAideMemoireComplete', () => {
  it('requires all six items to be checked true or false', () => {
    expect(isTherapyAideMemoireComplete(undefined)).toBe(false)
    expect(isTherapyAideMemoireComplete({ ...sixUnchecked })).toBe(false)
    expect(
      isTherapyAideMemoireComplete({
        ...sixUnchecked,
        furtherReferralRequired: false,
      }),
    ).toBe(true)
  })

  it('treats referral No as complete without referralCompleted', () => {
    expect(
      isTherapyAideMemoireComplete({
        ...sixUnchecked,
        furtherReferralRequired: false,
        referralCompleted: undefined,
        referralDate: undefined,
      }),
    ).toBe(true)
  })

  it('requires details when a details item is checked', () => {
    expect(
      isTherapyAideMemoireComplete({
        ...sixUnchecked,
        mobilityChange: { checked: true },
        furtherReferralRequired: false,
      }),
    ).toBe(false)
    expect(
      isTherapyAideMemoireComplete({
        ...sixUnchecked,
        mobilityChange: { checked: true, details: 'Stairs have become slower.' },
        furtherReferralRequired: false,
      }),
    ).toBe(true)
  })

  it('requires referralCompleted when further referral is Yes', () => {
    expect(
      isTherapyAideMemoireComplete({
        ...sixUnchecked,
        furtherReferralRequired: true,
      }),
    ).toBe(false)
    expect(
      isTherapyAideMemoireComplete({
        ...sixUnchecked,
        furtherReferralRequired: true,
        referralCompleted: false,
      }),
    ).toBe(true)
  })
})

describe('Therapy Fill Demo nested save/reload', () => {
  it('QA metadata nests six items under painAssessment.therapyAideMemoire', () => {
    const meta = buildHolisticWorksheetMetadata('low')
    const therapy = meta.painAssessment.therapyAideMemoire
    expect(therapy?.choking?.checked).toBe(false)
    expect(therapy?.chestInfections?.checked).toBe(false)
    expect(therapy?.speechConcern?.checked).toBe(false)
    expect(therapy?.mobilityChange?.checked).toBe(false)
    expect(therapy?.selfCareChange?.checked).toBe(false)
    expect(therapy?.carePackageConcern?.checked).toBe(false)
    expect(therapy?.furtherReferralRequired).toBe(false)
    expect(isTherapyAideMemoireComplete(therapy)).toBe(true)
  })

  it('reloads nested therapyAideMemoire from submission metadata', () => {
    const saved = {
      choking: { checked: true },
      chestInfections: { checked: false },
      speechConcern: { checked: false },
      mobilityChange: { checked: false },
      selfCareChange: { checked: false },
      carePackageConcern: { checked: false },
      furtherReferralRequired: false,
    }
    const parsed = parseSubmissionMetadata({
      id: 'sub-1',
      metadata: { painAssessment: { nrsScore: 2, therapyAideMemoire: saved } },
    } as never)
    expect(parsed.painAssessment.nrsScore).toBe(2)
    expect(normalizeTherapyAideMemoireMetadata(parsed.painAssessment.therapyAideMemoire)).toEqual(
      expect.objectContaining({
        choking: { checked: true },
        furtherReferralRequired: false,
      }),
    )
  })
})
