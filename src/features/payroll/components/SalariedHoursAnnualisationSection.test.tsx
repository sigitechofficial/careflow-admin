import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { ApiError } from '@/shared/api/api-client'
import type { SalariedHoursMethod, SalariedHoursMethods } from '@/features/payroll/types/payroll.types'

const state = vi.hoisted(() => ({
  data: null as unknown,
  permissions: [] as string[],
  userId: 'u-checker',
  enter: vi.fn(),
  approve: vi.fn(),
  withdraw: vi.fn(),
}))

vi.mock('@/features/auth/store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ can: (p: string) => state.permissions.includes(p), user: { id: state.userId } }),
}))
vi.mock('@/shared/lib/toast', () => ({ toastApiError: vi.fn(), toastSuccess: vi.fn() }))
vi.mock('@/features/payroll/hooks/usePayroll', () => ({
  useSalariedHoursMethods: () => ({ data: state.data, isLoading: false, error: null }),
  useSalariedHoursMethodActions: () => ({
    enter: { mutateAsync: state.enter, isPending: false },
    approve: { mutateAsync: state.approve, isPending: false },
    withdraw: { mutateAsync: state.withdraw, isPending: false },
  }),
}))

import { SalariedHoursAnnualisationSection } from './SalariedHoursAnnualisationSection'

// All multipliers here are synthetic test values, not an employer's policy.
const method = (over: Partial<SalariedHoursMethod> = {}): SalariedHoursMethod => ({
  id: 'm-1',
  weeksPerYear: 52.14,
  basis: 'Synthetic: staff handbook section 4.2',
  effectiveFrom: '2026-04-01',
  status: 'DRAFT',
  isSynthetic: false,
  createdById: 'u-maker',
  createdByName: 'Olivia Office',
  createdAt: '2026-03-10T09:00:00.000Z',
  approvedById: null,
  approvedByName: null,
  approvedAt: null,
  withdrawnAt: null,
  withdrawnByName: null,
  withdrawnNote: null,
  ...over,
})
const approved = (over: Partial<SalariedHoursMethod> = {}) =>
  method({ status: 'APPROVED', approvedById: 'u-checker', approvedByName: 'Peter Payroll', approvedAt: '2026-03-12T09:00:00.000Z', ...over })
const set = (data: SalariedHoursMethods) => {
  state.data = data
}
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const rows = () => screen.getAllByTestId('annualisation-method-row')

describe('salaried hours annualisation settings (Sprint B4C)', () => {
  beforeEach(() => {
    set({ inForce: null, methods: [] })
    state.permissions = ['payroll.settings.read', 'payroll.settings.manage', 'payroll.pay_agreements.approve']
    state.userId = 'u-checker'
    for (const fn of [state.enter, state.approve, state.withdraw]) fn.mockReset().mockResolvedValue({ message: 'Done' })
  })

  it('warns when no approved method applies, and says that nothing is assumed', () => {
    render(<SalariedHoursAnnualisationSection />)
    const warning = screen.getByTestId('annualisation-none')
    expect(warning).toHaveTextContent('No approved method applies today')
    expect(warning).toHaveTextContent('policy review required')
    expect(warning).toHaveTextContent('Nothing is assumed in its place')
    expect(screen.getByTestId('annualisation-methods')).toHaveTextContent('No method has been entered.')
    // Weekly hours stay the contract's figure: there is no annual-hours field.
    expect(screen.getByTestId('salaried-hours-annualisation')).toHaveTextContent('Pay agreements record contracted weekly hours only')
    expect(screen.queryByLabelText(/annual hours/i)).toBeNull()
  })

  it('a proposed method needs the weeks, an effective date and a policy reference', async () => {
    state.userId = 'u-maker'
    render(<SalariedHoursAnnualisationSection />)
    const save = screen.getByRole('button', { name: 'Enter method' })
    expect(save).toBeDisabled()
    type('Weeks in a year', '52.14')
    type('Effective from', '2026-04-01')
    type('Policy reference (where it is written down, and why)', 'too short')
    expect(save).toBeDisabled()
    type('Policy reference (where it is written down, and why)', 'Synthetic: staff handbook section 4.2, approved by the directors')
    expect(save).toBeEnabled()
    type('Weeks in a year', '60')
    expect(save).toBeDisabled() // not a number of weeks in a year
    type('Weeks in a year', '52.14')
    fireEvent.click(save)
    await waitFor(() =>
      expect(state.enter).toHaveBeenCalledWith({
        weeksPerYear: 52.14,
        basis: 'Synthetic: staff handbook section 4.2, approved by the directors',
        effectiveFrom: '2026-04-01',
      }),
    )
  })

  it('shows each method with its factor, date, status, who entered it and its policy reference', () => {
    set({ inForce: null, methods: [method()] })
    render(<SalariedHoursAnnualisationSection />)
    const [row] = rows()
    expect(row).toHaveTextContent('Contracted weekly hours × 52.14 weeks')
    expect(row).toHaveTextContent('2026-04-01')
    expect(row).toHaveTextContent('Draft')
    expect(row).toHaveTextContent('Olivia Office')
    expect(row).toHaveTextContent('2026-03-10')
    expect(row).toHaveTextContent('Synthetic: staff handbook section 4.2')
    // Entered is not approved: the warning stays.
    expect(screen.getByTestId('annualisation-none')).toBeInTheDocument()
  })

  it('the user who entered a method cannot approve it', () => {
    state.userId = 'u-maker'
    set({ inForce: null, methods: [method()] })
    render(<SalariedHoursAnnualisationSection />)
    expect(screen.getByTestId('annualisation-own-entry')).toHaveTextContent('a different user must approve it')
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
  })

  it('a different user with the approval power approves it, and what the server refuses is shown', async () => {
    set({ inForce: null, methods: [method()] })
    const { rerender } = render(<SalariedHoursAnnualisationSection />)
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(state.approve).toHaveBeenCalledWith('m-1'))

    state.approve.mockRejectedValue(new ApiError('The annualisation method is approved by a different user from the one who entered it.', 403))
    rerender(<SalariedHoursAnnualisationSection />)
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('approved by a different user')
  })

  it('an approved method in force is shown with its approver and approval date, and replaces the warning', () => {
    const current = approved()
    set({ inForce: current, methods: [current] })
    render(<SalariedHoursAnnualisationSection />)
    expect(screen.queryByTestId('annualisation-none')).toBeNull()
    expect(screen.getByTestId('annualisation-in-force')).toHaveTextContent('In use today: Contracted weekly hours × 52.14 weeks, from 2026-04-01.')
    const [row] = rows()
    expect(row).toHaveTextContent('Approved')
    expect(row).toHaveTextContent('Peter Payroll')
    expect(row).toHaveTextContent('2026-03-12')
    expect(within(row).queryByRole('button', { name: 'Approve' })).toBeNull()
  })

  it('withdrawing a method needs a reason', async () => {
    const current = approved()
    set({ inForce: current, methods: [current] })
    render(<SalariedHoursAnnualisationSection />)
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }))
    const confirm = screen.getByRole('button', { name: 'Confirm withdrawal' })
    expect(confirm).toBeDisabled()
    type('Reason for withdrawing', 'Synthetic: under legal review')
    fireEvent.click(confirm)
    await waitFor(() => expect(state.withdraw).toHaveBeenCalledWith({ id: 'm-1', note: 'Synthetic: under legal review' }))
  })

  it('previous methods stay listed: withdrawn with its reason, and a later approved one that does not apply yet', () => {
    const old = method({
      id: 'm-0',
      weeksPerYear: 52,
      status: 'WITHDRAWN',
      approvedByName: 'Peter Payroll',
      approvedAt: '2026-01-05T09:00:00.000Z',
      withdrawnAt: '2026-03-01T09:00:00.000Z',
      withdrawnByName: 'Peter Payroll',
      withdrawnNote: 'Replaced after review',
    })
    const later = approved({ id: 'm-2', weeksPerYear: 52.18, effectiveFrom: '2027-04-01' })
    set({ inForce: null, methods: [later, old] })
    render(<SalariedHoursAnnualisationSection />)
    expect(rows()).toHaveLength(2)
    expect(rows()[0]).toHaveTextContent('Contracted weekly hours × 52.18 weeks')
    expect(rows()[0]).toHaveTextContent('2027-04-01')
    expect(rows()[1]).toHaveTextContent('Withdrawn')
    expect(rows()[1]).toHaveTextContent('2026-03-01 by Peter Payroll: Replaced after review')
    expect(within(rows()[1]).queryByRole('button')).toBeNull() // nothing more to do with a withdrawn method
    // Approved for the future is not in force today.
    expect(screen.getByTestId('annualisation-none')).toBeInTheDocument()
  })

  it('without the powers the section is read-only; a synthetic fixture is labelled as one', () => {
    state.permissions = ['payroll.settings.read']
    const fixture = approved({ weeksPerYear: 52, isSynthetic: true })
    set({ inForce: fixture, methods: [fixture] })
    render(<SalariedHoursAnnualisationSection />)
    expect(screen.getByTestId('annualisation-read-only')).toHaveTextContent('You can view the methods')
    expect(screen.queryByTestId('annualisation-entry-form')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Withdraw' })).toBeNull()
    expect(rows()[0]).toHaveTextContent('Contracted weekly hours × 52 weeks (synthetic test method)')
  })
})
