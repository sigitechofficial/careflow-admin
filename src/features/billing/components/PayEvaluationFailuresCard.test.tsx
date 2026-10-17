import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

import type { PayEvaluationFailure } from '@/features/billing/types/visit-reconciliation.types'

const state = vi.hoisted(() => ({
  rows: [] as unknown[],
  error: null as unknown,
  permissions: [] as string[],
  retry: vi.fn(),
  dismiss: vi.fn(),
  locationSeen: undefined as string | null | undefined,
}))

vi.mock('@/features/auth/store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ can: (p: string) => state.permissions.includes(p) }),
}))
vi.mock('@/features/billing/hooks/useVisitReconciliations', () => ({
  usePayEvaluationFailures: (locationId?: string | null) => {
    state.locationSeen = locationId
    return { data: state.rows, isLoading: false, error: state.error }
  },
  useRetryPayEvaluationFailure: () => ({ mutateAsync: state.retry, isPending: false }),
  useDismissPayEvaluationFailure: () => ({ mutateAsync: state.dismiss, isPending: false }),
}))
vi.mock('@/shared/lib/toast', () => ({ toastApiError: vi.fn(), toastError: vi.fn(), toastSuccess: vi.fn() }))

import { PayEvaluationFailuresCard } from './PayEvaluationFailuresCard'

const failure = (over: Partial<PayEvaluationFailure> = {}): PayEvaluationFailure => ({
  id: 'f-1',
  reference: 'abcd1234',
  operation: 'EVALUATE',
  visitReconciliationId: 'r-1',
  visitRef: 'VIS-GEN-20261103-0001',
  employeeId: 'e-1',
  employeeName: 'Ann Carer',
  serviceUserId: 's-1',
  serviceUserName: 'Test Client',
  kind: 'BUSINESS',
  category: 'EMPLOYMENT_RECORD_MISSING',
  message: 'Employee employment record not found',
  retryable: true,
  status: 'OPEN',
  occurrences: 2,
  firstOccurredAt: '2026-11-03T10:00:00.000Z',
  lastOccurredAt: '2026-11-04T10:00:00.000Z',
  ...over,
})

describe('PayEvaluationFailuresCard (R-17)', () => {
  beforeEach(() => {
    state.rows = [failure()]
    state.error = null
    state.permissions = ['billing.visit_reconciliations.read', 'billing.visit_reconciliations.manage']
    state.retry.mockReset().mockResolvedValue({ message: 'ok', data: { succeeded: true } })
    state.dismiss.mockReset().mockResolvedValue({ message: 'dismissed', data: {} })
  })

  it('shows nothing when there is no failure, and nothing without permission', () => {
    state.rows = []
    const first = render(<PayEvaluationFailuresCard />)
    expect(first.container).toBeEmptyDOMElement()
    first.unmount()
    state.rows = [failure()]
    state.permissions = []
    expect(render(<PayEvaluationFailuresCard />).container).toBeEmptyDOMElement()
  })

  it('names the visit, the carer, the cause and how often it failed; it never says "paid"', () => {
    render(<PayEvaluationFailuresCard locationId="branch-a" />)
    expect(state.locationSeen).toBe('branch-a')
    const row = screen.getByTestId('pay-evaluation-failure')
    expect(row).toHaveTextContent('VIS-GEN-20261103-0001')
    expect(row).toHaveTextContent('Ann Carer')
    expect(row).toHaveTextContent('No employment record')
    expect(row).toHaveTextContent('Employee employment record not found')
    expect(row).toHaveTextContent('Reference abcd1234')
    expect(row).toHaveTextContent('failed 2 times')
    expect(screen.getByText(/not paid as £0/)).toBeInTheDocument()
  })

  it('a technical failure is shown as a system error with its reference', () => {
    state.rows = [failure({ kind: 'TECHNICAL', category: 'UNEXPECTED', message: 'The pay calculation stopped with an unexpected error.', visitRef: null, employeeName: null })]
    render(<PayEvaluationFailuresCard />)
    const row = screen.getByTestId('pay-evaluation-failure')
    expect(row).toHaveTextContent('System error')
    expect(row).toHaveTextContent('Visit without a pay record')
  })

  it('retries, and dismisses only with a reason', async () => {
    render(<PayEvaluationFailuresCard />)
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await vi.waitFor(() => expect(state.retry).toHaveBeenCalledWith('f-1'))

    const prompt = vi.spyOn(window, 'prompt').mockReturnValue('no')
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(state.dismiss).not.toHaveBeenCalled()
    prompt.mockReturnValue('Visit entered in error')
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    await vi.waitFor(() => expect(state.dismiss).toHaveBeenCalledWith({ id: 'f-1', reason: 'Visit entered in error' }))
    prompt.mockRestore()
  })

  it('no retry for a failure that cannot succeed; no actions for a read-only user', () => {
    state.rows = [failure({ retryable: false, category: 'LOCKED_HISTORY' })]
    const first = render(<PayEvaluationFailuresCard />)
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument()
    first.unmount()

    state.rows = [failure()]
    state.permissions = ['billing.visit_reconciliations.read']
    render(<PayEvaluationFailuresCard />)
    expect(within(screen.getByTestId('pay-evaluation-failure')).queryByRole('button')).not.toBeInTheDocument()
  })
})
