import { describe, expect, it } from 'vitest'
import {
  formatGpContactAssessmentText,
  parseGpContactAssessmentText,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentGpContactField'

describe('InitialAssessmentGpContactField text helpers', () => {
  it('formats name and phone for assessment storage', () => {
    expect(
      formatGpContactAssessmentText({
        name: 'Dr Patel',
        phone: '020 7946 0958',
        otherDetails: 'Riverside Medical Centre',
      }),
    ).toBe('Name: Dr Patel\nTel: 020 7946 0958\nRiverside Medical Centre')
  })

  it('parses structured GP contact text', () => {
    expect(
      parseGpContactAssessmentText('Name: Dr Patel\nTel: 020 7946 0958\nRiverside Medical Centre'),
    ).toEqual({
      name: 'Dr Patel',
      phone: '020 7946 0958',
      otherDetails: 'Riverside Medical Centre',
    })
  })
})
