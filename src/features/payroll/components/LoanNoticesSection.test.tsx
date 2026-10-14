import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { ApiError } from '@/shared/api/api-client'
import type { EmployeeLoanNotice } from '@/features/payroll/types/payroll.types'

const state = vi.hoisted(() => ({ notices: [] as unknown[], record: vi.fn(), fetch: vi.fn() }))

vi.mock('@/shared/lib/toast', () => ({ toastApiError: vi.fn(), toastSuccess: vi.fn() }))
vi.mock('@/features/payroll/api/payroll.api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/payroll/api/payroll.api')>()),
  fetchLoanNotices: state.fetch,
  recordLoanNotice: state.record,
}))

import { LoanNoticesSection } from './LoanNoticesSection'

const notice = (over: Partial<EmployeeLoanNotice> = {}): EmployeeLoanNotice => ({
  id: 'n-1',
  employeeId: 'e-1',
  noticeType: 'SL1',
  studentLoanPlan: '2',
  hmrcReference: 'SL1-A',
  noticeDate: '2026-05-01',
  receivedOn: '2026-05-12',
  effectivePayday: '2026-05-31',
  notes: null,
  createdById: 'u-1',
  createdAt: '2026-05-12T10:00:00.000Z',
  ...over,
})
const show = (props: Partial<Parameters<typeof LoanNoticesSection>[0]> = {}) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <LoanNoticesSection employeeId="e-1" profile={{}} canEdit {...props} />
    </QueryClientProvider>,
  )
const set = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const recordButton = () => screen.getByRole('button', { name: 'Record notice' })
const fillDates = () => {
  set('Date on the notice', '2026-05-01')
  set('Date received', '2026-05-12')
  set('Effective payroll payday', '2026-05-31')
  fireEvent.click(screen.getByLabelText('I confirm this is the first payday on which this notice can be operated'))
}

describe('student and postgraduate loan notices on the payroll profile (Gate C14)', () => {
  beforeEach(() => {
    state.notices = []
    state.fetch.mockReset().mockImplementation(async () => state.notices)
    state.record.mockReset()
  })

  it('SL1 needs the plan, the dates and the confirmation; once saved the history is reloaded', async () => {
    state.record.mockImplementation(async (_id: string, body: Record<string, unknown>) => {
      state.notices = [notice()]
      return { message: 'Notice recorded', duplicate: false, data: notice({ ...body } as never) }
    })
    show()
    expect(await screen.findByText('No notice recorded.')).toBeInTheDocument()
    expect(recordButton()).toBeDisabled()
    fillDates()
    expect(screen.getByTestId('loan-notice-form')).toHaveTextContent('Still needed: the student loan plan.')
    expect(recordButton()).toBeDisabled()
    set('Student loan plan', '2')
    set('HMRC reference', 'SL1-A')
    expect(recordButton()).toBeEnabled()
    fireEvent.click(recordButton())
    await waitFor(() =>
      expect(state.record).toHaveBeenCalledWith('e-1', {
        noticeType: 'SL1',
        studentLoanPlan: '2',
        hmrcReference: 'SL1-A',
        noticeDate: '2026-05-01',
        receivedOn: '2026-05-12',
        effectivePayday: '2026-05-31',
      }),
    )
    const history = await screen.findByTestId('loan-notice-history')
    expect(history).toHaveTextContent('SL1')
    expect(history).toHaveTextContent('Plan 2')
    expect(history).toHaveTextContent('2026-05-31')
    expect(state.fetch).toHaveBeenCalledTimes(2) // loaded, then reloaded after the save
  })

  it('PGL2 has no student plan field; a conflict from the API is shown', async () => {
    state.record.mockRejectedValue(new ApiError('A PGL2 notice with this reference is already recorded with different details', 409))
    show()
    set('Notice type', 'PGL2')
    expect(screen.queryByLabelText('Student loan plan')).toBeNull()
    fillDates()
    set('HMRC reference', 'PGL2-A')
    fireEvent.click(recordButton())
    await waitFor(() => expect(state.record).toHaveBeenCalledWith('e-1', expect.not.objectContaining({ studentLoanPlan: expect.anything() })))
    expect(await screen.findByRole('alert')).toHaveTextContent('already recorded with different details')
  })

  it('a reader sees the notices and the legacy-settings warning but cannot record a notice', async () => {
    state.notices = [notice(), notice({ id: 'n-2', noticeType: 'PGL1', studentLoanPlan: null, hmrcReference: null, effectivePayday: '2026-06-30', createdAt: '2026-06-15T10:00:00.000Z' })]
    show({ canEdit: false, profile: { studentLoanPlan2: true, postgraduateLoan: true } })
    const rows = (await screen.findByTestId('loan-notice-history')).querySelectorAll('tbody tr')
    expect([...rows].map((r) => r.textContent)).toEqual([
      expect.stringContaining('PGL1'), // most recent payday first
      expect.stringContaining('SL1'),
    ])
    expect(screen.getByTestId('loan-notices-legacy')).toHaveTextContent('(Plan 2, postgraduate loan) are not verified HMRC notices')
    expect(screen.queryByTestId('loan-notice-form')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Record notice' })).toBeNull()
    expect(screen.getByTestId('loan-notices')).toHaveTextContent('cannot be edited or deleted here')
  })
})
