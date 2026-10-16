import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

import type { VisitPayCorrectionHistory } from '@/features/billing/types/pay-items.types'

const state = vi.hoisted(() => ({
  history: null as unknown,
  permissions: [] as string[],
  userId: 'user-maker',
  record: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  reverse: vi.fn(),
}))

vi.mock('@/features/auth/store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ can: (p: string) => state.permissions.includes(p), user: { id: state.userId } }),
}))
vi.mock('@/features/billing/hooks/usePayItems', () => {
  const mutation = (fn: (...args: unknown[]) => unknown) => ({ mutateAsync: fn, isPending: false })
  return {
    useVisitPayCorrections: () => ({ data: state.history, isLoading: false, error: null }),
    useRecordVisitPayCorrection: () => mutation(state.record),
    useApprovePayItem: () => mutation(state.approve),
    useRejectPayItem: () => mutation(state.reject),
    useReversePayItem: () => mutation(state.reverse),
  }
})
vi.mock('@/shared/lib/toast', () => ({ toastApiError: vi.fn(), toastError: vi.fn(), toastSuccess: vi.fn() }))

import { VisitPayCorrectionsCard } from './VisitPayCorrectionsCard'

const item = (over: Partial<VisitPayCorrectionHistory['items'][number]> = {}) => ({
  id: 'item-1',
  amount: '7.00',
  reason: 'Pay correction VIS-1: Visit ran longer than paid',
  sourceType: 'VISIT_CORRECTION',
  status: 'PENDING_APPROVAL',
  displayStatus: 'PENDING_APPROVAL' as const,
  originalAmount: '14.00',
  correctedAmount: '21.00',
  createdAt: '2026-11-10T09:00:00.000Z',
  createdById: 'user-maker',
  createdByName: 'Maker One',
  canReverse: false,
  ...over,
})
const history = (over: Partial<VisitPayCorrectionHistory> = {}): VisitPayCorrectionHistory => ({
  visit: { id: 'visit-1', visitRef: 'VIS-1', employeeId: 'emp-1', paySettled: true, settledBy: 'VISIT_PAY_RUN' },
  originalAmount: '14.00',
  netAmount: '14.00',
  differenceAmount: '0.00',
  canRecordCorrection: true,
  items: [],
  ...over,
})
const show = () => render(<VisitPayCorrectionsCard visitReconciliationId="visit-1" />)

describe('VisitPayCorrectionsCard (R-01)', () => {
  beforeEach(() => {
    state.permissions = ['billing.payroll_runs.read', 'billing.payroll_runs.manage']
    state.userId = 'user-maker'
    state.history = history()
    for (const fn of [state.record, state.approve, state.reject, state.reverse]) {
      fn.mockReset()
      fn.mockResolvedValue({ message: 'ok' })
    }
  })

  it('shows nothing for a visit whose pay is not settled, or without permission', () => {
    state.history = history({ visit: { ...history().visit, paySettled: false, settledBy: null } })
    const { container, unmount } = show()
    expect(container).toBeEmptyDOMElement()
    unmount()

    state.history = history()
    state.permissions = []
    expect(show().container).toBeEmptyDOMElement()
  })

  it('shows original → corrected → difference', () => {
    state.history = history({ netAmount: '21.00', differenceAmount: '7.00', items: [item()], canRecordCorrection: false })
    show()
    expect(screen.getByTestId('visit-pay-original')).toHaveTextContent('£14.00')
    expect(screen.getByTestId('visit-pay-corrected')).toHaveTextContent('£21.00')
    expect(screen.getByTestId('visit-pay-difference')).toHaveTextContent('+£7.00')
  })

  it('records a correction with the corrected total and a reason, previewing the difference', async () => {
    show()
    const submit = screen.getByRole('button', { name: 'Record correction' })
    expect(submit).toBeDisabled()

    fireEvent.change(screen.getByTestId('visit-pay-correction-amount'), { target: { value: '21' } })
    expect(screen.getByTestId('visit-pay-correction-preview')).toHaveTextContent('£7.00 more will be paid')
    expect(submit).toBeDisabled() // no reason yet
    fireEvent.change(screen.getByTestId('visit-pay-correction-reason'), { target: { value: 'Ran 30 minutes longer' } })
    expect(submit).toBeEnabled()

    fireEvent.click(submit)
    await vi.waitFor(() =>
      expect(state.record).toHaveBeenCalledWith({
        visitReconciliationId: 'visit-1',
        correctedAmount: 21,
        reason: 'Ran 30 minutes longer',
      }),
    )
    // The form is cleared for the next entry.
    await vi.waitFor(() => expect(screen.getByTestId('visit-pay-correction-reason')).toHaveValue(''))
  })

  it('previews a recovery, and refuses the amount the visit is already settled at', () => {
    show()
    const amount = screen.getByTestId('visit-pay-correction-amount')
    fireEvent.change(screen.getByTestId('visit-pay-correction-reason'), { target: { value: 'Paid too much' } })
    fireEvent.change(amount, { target: { value: '10' } })
    expect(screen.getByTestId('visit-pay-correction-preview')).toHaveTextContent('£4.00 will be recovered')
    fireEvent.change(amount, { target: { value: '14' } })
    expect(screen.getByTestId('visit-pay-correction-preview')).toHaveTextContent('nothing to correct')
    expect(screen.getByRole('button', { name: 'Record correction' })).toBeDisabled()
  })

  it('the person who entered a correction cannot approve it; another user can', async () => {
    state.history = history({ items: [item()], canRecordCorrection: false })
    const first = show()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled()
    expect(screen.getByText(/Another user must approve it/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Record correction' })).not.toBeInTheDocument()
    first.unmount()

    state.userId = 'user-checker'
    show()
    const approve = screen.getByRole('button', { name: 'Approve' })
    expect(approve).toBeEnabled()
    fireEvent.click(approve)
    await vi.waitFor(() => expect(state.approve).toHaveBeenCalledWith('item-1'))
  })

  it('labels every stage of a correction', () => {
    state.history = history({
      items: [
        item({ id: 'a', displayStatus: 'PENDING_APPROVAL' }),
        item({ id: 'b', status: 'APPROVED', displayStatus: 'APPROVED_FOR_PAYROLL' }),
        item({ id: 'c', status: 'APPROVED', displayStatus: 'INCLUDED_IN_PAYROLL' }),
        item({ id: 'd', status: 'APPROVED', displayStatus: 'SETTLED', canReverse: true }),
        item({ id: 'e', status: 'REJECTED', displayStatus: 'REJECTED' }),
        item({ id: 'f', status: 'APPROVED', displayStatus: 'REVERSED' }),
      ],
    })
    show()
    const labels = screen.getAllByTestId('visit-pay-correction-item').map(li => li.textContent ?? '')
    for (const [i, label] of [
      'Pending approval',
      'Approved for payroll',
      'Included in payroll',
      'Settled',
      'Rejected',
      'Reversed',
    ].entries()) {
      expect(labels[i]).toContain(label)
    }
  })

  it('offers a reversal only for a settled correction, and asks for a reason', async () => {
    state.history = history({
      items: [
        item({ id: 'settled', status: 'APPROVED', displayStatus: 'SETTLED', canReverse: true }),
        item({ id: 'reversed', status: 'APPROVED', displayStatus: 'REVERSED', canReverse: false }),
      ],
    })
    show()
    const rows = screen.getAllByTestId('visit-pay-correction-item')
    expect(within(rows[1]).queryByRole('button', { name: 'Reverse' })).not.toBeInTheDocument()

    const prompt = vi.spyOn(window, 'prompt').mockReturnValue('no')
    fireEvent.click(within(rows[0]).getByRole('button', { name: 'Reverse' }))
    expect(state.reverse).not.toHaveBeenCalled() // reason too short

    prompt.mockReturnValue('Entered in error')
    fireEvent.click(within(rows[0]).getByRole('button', { name: 'Reverse' }))
    await vi.waitFor(() => expect(state.reverse).toHaveBeenCalledWith({ id: 'settled', reason: 'Entered in error' }))
    prompt.mockRestore()
  })

  it('a user who can only read sees the history without any action', () => {
    state.permissions = ['billing.payroll_runs.read']
    state.history = history({ items: [item({ status: 'APPROVED', displayStatus: 'SETTLED', canReverse: true })] })
    show()
    expect(screen.getByTestId('visit-pay-correction-history')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
