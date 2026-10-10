import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/service-users/initial-assessment/components/InitialAssessmentTextarea', () => ({
  InitialAssessmentTextarea: () => null,
  plainTextFromHtml: (value: string) => value,
}))

import {
  formatGpContactAssessmentText,
  gpContactWidgetDraft,
  parseGpContactAssessmentText,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentGpContactField'
import type { ServiceUserDetail } from '@/features/service-users/api'

describe('InitialAssessmentGpContactField text helpers', () => {
  it('formats name, contact number and address for assessment storage', () => {
    expect(
      formatGpContactAssessmentText({
        name: 'Dr Patel',
        phone: '020 7946 0958',
        otherDetails: 'Riverside Medical Centre, 1 High St',
      }),
    ).toBe('Name: Dr Patel\nTel: 020 7946 0958\nAddress: Riverside Medical Centre, 1 High St')
  })

  it('parses the labelled address line', () => {
    expect(
      parseGpContactAssessmentText('Name: Dr Patel\nTel: 020 7946 0958\nAddress: 1 High St, Leeds'),
    ).toEqual({ name: 'Dr Patel', phone: '020 7946 0958', otherDetails: '1 High St, Leeds' })
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

  it('Fill Demo Data Name:/Tel: format is what the GP widget consumes', () => {
    const generated = 'Name: Dr A. Patel\nTel: 0113 496 0456\nOak Tree Medical Practice'
    const widget = parseGpContactAssessmentText(generated)
    expect(widget.name).toBe('Dr A. Patel')
    expect(widget.phone).toBe('0113 496 0456')
    expect(widget.otherDetails).toBe('Oak Tree Medical Practice')
  })

  it('after save+reload the widget reads GP name/phone/address from the contact record', () => {
    const reloaded: Pick<ServiceUserDetail, 'contacts'> = {
      contacts: [
        {
          id: 'gp-1',
          firstName: 'Dr A.',
          lastName: 'Patel',
          phone: '0113 496 0456',
          mobile: null,
          email: null,
          address: 'Oak Tree Medical Practice',
          isPrimary: false,
          isEmergencyContact: false,
          canReceiveUpdates: false,
          notes: null,
          relationshipType: { id: 'rel-gp', name: 'GP', code: 'GP' },
        },
      ],
    }
    const widget = gpContactWidgetDraft(reloaded as ServiceUserDetail, undefined)
    expect(widget.name).toBe('Dr A. Patel')
    expect(widget.phone).toBe('0113 496 0456')
    expect(widget.otherDetails).toBe('Oak Tree Medical Practice')
  })
})
