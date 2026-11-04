import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mutate, canUpdate } = vi.hoisted(() => ({ mutate: vi.fn(), canUpdate: { value: true } }))

vi.mock('@/features/auth/store', () => ({
  useAuthStore: (select: (s: { can: (p: string) => boolean }) => unknown) =>
    select({ can: (p: string) => p !== 'form_selection.update' || canUpdate.value }),
}))

vi.mock('@/features/care-pathway/hooks/useCarePathwayTabs', () => ({
  useSelectableForms: (path: string) => ({
    isLoading: false,
    data:
      path === 'care-plans'
        ? [
            { id: 'falls', name: 'Falls' },
            { id: 'mobility', name: 'Mobility' },
          ]
        : [
            { id: 'bed-rail', name: 'Bed Rail Assessment' },
            { id: 'choking', name: 'Choking Risk Assessment' },
          ],
  }),
  useCarePlanRequiredAssessments: () => ({
    isLoading: false,
    data: [{ carePlanFormId: 'falls', assessmentFormIds: ['bed-rail'] }],
  }),
}))

vi.mock('@/features/care-pathway/hooks/useCarePathwayMutations', () => ({
  useUpdateCarePlanRequiredAssessments: () => ({ mutate }),
}))

import { CarePlanRequiredAssessmentsTab } from '@/features/care-pathway/components/CarePlanRequiredAssessmentsTab'

describe('CarePlanRequiredAssessmentsTab', () => {
  beforeEach(() => {
    mutate.mockReset()
    canUpdate.value = true
  })

  it('shows each care plan with its required assessments and saves a change for that care plan', async () => {
    render(<CarePlanRequiredAssessmentsTab />)
    const falls = screen.getByTestId('required-assessments-row-falls')
    expect(within(falls).getByText('Bed Rail Assessment')).toBeInTheDocument()
    const mobility = screen.getByTestId('required-assessments-row-mobility')
    expect(within(mobility).getByText('None required')).toBeInTheDocument()

    await userEvent.click(within(mobility).getByRole('combobox'))
    await userEvent.click(await screen.findByRole('button', { name: /Choking Risk Assessment/ }))
    expect(mutate).toHaveBeenCalledWith(
      { carePlanFormId: 'mobility', assessmentFormIds: ['choking'] },
      expect.any(Object),
    )
  })

  it('is read-only without the update permission', () => {
    canUpdate.value = false
    render(<CarePlanRequiredAssessmentsTab />)
    expect(screen.getByText('You can view these settings but not change them.')).toBeInTheDocument()
    expect(within(screen.getByTestId('required-assessments-row-falls')).getByRole('combobox')).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })
})
