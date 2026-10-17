import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const state = vi.hoisted(() => ({ mutateAsync: vi.fn() }))

vi.mock('@/features/payroll/hooks/usePayroll', () => ({
  useUpsertEmployeePayrollProfile: () => ({ mutateAsync: state.mutateAsync, isPending: false, error: null }),
}))

import { LoanDeclarationSection } from './LoanDeclarationSection'

const show = (profile: Parameters<typeof LoanDeclarationSection>[0]['profile'], canEdit = true) =>
  render(<LoanDeclarationSection employeeId="e-1" profile={profile} canEdit={canEdit} />)
const saveButton = () => screen.getByRole('button', { name: 'Save student loan' })
const fillWhere = () => {
  fireEvent.change(screen.getByLabelText('Loan declaration source'), { target: { value: 'P45' } })
  fireEvent.change(screen.getByLabelText('Loan declaration date'), { target: { value: '2026-05-01' } })
}

describe('student loan on the payroll profile: one simple step', () => {
  beforeEach(() => {
    state.mutateAsync.mockReset().mockResolvedValue({})
  })

  it('"Yes" needs a plan; the plan is saved with the declaration and other settings are kept', () => {
    show({ deductionElections: ['PENSION_EMPLOYEE'], pensionOptedIn: true })
    expect(screen.getByTestId('loan-declaration-now')).toHaveTextContent('Not checked yet')
    expect(saveButton()).toBeDisabled()
    fireEvent.click(screen.getByLabelText('Yes, has a loan'))
    fillWhere()
    expect(screen.getByText('Still needed: the plan.')).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
    // Each plan has an info tag; clicking it does not tick the plan.
    for (const plan of ['Plan 1', 'Plan 2', 'Plan 4 (Scotland)', 'Plan 5', 'Postgraduate loan']) {
      expect(screen.getByRole('button', { name: `About ${plan}` })).toBeInTheDocument()
    }
    fireEvent.click(screen.getByRole('button', { name: 'About Plan 1' }))
    expect(screen.getByLabelText('Plan 1')).not.toBeChecked()
    fireEvent.click(screen.getByLabelText('Plan 2'))
    fireEvent.click(saveButton())
    expect(state.mutateAsync).toHaveBeenCalledWith({
      loanDeclarationStatus: 'LOAN_DECLARED',
      loanDeclarationSource: 'P45',
      loanDeclarationDate: '2026-05-01',
      deductionElections: ['PENSION_EMPLOYEE', 'SL_PLAN_2'],
      studentLoanPlan1: false,
      studentLoanPlan2: true,
      studentLoanPlan4: false,
      studentLoanPlan5: false,
      postgraduateLoan: false,
    })
  })

  it('"No loan" clears the plans that were set and says so', () => {
    show({ studentLoanPlan1: true, postgraduateLoan: true })
    expect(screen.getByTestId('loan-declaration-now')).toHaveTextContent('Not checked yet (plans set: Plan 1, Postgraduate loan)')
    fireEvent.click(screen.getByLabelText('No loan'))
    expect(screen.queryByLabelText('Plan 1')).toBeNull()
    expect(screen.getByText(/removes the plan\(s\) set for this carer/)).toBeInTheDocument()
    fillWhere()
    fireEvent.click(saveButton())
    expect(state.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ loanDeclarationStatus: 'NO_LOAN_CONFIRMED', deductionElections: [], studentLoanPlan1: false, postgraduateLoan: false }),
    )
  })

  it('shows what is saved; a reader cannot change it', () => {
    show(
      { loanDeclarationStatus: 'LOAN_DECLARED', loanDeclarationSource: 'STARTER_CHECKLIST', loanDeclarationDate: '2026-04-20', studentLoanPlan2: true },
      false,
    )
    expect(screen.getByTestId('loan-declaration-now')).toHaveTextContent('Has a student loan — Plan 2 · from Starter checklist, 2026-04-20')
    expect(screen.queryByRole('button', { name: 'Save student loan' })).toBeNull()
  })
})
