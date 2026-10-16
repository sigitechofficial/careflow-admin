import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import type { LeaveEntryRow, LeavePosition, LeaveTermsRow } from '@/features/payroll/types/payroll.types'

const state = vi.hoisted(() => ({
  position: undefined as unknown,
  terms: [] as unknown[],
  entries: [] as unknown[],
  record: vi.fn(),
  createTerms: vi.fn(),
  approve: vi.fn(),
  userId: 'u-checker',
}))

vi.mock('@/features/auth/store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ can: () => true, user: { id: state.userId } }),
}))
vi.mock('@/features/payroll/hooks/usePayroll', () => ({
  useLeavePosition: () => ({ data: state.position }),
  useLeaveTerms: () => ({ data: state.terms }),
  useLeaveEntries: () => ({ data: state.entries }),
  useLeaveActions: () => ({
    recordEntry: { mutateAsync: state.record, isPending: false, error: null },
    createTerms: { mutateAsync: state.createTerms, isPending: false, error: null },
    approveTerms: { mutateAsync: state.approve, isPending: false, error: null },
  }),
}))

import { LeaveHolidaySection } from './LeaveHolidaySection'

const part = (over: Partial<NonNullable<LeavePosition['statutory']>> = {}) => ({
  entitlement: 112,
  taken: 37.5,
  adjustments: 0,
  carriedOver: 0,
  paidOnLeaving: 0,
  balance: 74.5,
  fullYearEntitlement: 210,
  ...over,
})
const terms = (over: Partial<LeaveTermsRow> = {}): LeaveTermsRow => ({
  id: 't-1',
  workerCategory: 'REGULAR_HOURS',
  leaveYearStartMonth: 4,
  leaveYearStartDay: 1,
  weeklyHours: 37.5,
  contractualExtraHours: null,
  payMethod: 'NORMAL_REMUNERATION_52_WEEKS',
  carryOverMaxHours: null,
  effectiveFrom: '2026-04-01',
  effectiveTo: null,
  status: 'ACTIVE',
  note: null,
  createdById: 'u-maker',
  approvedById: 'u-checker',
  approvedAt: '2026-04-02T00:00:00.000Z',
  ...over,
})
const withTerms = (): LeavePosition => ({
  employeeId: 'e-1',
  asOf: '2026-10-14',
  terms: terms(),
  leaveYear: { start: '2026-04-01', end: '2027-03-31' },
  statutory: part(),
  contractual: part({ entitlement: 0, taken: 0, balance: 0, fullYearEntitlement: 0 }),
  leaver: null,
})
const show = () => render(<LeaveHolidaySection employeeId="e-1" canEdit employmentEndDate={null} annualSalary={null} />)
const set = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })

describe('Leave / Holiday on the payroll profile: simple layout', () => {
  beforeEach(() => {
    state.position = withTerms()
    state.terms = [terms()]
    state.entries = []
    state.record.mockReset().mockResolvedValue({})
    state.createTerms.mockReset().mockResolvedValue({})
    state.approve.mockReset().mockResolvedValue({})
    state.userId = 'u-checker'
  })

  it('shows the balance in days (a day = weekly hours / 5) and hides the allowance choice without contract extra', () => {
    show()
    const balance = screen.getByTestId('leave-balance')
    expect(balance).toHaveTextContent('1 day = 7.5 hours')
    expect(balance).toHaveTextContent('Earned so far14.93 days') // 112h / 7.5
    expect(balance).toHaveTextContent('of 28 days this year')
    expect(balance).toHaveTextContent('Taken5 days')
    expect(balance).toHaveTextContent('Left9.93 days')
    expect(screen.queryByLabelText('Leave entitlement type')).toBeNull()
    expect(screen.getByTestId('leave-terms')).not.toHaveAttribute('open') // rules folded once approved
  })

  it('records holiday in days, saved as hours, against the statutory allowance', () => {
    show()
    expect(screen.getByRole('button', { name: 'Record holiday' })).toBeDisabled()
    set('Leave date', '2026-08-03')
    set('Leave amount', '2')
    expect(screen.getByText('Saved as 15 hours.')).toBeInTheDocument()
    expect(screen.getByText('Still needed: a short note.')).toBeInTheDocument()
    set('Leave note', 'Summer holiday')
    fireEvent.click(screen.getByRole('button', { name: 'Record holiday' }))
    expect(state.record).toHaveBeenCalledWith({ entryType: 'TAKEN', entitlementType: 'STATUTORY', hours: 15, date: '2026-08-03', note: 'Summer holiday' })
  })

  it('history shows days and hours; contract extra is marked', () => {
    state.entries = [
      { id: 'l-1', entryType: 'TAKEN', entitlementType: 'CONTRACTUAL', hours: 7.5, date: '2026-05-01', note: 'Day off', createdById: null, createdAt: '' } satisfies LeaveEntryRow,
    ]
    show()
    expect(screen.getByTestId('leave-entries')).toHaveTextContent('Holiday taken (contract extra)1 days (7.5h)Day off')
  })

  it('with no approved rules: says what to do, opens the rules, works in hours, and a second person approves a draft', () => {
    state.position = { employeeId: 'e-1', asOf: '2026-10-14', terms: null, note: 'No approved leave terms in force.' }
    state.terms = [terms({ status: 'DRAFT', approvedById: null, approvedAt: null })]
    show()
    expect(screen.getByTestId('leave-no-terms')).toHaveTextContent('First set up the holiday rules below')
    expect(screen.getByTestId('leave-terms-waiting')).toHaveTextContent('Holiday rules from 2026-04-01 are waiting for a second person')
    expect(screen.getByTestId('leave-terms')).toHaveAttribute('open')
    expect(screen.queryByRole('radiogroup', { name: 'Leave unit' })).toBeNull()
    expect(screen.getByText('Days can be used once the holiday rules have weekly hours.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(state.approve).toHaveBeenCalledWith('t-1')
  })

  it('the person who entered the rules cannot approve them', () => {
    state.position = { employeeId: 'e-1', asOf: '2026-10-14', terms: null }
    state.terms = [terms({ status: 'DRAFT' })]
    state.userId = 'u-maker'
    show()
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
  })

  it('saves new holiday rules with the same fields as before', () => {
    show()
    set('Weekly hours', '30')
    set('Leave terms effective from', '2027-04-01')
    fireEvent.click(screen.getByRole('button', { name: 'Save holiday rules' }))
    expect(state.createTerms).toHaveBeenCalledWith({
      workerCategory: 'REGULAR_HOURS',
      leaveYearStartMonth: 4,
      leaveYearStartDay: 1,
      weeklyHours: 30,
      contractualExtraHours: null,
      payMethod: 'NORMAL_REMUNERATION_52_WEEKS',
      carryOverMaxHours: null,
      effectiveFrom: '2027-04-01',
    })
  })
})
