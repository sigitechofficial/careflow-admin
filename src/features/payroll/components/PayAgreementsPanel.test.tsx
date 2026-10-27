import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import type { EmployeePayAgreement } from '@/features/payroll/types/payroll.types'

const state = vi.hoisted(() => ({
  agreements: [] as unknown[],
  permissions: [] as string[],
  create: vi.fn(),
  approve: vi.fn(),
  end: vi.fn(),
}))

vi.mock('@/features/auth/store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ can: (p: string) => state.permissions.includes(p) }),
}))
vi.mock('@/features/payroll/hooks/usePayroll', () => ({
  useEmployeePayAgreements: () => ({ data: state.agreements, isLoading: false }),
  useCreateEmployeePayAgreement: () => ({ mutate: state.create, isPending: false }),
  useApproveEmployeePayAgreement: () => ({ mutate: state.approve, isPending: false }),
  useEndEmployeePayAgreement: () => ({ mutate: state.end, isPending: false }),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className }: { children?: import('react').ReactNode; className?: string }) => <a className={className}>{children}</a>,
}))

import { PayAgreementsPanel } from './PayAgreementsPanel'

const agreement = (over: Partial<EmployeePayAgreement> = {}): EmployeePayAgreement => ({
  id: 'a-1',
  employeeId: 'e-1',
  scheduleId: null,
  basis: 'SALARIED',
  status: 'ACTIVE',
  effectiveFrom: '2026-01-01',
  effectiveTo: null,
  payCardId: null,
  annualSalary: 24000,
  contractedHours: 37.5,
  hourlyRateOverride: null,
  salaryEntryPeriod: 'MONTHLY',
  salaryEntryAmount: 2000,
  salaryProrationMethod: 'EQUAL_PERIODS_CALENDAR_DAYS',
  salaryCoverage: 'ALL_VISIT_WORK',
  createdByName: 'Olivia Office',
  approvedByName: 'Peter Payroll',
  awaitingApproval: false,
  currency: 'GBP',
  notes: null,
  createdAt: '2026-01-01T09:00:00.000Z',
  updatedAt: '2026-01-01T09:00:00.000Z',
  ...over,
})
const renderPanel = (contractedWeeklyHours: number | null = null) =>
  render(<PayAgreementsPanel employeeId="e-1" scheduleId="s-1" defaultPayCardId="c-1" contractedWeeklyHours={contractedWeeklyHours} />)

describe('pay agreements of an employee (WM-02 / WM-03)', () => {
  beforeEach(() => {
    state.agreements = []
    state.permissions = ['payroll.employees.manage']
    state.create.mockReset()
    state.approve.mockReset()
    state.end.mockReset()
  })

  it('an hourly agreement is added as before, with no salary fields', () => {
    renderPanel()
    expect(screen.queryByLabelText('Salary amount')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add agreement' }))
    expect(state.create.mock.calls[0][0]).toMatchObject({ basis: 'HOURLY_CARE', scheduleId: 's-1', payCardId: 'c-1', status: 'ACTIVE' })
    expect(state.create.mock.calls[0][0]).not.toHaveProperty('salaryEntryAmount')
  })

  it('a salary needs its amount, how a part period is paid and what it pays for before it can be saved', () => {
    renderPanel()
    fireEvent.change(screen.getByDisplayValue('Hourly care'), { target: { value: 'SALARIED' } })
    const save = screen.getByRole('button', { name: 'Save for approval' })
    expect(save).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Salary amount'), { target: { value: '2000' } })
    fireEvent.change(screen.getByLabelText('Salary entered per'), { target: { value: 'MONTHLY' } })
    fireEvent.change(screen.getByLabelText('How a part period is paid'), { target: { value: 'EQUAL_PERIODS_WORKING_DAYS' } })
    expect(save).toBeDisabled()
    fireEvent.change(screen.getByLabelText('What the salary pays for'), { target: { value: 'CONTRACTED_HOURS' } })
    expect(save).toBeDisabled() // contracted hours are needed for that choice
    expect(screen.getByTestId('pay-agreements-panel')).toHaveTextContent('none of them is assumed')
  })

  it('takes the contracted weekly hours from the employee record; they are not entered on the agreement', () => {
    renderPanel(30)
    fireEvent.change(screen.getByDisplayValue('Hourly care'), { target: { value: 'SALARIED' } })
    expect(screen.queryByLabelText('Contracted weekly hours')).not.toBeInTheDocument()
    expect(screen.getByTestId('pay-agreement-contracted-hours')).toHaveTextContent('Contracted weekly hours30Changed on the employee record.')
    fireEvent.change(screen.getByLabelText('Salary amount'), { target: { value: '2000' } })
    fireEvent.change(screen.getByLabelText('Salary entered per'), { target: { value: 'MONTHLY' } })
    fireEvent.change(screen.getByLabelText('How a part period is paid'), { target: { value: 'EQUAL_PERIODS_WORKING_DAYS' } })
    fireEvent.change(screen.getByLabelText('What the salary pays for'), { target: { value: 'CONTRACTED_HOURS' } })
    const save = screen.getByRole('button', { name: 'Save for approval' })
    expect(save).toBeEnabled()
    fireEvent.click(save)
    expect(state.create.mock.calls[0][0]).toMatchObject({
      basis: 'SALARIED',
      salaryEntryPeriod: 'MONTHLY',
      salaryEntryAmount: 2000,
      salaryProrationMethod: 'EQUAL_PERIODS_WORKING_DAYS',
      salaryCoverage: 'CONTRACTED_HOURS',
    })
    expect(state.create.mock.calls[0][0]).not.toHaveProperty('contractedHours')
  })

  it('no warning while the salary agreement has the same contracted hours as the employee record', () => {
    state.agreements = [agreement()]
    renderPanel(37.5)
    expect(screen.queryByTestId('pay-agreement-hours-changed')).not.toBeInTheDocument()
  })

  it('warns when the employee record hours changed after the salary agreement', () => {
    state.agreements = [agreement()]
    renderPanel(30)
    expect(screen.getByTestId('pay-agreement-hours-changed')).toHaveTextContent(
      'The contracted weekly hours on the employee record (30) differ from the salary agreement in force (37.5).',
    )
  })

  it('shows the history: salary as entered, what it pays for, who entered and who approved', () => {
    state.agreements = [agreement()]
    renderPanel()
    const item = screen.getByTestId('pay-agreement-item')
    expect(item).toHaveTextContent('Salaried · £24,000.00 a year (entered as £2,000.00 a month) · 37.5 contracted hours a week')
    expect(item).toHaveTextContent('From 2026-01-01 · entered by Olivia Office · approved by Peter Payroll')
    expect(item).toHaveTextContent('Salary pays for: All visit work — visit wages are not paid on top')
  })

  it('a draft awaiting approval can be approved only by someone with the approval power', () => {
    state.agreements = [agreement({ status: 'DRAFT', awaitingApproval: true, approvedByName: null })]
    const first = renderPanel()
    expect(screen.getByText(/a second person must approve it/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve agreement' })).not.toBeInTheDocument()
    first.unmount()

    state.permissions = ['payroll.pay_agreements.approve']
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Approve agreement' }))
    expect(state.approve).toHaveBeenCalledWith('a-1')
    // The approver without the manage permission gets no entry form.
    expect(screen.queryByText('New pay agreement')).not.toBeInTheDocument()
  })

  it('an agreement in effect is ended on a date; an hourly agreement after a salary also needs approval', () => {
    state.agreements = [agreement()]
    renderPanel()
    const endButton = screen.getByRole('button', { name: 'End agreement' })
    expect(endButton).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Last day of the agreement from 2026-01-01'), { target: { value: '2026-11-10' } })
    fireEvent.click(endButton)
    expect(state.end).toHaveBeenCalledWith({ agreementId: 'a-1', effectiveTo: '2026-11-10' })
    expect(screen.getByRole('button', { name: 'Save for approval' })).toBeInTheDocument()
  })

  it('guaranteed hours: recorded only by default; a paid shortfall needs what counts towards it and a second person', () => {
    renderPanel()
    fireEvent.change(screen.getByLabelText('Guaranteed weekly hours'), { target: { value: '14' } })
    // Recorded only: an ordinary hourly agreement.
    fireEvent.click(screen.getByRole('button', { name: 'Add agreement' }))
    expect(state.create.mock.calls[0][0]).toMatchObject({ basis: 'HOURLY_CARE', guaranteedWeeklyHours: 14 })
    expect(state.create.mock.calls[0][0]).not.toHaveProperty('guaranteeTopUp')

    fireEvent.click(screen.getByLabelText('Pay the shortfall as a top-up'))
    const save = screen.getByRole('button', { name: 'Save for approval' })
    expect(save).toBeDisabled()
    fireEvent.change(screen.getByLabelText('What counts towards the guarantee'), { target: { value: 'VISITS' } })
    expect(save).toBeEnabled()
    fireEvent.click(save)
    expect(state.create.mock.calls[1][0]).toMatchObject({
      guaranteedWeeklyHours: 14,
      guaranteeTopUp: 'PAY_SHORTFALL',
      guaranteeQualifyingTime: 'VISITS',
      guaranteeLeaveTreatment: null,
    })
  })

  it('shows a guarantee in the history with what counts towards it', () => {
    state.agreements = [
      agreement({
        basis: 'HOURLY_CARE',
        annualSalary: null,
        contractedHours: null,
        salaryEntryPeriod: null,
        salaryEntryAmount: null,
        guaranteedWeeklyHours: 14,
        guaranteeTopUp: 'PAY_SHORTFALL',
        guaranteeQualifyingTime: 'VISITS',
        guaranteeLeaveTreatment: null,
      }),
    ]
    renderPanel()
    const item = screen.getByTestId('pay-agreement-item')
    expect(item).toHaveTextContent('Hourly care · 14 guaranteed hours a week (shortfall paid)')
    expect(item).toHaveTextContent('Counts towards the guarantee: Visit time · A week with recorded absence is held for a person to decide')
  })

  it('warns when a salary in effect does not say what it pays for', () => {
    state.agreements = [agreement({ salaryCoverage: null, salaryProrationMethod: null })]
    renderPanel()
    expect(screen.getByTestId('pay-agreement-coverage-missing')).toHaveTextContent('visit wages are held')
  })
})
