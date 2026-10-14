import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { ApiError } from '@/shared/api/api-client'

const state = vi.hoisted(() => ({ save: vi.fn(), error: null as unknown }))

vi.mock('@/shared/lib/toast', () => ({ toastApiError: vi.fn(), toastSuccess: vi.fn() }))
vi.mock('@/features/payroll/hooks/usePayroll', () => ({
  useUpsertEmployeePayrollProfile: () => ({ mutateAsync: state.save, isPending: false, error: state.error }),
}))

import { WorkplacePensionSection } from './WorkplacePensionSection'

const saveButton = () => screen.getByRole('button', { name: 'Save pension settings' })
const set = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })

describe('workplace pension settings on the payroll profile (Gate C17)', () => {
  beforeEach(() => {
    state.save.mockReset().mockResolvedValue({ message: 'Payroll profile saved' })
    state.error = null
  })

  it('a missing status shows "Not yet recorded" and nothing is saved by default', () => {
    render(<WorkplacePensionSection employeeId="e-1" profile={{ pensionStatus: null }} canEdit />)
    expect(screen.getByTestId('workplace-pension-saved')).toHaveTextContent('Saved: Not yet recorded')
    expect(screen.getByLabelText('Pension status')).toHaveValue('')
    expect(screen.getByTestId('workplace-pension')).toHaveTextContent('Tax and NI are not calculated for this person until their pension status is recorded')
    expect(saveButton()).toBeDisabled()
    expect(state.save).not.toHaveBeenCalled()
  })

  it('ENROLLED needs the date, scheme, policy, basis, method and valid rates, and saves only the pension fields', () => {
    render(<WorkplacePensionSection employeeId="e-1" profile={{ pensionStatus: null }} canEdit />)
    set('Pension status', 'ENROLLED')
    // Nothing is filled in: no scheme, basis, method or rates are suggested.
    expect(screen.getByLabelText('Pension scheme reference')).toHaveValue('')
    expect(screen.getByLabelText('Employee gross contribution %')).toHaveValue(null)
    expect(screen.queryByRole('option', { name: /net pay/i })).toBeNull()
    set('Enrolment effective date', '2026-04-01')
    set('Pension scheme reference', 'SYNTHETIC-DC-001')
    set('Employer policy reference', 'Synthetic policy v1')
    set('Contribution basis', 'QUALIFYING_EARNINGS')
    set('Tax relief method', 'RAS')
    set('Employee gross contribution %', '4')
    set('Employer contribution %', '2')
    fireEvent.click(screen.getByLabelText("I confirm these settings match the employer's pension scheme rules"))
    expect(screen.getByTestId('workplace-pension')).toHaveTextContent('an employer contribution of at least 3%, a total contribution of at least 8%')
    expect(saveButton()).toBeDisabled()
    set('Employee gross contribution %', '5')
    set('Employer contribution %', '3')
    fireEvent.click(saveButton())
    expect(state.save).toHaveBeenCalledWith({
      pensionStatus: 'ENROLLED',
      pensionEnrolledFrom: '2026-04-01',
      pensionSchemeRef: 'SYNTHETIC-DC-001',
      pensionPolicyRef: 'Synthetic policy v1',
      pensionContributionBasis: 'QUALIFYING_EARNINGS',
      pensionTaxRelief: 'RAS',
      pensionEmployeeRatePercent: 5,
      pensionEmployerRatePercent: 3,
    })
  })

  it('NOT_ENROLLED needs a manager confirmation, sends only the status (other fields untouched), and shows an API error; a reader cannot edit', () => {
    state.error = new ApiError('pensionStatus must be one of the following values: ENROLLED, NOT_ENROLLED', 400)
    const view = render(<WorkplacePensionSection employeeId="e-1" profile={{ pensionStatus: null }} canEdit />)
    set('Pension status', 'NOT_ENROLLED')
    expect(screen.getByTestId('workplace-pension-not-enrolled')).toHaveTextContent('not an automatic-enrolment eligibility assessment')
    expect(screen.queryByLabelText('Employee gross contribution %')).toBeNull() // no rates needed
    expect(saveButton()).toBeDisabled()
    fireEvent.click(screen.getByLabelText('As an authorised payroll manager, I confirm this person is not enrolled'))
    fireEvent.click(saveButton())
    expect(state.save).toHaveBeenCalledWith({ pensionStatus: 'NOT_ENROLLED' }) // no tax code, NI, director, loan or bank fields
    expect(screen.getByRole('alert')).toHaveTextContent('pensionStatus must be one of the following values')
    view.unmount()

    render(<WorkplacePensionSection employeeId="e-1" profile={{ pensionStatus: 'NOT_ENROLLED' }} canEdit={false} />)
    expect(screen.getByTestId('workplace-pension-saved')).toHaveTextContent('Saved: Not enrolled (employer-recorded)')
    expect(screen.queryByLabelText('Pension status')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Save pension settings' })).toBeNull()
  })
})
