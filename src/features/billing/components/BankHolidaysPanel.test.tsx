import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import type { BankHoliday, HolidayCalendarStatus } from '@/features/billing/types/wage-types.types'

const state = vi.hoisted(() => ({
  rows: [] as unknown[],
  status: null as unknown,
  permissions: [] as string[],
  regionSeen: undefined as string | undefined,
  create: vi.fn(),
  setBasis: vi.fn(),
}))

vi.mock('@/features/auth/store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ can: (p: string) => state.permissions.includes(p) }),
}))
vi.mock('@/features/billing/hooks/useWageTypes', () => ({
  useBankHolidays: (params?: { region?: string }) => {
    state.regionSeen = params?.region
    return { data: state.rows, isLoading: false, error: null }
  },
  useHolidayCalendarStatus: () => ({ data: state.status, isLoading: false, error: null }),
  useCreateBankHoliday: () => ({ mutateAsync: state.create, isPending: false }),
  useUpdateBankHoliday: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useImportBankHolidays: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSetHolidayPremiumBasis: () => ({ mutateAsync: state.setBasis, isPending: false }),
}))
vi.mock('@/shared/lib/toast', () => ({ toastApiError: vi.fn(), toastSuccess: vi.fn() }))

import { BankHolidaysPanel } from './BankHolidaysPanel'

const holiday = (over: Partial<BankHoliday>): BankHoliday => ({
  id: 'h-1',
  holidayDate: '2027-12-27',
  name: 'Christmas Day',
  region: 'UK',
  isActive: true,
  isSubstitute: false,
  substituteForDate: null,
  source: 'GOV_UK',
  ...over,
})
const status = (over: Partial<HolidayCalendarStatus> = {}): HolidayCalendarStatus => ({
  years: [2027, 2028],
  basis: 'BOTH',
  complete: true,
  organisationSpecialDays: 0,
  regions: [
    { region: 'UK', years: [{ year: 2027, count: 8, complete: true, issues: [] }, { year: 2028, count: 8, complete: true, issues: [] }] },
    { region: 'SCOTLAND', years: [{ year: 2027, count: 9, complete: true, issues: [] }, { year: 2028, count: 9, complete: true, issues: [] }] },
    { region: 'NORTHERN_IRELAND', years: [{ year: 2027, count: 10, complete: true, issues: [] }, { year: 2028, count: 10, complete: true, issues: [] }] },
  ],
  ...over,
})

describe('bank holidays panel (PC-22 to PC-24)', () => {
  beforeEach(() => {
    state.rows = []
    state.status = status()
    state.permissions = ['billing.pay_cards.manage']
    state.create.mockReset().mockResolvedValue({})
    state.setBasis.mockReset().mockResolvedValue({ message: 'Holiday pay basis updated', data: { basis: 'ACTUAL_DAY' } })
  })

  it('a substitute day says which date it stands for, or that this is not recorded', () => {
    state.rows = [
      holiday({ id: 'a', isSubstitute: true, substituteForDate: '2027-12-25' }),
      holiday({ id: 'b', holidayDate: '2027-06-07', name: 'Jubilee', isSubstitute: true, substituteForDate: null }),
      holiday({ id: 'c', holidayDate: '2027-03-26', name: 'Good Friday' }),
    ]
    render(<BankHolidaysPanel />)
    const marks = screen.getAllByTestId('bank-holiday-substitute')
    expect(marks).toHaveLength(2)
    expect(marks[0]).toHaveTextContent(/Substitute day for .*2027/)
    expect(marks[1]).toHaveTextContent('Substitute day — the date it stands for is not recorded')
  })

  it('incomplete calendars are listed with what is missing', () => {
    state.status = status({
      complete: false,
      regions: [
        { region: 'UK', years: [{ year: 2027, count: 8, complete: true, issues: [] }, { year: 2028, count: 0, complete: false, issues: ['No dates are recorded for 2028.'] }] },
        { region: 'SCOTLAND', years: [{ year: 2027, count: 8, complete: false, issues: ['2nd January (2027-01-02) is missing.'] }, { year: 2028, count: 9, complete: true, issues: [] }] },
        { region: 'NORTHERN_IRELAND', years: [{ year: 2027, count: 10, complete: true, issues: [] }, { year: 2028, count: 10, complete: true, issues: [] }] },
      ],
    })
    render(<BankHolidaysPanel />)
    const gaps = screen.getByTestId('holiday-calendar-gaps')
    expect(gaps).toHaveTextContent('Visits on a missing date are paid as an ordinary day')
    expect(gaps).toHaveTextContent('England & Wales 2028: No dates are recorded for 2028.')
    expect(gaps).toHaveTextContent('Scotland 2027: 2nd January (2027-01-02) is missing.')
    expect(gaps).not.toHaveTextContent('Northern Ireland')
  })

  it('complete calendars say so', () => {
    render(<BankHolidaysPanel />)
    expect(screen.getByTestId('holiday-calendar-complete')).toHaveTextContent('2027 and 2028 are complete for all three nations')
    expect(screen.queryByTestId('holiday-calendar-gaps')).not.toBeInTheDocument()
  })

  it('the weekend-holiday policy shows what is in use and changes only with a reason', async () => {
    render(<BankHolidaysPanel />)
    const card = screen.getByTestId('holiday-premium-basis')
    expect(card).toHaveTextContent('Both days (in use)')
    expect(card).toHaveTextContent('client charges are not changed by it')
    // Nothing to save until another option is chosen.
    expect(within(card).queryByRole('button', { name: 'Change the basis' })).not.toBeInTheDocument()

    fireEvent.click(within(card).getByRole('radio', { name: /The date the holiday falls on/ }))
    const save = within(card).getByRole('button', { name: 'Change the basis' })
    expect(save).toBeDisabled()
    fireEvent.change(within(card).getByLabelText('Reason for changing the holiday pay basis'), { target: { value: 'too short' } })
    expect(save).toBeDisabled()
    fireEvent.change(within(card).getByLabelText('Reason for changing the holiday pay basis'), { target: { value: 'Agreed by the directors on 1 March' } })
    expect(save).toBeEnabled()
    fireEvent.click(save)
    expect(state.setBasis).toHaveBeenCalledWith({ basis: 'ACTUAL_DAY', reason: 'Agreed by the directors on 1 March' })
    // Saved: the reason box is emptied for the next change.
    await waitFor(() => expect(within(card).getByLabelText('Reason for changing the holiday pay basis')).toHaveValue(''))
  })

  it('a user who cannot manage pay cards sees the policy but cannot change it', () => {
    state.permissions = []
    render(<BankHolidaysPanel />)
    for (const radio of within(screen.getByTestId('holiday-premium-basis')).getAllByRole('radio')) {
      expect(radio).toBeDisabled()
    }
  })

  it('organisation special days are a calendar of their own, with what they mean for pay', () => {
    render(<BankHolidaysPanel />)
    expect(screen.queryByTestId('organisation-special-days-note')).not.toBeInTheDocument()
    fireEvent.change(screen.getByDisplayValue('England & Wales'), { target: { value: 'ORGANISATION' } })
    expect(state.regionSeen).toBe('ORGANISATION')
    expect(screen.getByTestId('organisation-special-days-note')).toHaveTextContent('only where their pay card has a rate for')
    expect(screen.getByText('No organisation special days for this year.')).toBeInTheDocument()
  })
})
