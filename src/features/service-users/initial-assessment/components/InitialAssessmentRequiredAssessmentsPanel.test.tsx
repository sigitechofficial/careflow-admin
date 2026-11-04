import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { InitialAssessmentRequiredAssessmentsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentRequiredAssessmentsPanel'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    hash,
    ...rest
  }: {
    children: React.ReactNode
    to: string
    params: { serviceUserId: string }
    hash?: string
    [key: string]: unknown
  }) => (
    <a href={`${to.replace('$serviceUserId', params.serviceUserId)}${hash ? `#${hash}` : ''}`} {...rest}>
      {children}
    </a>
  ),
}))

describe('InitialAssessmentRequiredAssessmentsPanel', () => {
  it('lists each required assessment with the care plans that need it and whether it is done', () => {
    render(
      <InitialAssessmentRequiredAssessmentsPanel
        serviceUserId="su-1"
        items={[
          {
            assessmentFormId: 'bed-rail',
            assessmentFormName: 'Bed Rail Assessment',
            requiredBy: [
              { carePathwayFormId: 'falls', carePlanName: 'Falls' },
              { carePathwayFormId: 'mobility', carePlanName: 'Mobility' },
            ],
            lastCompletedAt: null,
          },
          {
            assessmentFormId: 'med',
            assessmentFormName: 'Assessing For Medication in home care',
            requiredBy: [{ carePathwayFormId: 'medication', carePlanName: 'Medication' }],
            lastCompletedAt: '2026-10-05T09:00:00.000Z',
          },
        ]}
      />,
    )

    expect(screen.getByText('Required assessments (2)')).toBeInTheDocument()
    expect(screen.getByText('1 not done yet')).toBeInTheDocument()

    const bedRail = screen.getByTestId('ia-required-assessment-bed-rail')
    expect(within(bedRail).getByText('Required by Falls, Mobility')).toBeInTheDocument()
    expect(within(bedRail).getByText('Not done yet')).toBeInTheDocument()
    expect(within(bedRail).getByRole('link', { name: 'Do assessment' })).toHaveAttribute(
      'href',
      '/service-users/su-1/care-plan#care-plans-assessment-risk',
    )

    const medication = screen.getByTestId('ia-required-assessment-med')
    expect(within(medication).getByText(/^Completed /)).toBeInTheDocument()
    expect(within(medication).queryByRole('link')).toBeNull()
  })

  it('renders nothing when no assessments are required', () => {
    const { container } = render(<InitialAssessmentRequiredAssessmentsPanel serviceUserId="su-1" items={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
