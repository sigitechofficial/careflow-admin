import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { ApiError } from '@/shared/api/api-client'
import type { WageRecovery, WageRecoveryDetail } from '@/features/billing/api/wage-recoveries.api'

const state = vi.hoisted(() => ({
  rows: [] as unknown[],
  detail: null as unknown,
  policy: { inForce: true, reference: 'Synthetic policy v1', recordedAt: '2026-09-01T09:00:00.000Z', recordedByName: 'Dana Director' } as unknown,
  permissions: [] as string[],
  userId: 'u-approver',
  listStatus: undefined as string | undefined,
  approve: vi.fn(),
  reject: vi.fn(),
  recordPolicy: vi.fn(),
  withdrawPolicy: vi.fn(),
}))

vi.mock('@/features/auth/store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ can: (p: string) => state.permissions.includes(p), user: { id: state.userId } }),
}))
vi.mock('@/shared/lib/toast', () => ({ toastApiError: vi.fn(), toastSuccess: vi.fn() }))
vi.mock('@/features/billing/hooks/useWageRecoveries', () => ({
  useWageRecoveries: (status?: string) => {
    state.listStatus = status
    return { data: state.rows, isLoading: false, error: null }
  },
  useWageRecovery: (id: string | null) => ({ data: id ? state.detail : undefined, error: null }),
  useWageRecoveryPolicy: () => ({ data: state.policy }),
  useWageRecoveryActions: () => ({
    approve: { mutateAsync: state.approve, isPending: false },
    reject: { mutateAsync: state.reject, isPending: false },
    recordPolicy: { mutateAsync: state.recordPolicy, isPending: false },
    withdrawPolicy: { mutateAsync: state.withdrawPolicy, isPending: false },
  }),
}))

import WageRecoveriesPage from './WageRecoveriesPage'

const recovery = (over: Partial<WageRecovery> = {}): WageRecovery => ({
  id: 'r-1',
  employeeId: 'e-1',
  employeeName: 'Synthetic Sal',
  kind: 'SALARY',
  paidAmount: 2000,
  dueAmount: 1800,
  amount: 200,
  reason: 'Salary for November 2026 was paid at £2000.00; £1800.00 is due.',
  originalReference: '£2000.00 paid as salary for November 2026',
  status: 'PROPOSED',
  authorityBasis: null,
  decisionNote: null,
  proposedAt: '2026-12-03T10:00:00.000Z',
  proposedById: 'u-preparer',
  proposedByName: 'Pat Preparer',
  proposedInRun: 'UK payroll run December 2026',
  decidedById: null,
  decidedByName: null,
  decidedAt: null,
  appliedInRunId: null,
  appliedInRun: null,
  appliedAt: null,
  ...over,
})
const detail = (over: Partial<WageRecoveryDetail> = {}): WageRecoveryDetail => ({
  ...recovery(),
  history: [{ at: '2026-12-03T10:00:00.000Z', event: 'PROPOSED', by: 'Pat Preparer', detail: 'Found by UK payroll run December 2026.' }],
  ...over,
})
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const open = () => fireEvent.click(screen.getByRole('button', { name: /^(Review|Open)$/ }))

describe('wage recoveries screen (Sprint B4A, Task 1)', () => {
  beforeEach(() => {
    state.rows = [recovery()]
    state.detail = detail()
    state.policy = { inForce: true, reference: 'Synthetic policy v1', recordedAt: '2026-09-01T09:00:00.000Z', recordedByName: 'Dana Director' }
    state.permissions = ['billing.payroll_runs.read', 'billing.payroll_runs.approve']
    state.userId = 'u-approver'
    for (const fn of [state.approve, state.reject, state.recordPolicy, state.withdrawPolicy]) fn.mockReset().mockResolvedValue({ message: 'Done' })
  })

  it('lists pending recoveries first, with the employee, the original payment, the amounts and who proposed it', () => {
    render(<WageRecoveriesPage />)
    expect(state.listStatus).toBe('PROPOSED')
    const row = screen.getByTestId('wage-recovery-row')
    expect(row).toHaveTextContent('Synthetic Sal')
    expect(row).toHaveTextContent('£2000.00 paid as salary for November 2026')
    expect(row).toHaveTextContent('Salary overpaid')
    expect(row).toHaveTextContent('£2000.00')
    expect(row).toHaveTextContent('£200.00')
    expect(row).toHaveTextContent('Awaiting decision')
    expect(row).toHaveTextContent('2026-12-03')
    expect(row).toHaveTextContent('Pat Preparer')
    // The other statuses are a click away.
    fireEvent.click(screen.getByRole('tab', { name: 'Deducted' }))
    expect(state.listStatus).toBe('APPLIED')
    fireEvent.click(screen.getByRole('tab', { name: 'All' }))
    expect(state.listStatus).toBeUndefined()
  })

  it('simple layout: the steps, a pending recovery offers Review, and it opens under its own row with the amounts in one line', () => {
    render(<WageRecoveriesPage />)
    expect(screen.getByTestId('recovery-steps')).toHaveTextContent('Someone else decides')
    const review = screen.getByRole('button', { name: 'Review' })
    fireEvent.click(review)
    const detailRow = screen.getByTestId('wage-recovery-row').nextElementSibling as HTMLElement
    expect(within(detailRow).getByTestId('recovery-amounts')).toHaveTextContent('Paid £2000.00, due £1800.00 → recover £200.00')
    expect(screen.getByRole('button', { name: 'Hide' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hide' }))
    expect(screen.queryByTestId('recovery-detail')).toBeNull()
  })

  it('authorising needs an authority, its reference and a reason; the amount cannot be edited', async () => {
    render(<WageRecoveriesPage />)
    open()
    const form = screen.getByTestId('recovery-authorise-form')
    expect(form).toHaveTextContent('Authorise recovery of £200.00')
    expect(form).toHaveTextContent('it is not proof that the deduction is lawful')
    expect(screen.queryByRole('spinbutton')).toBeNull() // no amount field anywhere
    const save = screen.getByRole('button', { name: 'Authorise recovery' })
    expect(save).toBeDisabled()
    type('Reason for authorising', 'Overpayment confirmed with the employee')
    type('Reference (clause, document, date)', 'Clause 9.2, contract of 2026-01-05')
    expect(save).toBeDisabled() // an authority must be chosen
    type('Authority for the deduction', 'CONTRACT_TERM')
    type('Reference (clause, document, date)', 'cl 9')
    expect(save).toBeDisabled() // too short to be a reference
    type('Reference (clause, document, date)', 'Clause 9.2, contract of 2026-01-05')
    expect(save).toBeEnabled()
    fireEvent.click(save)
    await waitFor(() =>
      expect(state.approve).toHaveBeenCalledWith({
        id: 'r-1',
        authorityBasis: 'Term of the employment contract: Clause 9.2, contract of 2026-01-05',
        reason: 'Overpayment confirmed with the employee',
      }),
    )
  })

  it('rejecting writes the recovery off with a reason', async () => {
    render(<WageRecoveriesPage />)
    open()
    const reject = screen.getByRole('button', { name: 'Reject and write off' })
    expect(reject).toBeDisabled()
    type('Reason for not recovering', 'Our own error; not recovered')
    fireEvent.click(reject)
    await waitFor(() => expect(state.reject).toHaveBeenCalledWith({ id: 'r-1', note: 'Our own error; not recovered' }))
  })

  it('without the approval permission the recovery can be read but not decided, and the policy cannot be changed', () => {
    state.permissions = ['billing.payroll_runs.read']
    render(<WageRecoveriesPage />)
    open()
    expect(screen.getByTestId('recovery-no-permission')).toHaveTextContent('needs the pay run approval permission')
    expect(screen.queryByTestId('recovery-authorise-form')).toBeNull()
    expect(screen.queryByTestId('recovery-reject-form')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Withdraw policy' })).toBeNull()
  })

  it('the user whose calculation proposed a recovery cannot authorise it', () => {
    state.userId = 'u-preparer'
    render(<WageRecoveriesPage />)
    open()
    expect(screen.getByTestId('recovery-own-proposal')).toHaveTextContent('a different user must authorise it')
    expect(screen.queryByRole('button', { name: 'Authorise recovery' })).toBeNull()
  })

  it('shows what the server refuses, for example a self-approval', async () => {
    state.approve.mockRejectedValue(
      new ApiError('A wage recovery is authorised by a different user from the one whose calculation proposed it.', 403),
    )
    render(<WageRecoveriesPage />)
    open()
    type('Authority for the deduction', 'WRITTEN_AGREEMENT')
    type('Reference (clause, document, date)', 'Signed agreement dated 2026-11-20')
    type('Reason for authorising', 'Agreed with the employee')
    fireEvent.click(screen.getByRole('button', { name: 'Authorise recovery' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('authorised by a different user')
  })

  it('a recovery whose amount changed after it was decided asks for a fresh decision', () => {
    const again = { status: 'PROPOSED' as const, amount: 150, decisionNote: 'The amount changed from £200.00 to £150.00 after it was authorised.' }
    state.rows = [recovery(again)]
    state.detail = detail({
      ...again,
      history: [
        { at: '2026-12-03T10:00:00.000Z', event: 'PROPOSED', by: 'Pat Preparer', detail: 'Found by UK payroll run December 2026.' },
        { at: '2026-12-04T10:00:00.000Z', event: 'AUTHORISED', by: 'Alex Approver', detail: 'Agreed — authority: clause 9.2 (for £200.00)' },
        { at: '2026-12-05T10:00:00.000Z', event: 'PROPOSED_AGAIN', by: null, detail: again.decisionNote },
      ],
    })
    render(<WageRecoveriesPage />)
    expect(screen.getByTestId('wage-recovery-row')).toHaveTextContent('Amount changed: needs a fresh decision')
    open()
    expect(screen.getByTestId('recovery-proposed-again')).toHaveTextContent('that decision no longer applies')
    expect(screen.getByTestId('recovery-authorise-form')).toHaveTextContent('Authorise recovery of £150.00')
  })

  it('a recovery already deducted shows the run and offers no further decision', () => {
    const applied = {
      status: 'APPLIED' as const,
      authorityBasis: 'Term of the employment contract: clause 9.2',
      decidedByName: 'Alex Approver',
      decidedAt: '2026-12-04T10:00:00.000Z',
      appliedInRun: 'UK payroll run December 2026',
      appliedAt: '2026-12-20T10:00:00.000Z',
    }
    state.rows = [recovery(applied)]
    state.detail = detail({
      ...applied,
      history: [
        { at: '2026-12-03T10:00:00.000Z', event: 'PROPOSED', by: 'Pat Preparer', detail: 'Found by UK payroll run December 2026.' },
        { at: '2026-12-04T10:00:00.000Z', event: 'AUTHORISED', by: 'Alex Approver', detail: 'Agreed — authority: clause 9.2 (for £200.00)' },
        { at: '2026-12-20T10:00:00.000Z', event: 'APPLIED', by: null, detail: 'Deducted once, in UK payroll run December 2026.' },
      ],
    })
    render(<WageRecoveriesPage />)
    const row = screen.getByTestId('wage-recovery-row')
    expect(row).toHaveTextContent('Deducted')
    expect(row).toHaveTextContent('Alex Approver')
    expect(row).toHaveTextContent('UK payroll run December 2026')
    open()
    expect(screen.getByTestId('recovery-applied')).toHaveTextContent('It cannot be deducted again or changed here')
    expect(screen.queryByTestId('recovery-authorise-form')).toBeNull()
    expect(screen.queryByTestId('recovery-reject-form')).toBeNull()
    const history = within(screen.getByTestId('recovery-history')).getAllByRole('listitem')
    expect(history.map(li => li.textContent)).toEqual([
      '2026-12-03 proposed by Pat Preparer — Found by UK payroll run December 2026.',
      '2026-12-04 authorised by Alex Approver — Agreed — authority: clause 9.2 (for £200.00)',
      '2026-12-20 applied — Deducted once, in UK payroll run December 2026.',
    ])
  })

  it('with no recovery policy on record an authorised recovery is shown as not deducted, and an approver can record the policy', async () => {
    state.policy = { inForce: false, reference: null, recordedAt: null, recordedByName: null }
    const approved = { status: 'APPROVED' as const, authorityBasis: 'Term of the employment contract: clause 9.2', decidedByName: 'Alex Approver' }
    state.rows = [recovery(approved)]
    state.detail = detail(approved)
    render(<WageRecoveriesPage />)
    expect(screen.getByTestId('recovery-policy')).toHaveTextContent('nothing is deducted from wages until the policy and its legal authority are recorded')
    expect(screen.getByTestId('wage-recovery-row')).toHaveTextContent('Not deducted: no recovery policy on record')
    open()
    expect(screen.getByTestId('recovery-policy-blocked')).toHaveTextContent('Authorised, but not deducted')
    const record = screen.getByRole('button', { name: 'Record policy' })
    expect(record).toBeDisabled()
    type('Where the approved policy and its legal authority are recorded', 'Recovery policy v1, approved by the directors 2026-09-01')
    fireEvent.click(record)
    await waitFor(() => expect(state.recordPolicy).toHaveBeenCalledWith('Recovery policy v1, approved by the directors 2026-09-01'))
  })
})
