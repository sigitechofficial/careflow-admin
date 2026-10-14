import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const state = vi.hoisted(() => ({ save: vi.fn(), error: null as unknown }))

vi.mock('@/shared/lib/toast', () => ({ toastApiError: vi.fn(), toastSuccess: vi.fn() }))
vi.mock('@/features/payroll/hooks/usePayroll', () => ({
  useUpsertEmployeePayrollProfile: () => ({ mutateAsync: state.save, isPending: false, error: state.error }),
}))

import { DirectorStatusSection } from './DirectorStatusSection'

const saveButton = () => screen.getByRole('button', { name: 'Save director status' })

describe('director classification on the payroll profile (Gate C8)', () => {
  beforeEach(() => {
    state.save.mockReset().mockResolvedValue({ message: 'Payroll profile saved' })
    state.error = null
  })

  it('an unclassified employee shows "Not yet classified" and nothing is saved for them', () => {
    render(<DirectorStatusSection employeeId="e-1" profile={{ isDirector: null }} canEdit />)
    expect(screen.getByTestId('director-status-saved')).toHaveTextContent('Saved: Not yet classified')
    expect(screen.getByLabelText('Not yet classified')).toBeChecked()
    expect(screen.getByTestId('director-status')).toHaveTextContent('Tax and NI are not calculated for this person')
    expect(saveButton()).toBeDisabled()
    expect(state.save).not.toHaveBeenCalled()
  })

  it('"Not a director" saves isDirector false only, so the other profile fields are left as they are', () => {
    render(<DirectorStatusSection employeeId="e-1" profile={{ isDirector: null }} canEdit />)
    fireEvent.click(screen.getByLabelText('Not a director'))
    expect(screen.queryByLabelText('Date appointed director')).toBeNull() // no date needed
    fireEvent.click(saveButton())
    // Only the director field is sent: tax code, NI category, bank details etc. are not in the body.
    expect(state.save).toHaveBeenCalledTimes(1)
    expect(state.save).toHaveBeenCalledWith({ isDirector: false })
  })

  it('"Director" needs the appointment date and saves true, the date and method AN; a backend error is shown', () => {
    state.error = new Error('directorAppointedOn must be a valid ISO 8601 date string')
    render(<DirectorStatusSection employeeId="e-1" profile={{ isDirector: false }} canEdit />)
    expect(screen.getByTestId('director-status-saved')).toHaveTextContent('Saved: Not a director')
    expect(screen.getByLabelText('Not yet classified')).toBeDisabled() // a classified person is not unclassified again
    fireEvent.click(screen.getByLabelText('Director'))
    expect(screen.getByTestId('director-status')).toHaveTextContent('The alternative method (AL) is not supported yet')
    expect(screen.getByTestId('director-status')).toHaveTextContent('Enter the date the person was appointed a director')
    expect(saveButton()).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Date appointed director'), { target: { value: '2026-05-10' } })
    fireEvent.click(saveButton())
    expect(state.save).toHaveBeenCalledWith({ isDirector: true, directorAppointedOn: '2026-05-10', directorNicMethod: 'AN' })
    expect(screen.getByRole('alert')).toHaveTextContent('directorAppointedOn must be a valid ISO 8601 date string')
  })
})
