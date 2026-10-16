import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { VisitMileageCorrectionHistory } from '@/features/billing/types/pay-items.types'

const state = vi.hoisted(() => ({
  data: null as unknown,
  permissions: [] as string[],
  record: vi.fn(),
}))

vi.mock('@/features/auth/store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ can: (p: string) => state.permissions.includes(p) }),
}))
vi.mock('@/features/billing/hooks/usePayItems', () => ({
  useVisitMileageCorrections: () => ({ data: state.data, isLoading: false, error: null }),
  useRecordMileageCorrection: () => ({ mutateAsync: state.record, isPending: false }),
}))
vi.mock('@/shared/lib/toast', () => ({ toastApiError: vi.fn(), toastSuccess: vi.fn() }))

import { VisitMileageCorrectionCard } from './VisitMileageCorrectionCard'

const history = (over: Partial<VisitMileageCorrectionHistory> = {}): VisitMileageCorrectionHistory => ({
  visit: { id: 'v-1', visitRef: 'VIS-GEN-20261103-0001', employeeId: 'e-1', paySettled: true },
  originalMiles: '10.00',
  originalAmount: '5.50',
  netMiles: '10.00',
  netAmount: '5.50',
  differenceAmount: '0.00',
  taxTreatmentVerified: false,
  canRecordCorrection: true,
  items: [],
  ...over,
})

describe('mileage correction on a settled visit (D-21)', () => {
  beforeEach(() => {
    state.data = history()
    state.permissions = ['billing.payroll_runs.manage']
    state.record.mockReset().mockResolvedValue({ message: 'Mileage correction of £2.20 recorded.' })
  })

  it('shows what was reimbursed, that it is mileage and not wages, and that the tax treatment is not verified', () => {
    render(<VisitMileageCorrectionCard visitReconciliationId="v-1" />)
    expect(screen.getByTestId('mileage-net')).toHaveTextContent('10.00 mi · £5.50')
    expect(screen.getByTestId('visit-mileage-correction')).toHaveTextContent('A correction is mileage, not wages')
    expect(screen.getByTestId('mileage-not-verified')).toBeInTheDocument()
  })

  it('records the corrected total miles with a reason', async () => {
    render(<VisitMileageCorrectionCard visitReconciliationId="v-1" />)
    const save = screen.getByRole('button', { name: 'Record mileage correction' })
    expect(save).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Corrected total miles'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Reason for the mileage correction'), { target: { value: 'Route was longer' } })
    expect(save).toBeDisabled() // the same miles as already settled
    fireEvent.change(screen.getByLabelText('Corrected total miles'), { target: { value: '14' } })
    expect(save).toBeEnabled()
    fireEvent.click(save)
    expect(state.record).toHaveBeenCalledWith({ visitReconciliationId: 'v-1', correctedMiles: 14, reason: 'Route was longer' })
    await waitFor(() => expect(screen.getByLabelText('Corrected total miles')).toHaveValue(null))
  })

  it('lists earlier corrections with miles, amount, status and who entered and approved them', () => {
    state.data = history({
      netMiles: '14.00',
      netAmount: '7.70',
      differenceAmount: '2.20',
      taxTreatmentVerified: true,
      items: [
        { id: 'i-1', quantity: '4', amount: '2.2', reason: 'Mileage correction VIS-GEN-20261103-0001: Route was longer', status: 'APPROVED', taxTreatment: 'TAX_FREE', createdAt: '2026-11-09T10:00:00.000Z', createdByName: 'Olivia Office', approvedByName: 'Peter Payroll', isReversal: false, canReverse: false },
      ],
    })
    render(<VisitMileageCorrectionCard visitReconciliationId="v-1" />)
    const item = screen.getByTestId('mileage-correction-item')
    expect(item).toHaveTextContent('+4.00 mi · +£2.20 · Approved')
    expect(item).toHaveTextContent('entered by Olivia Office · approved by Peter Payroll')
    expect(screen.getByTestId('visit-mileage-correction')).toHaveTextContent('originally 10.00 mi · £5.50')
    expect(screen.queryByTestId('mileage-not-verified')).not.toBeInTheDocument()
  })

  it('a correction awaiting approval blocks another; a user without the permission sees no form', () => {
    state.data = history({
      canRecordCorrection: false,
      items: [{ id: 'i-1', quantity: '4', amount: '2.2', reason: 'x', status: 'PENDING_APPROVAL', taxTreatment: null, createdAt: '2026-11-09T10:00:00.000Z', createdByName: null, approvedByName: null, isReversal: false, canReverse: false }],
    })
    const pending = render(<VisitMileageCorrectionCard visitReconciliationId="v-1" />)
    expect(screen.queryByRole('button', { name: 'Record mileage correction' })).not.toBeInTheDocument()
    expect(screen.getByText(/awaiting approval/)).toBeInTheDocument()
    pending.unmount()

    state.data = history()
    state.permissions = []
    render(<VisitMileageCorrectionCard visitReconciliationId="v-1" />)
    expect(screen.queryByRole('button', { name: 'Record mileage correction' })).not.toBeInTheDocument()
  })
})
