import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { DisruptionDecision, UndecidedCancellation, VisitTravelTime } from '@/features/billing/api/travel-disruptions.api'

const state = vi.hoisted(() => ({
  travel: null as unknown,
  cancellations: [] as unknown[],
  decisions: [] as unknown[],
  permissions: [] as string[],
  recordInterval: vi.fn(),
  approveInterval: vi.fn(),
  rejectInterval: vi.fn(),
  recordDisruption: vi.fn(),
  decide: vi.fn(),
  approve: vi.fn(),
}))

vi.mock('@/features/auth/store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ can: (p: string) => state.permissions.includes(p) }),
}))
vi.mock('@/shared/lib/toast', () => ({ toastApiError: vi.fn(), toastSuccess: vi.fn() }))
vi.mock('@/features/billing/hooks/useTravelDisruptions', () => ({
  useVisitTravelTime: () => ({ data: state.travel, isLoading: false, error: null }),
  useTravelIntervalActions: () => ({
    record: { mutateAsync: state.recordInterval, isPending: false },
    approve: { mutateAsync: state.approveInterval, isPending: false },
    reject: { mutateAsync: state.rejectInterval, isPending: false },
  }),
  useUndecidedCancellations: () => ({ data: state.cancellations }),
  useDisruptionDecisions: () => ({ data: state.decisions }),
  useDisruptionActions: () => ({
    record: { mutateAsync: state.recordDisruption, isPending: false },
    decide: { mutateAsync: state.decide, isPending: false },
    approve: { mutateAsync: state.approve, isPending: false },
    reject: { mutateAsync: vi.fn(), isPending: false },
  }),
}))

import { VisitTravelTimeCard } from './VisitTravelTimeCard'
import { DisruptedVisitsPanel } from './DisruptedVisitsPanel'

const travel = (over: Partial<VisitTravelTime> = {}): VisitTravelTime => ({
  visit: { id: 'v-2', visitRef: 'VIS-2', employeeId: 'e-1', paySettled: false },
  basis: 'ESTIMATED_FROM_GAP',
  decided: null,
  estimate: { fromVisitRef: 'VIS-1', gapMinutes: 40, classification: 'PAID_TRAVEL', travelMinutes: 40, waitingMinutes: 0, needsReview: false },
  intervals: [],
  ...over,
})
const ok = { message: 'Done' }

describe('travel time before a visit (TR-01 / TR-04 / TR-05 / TR-06)', () => {
  beforeEach(() => {
    state.travel = travel()
    state.permissions = ['billing.visit_reconciliations.manage']
    for (const fn of [state.recordInterval, state.approveInterval, state.rejectInterval]) fn.mockReset().mockResolvedValue(ok)
  })

  it('says the gap is an estimate, not verified, and that mileage is separate', () => {
    render(<VisitTravelTimeCard visitReconciliationId="v-2" visitDate="2026-11-03T10:40:00.000Z" />)
    const basis = screen.getByTestId('travel-basis')
    expect(basis).toHaveTextContent('Estimate, not verified: 40 min since VIS-1 is read as 40 min travel and 0 min waiting')
    expect(basis).toHaveTextContent('This is time only: mileage is entered and paid separately')
  })

  it('says when the pay run uses travel minutes entered on the visit itself', () => {
    state.travel = travel({ basis: 'RECORDED_ON_VISIT', recordedOnVisitMinutes: 40 })
    render(<VisitTravelTimeCard visitReconciliationId="v-2" visitDate="2026-11-03T10:40:00.000Z" />)
    expect(screen.getByTestId('travel-basis')).toHaveTextContent('Travel minutes entered on the visit: 40 min, not classified')
  })

  it('records an interval with its category, times, evidence and note', async () => {
    render(<VisitTravelTimeCard visitReconciliationId="v-2" visitDate="2026-11-03T10:40:00.000Z" />)
    const save = screen.getByRole('button', { name: 'Record interval' })
    expect(save).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Travel category'), { target: { value: 'REST_BREAK' } })
    fireEvent.change(screen.getByLabelText('Interval start'), { target: { value: '10:00' } })
    fireEvent.change(screen.getByLabelText('Interval end'), { target: { value: '10:30' } })
    fireEvent.change(screen.getByLabelText('Interval note'), { target: { value: 'Carer took her break' } })
    expect(save).toBeEnabled()
    fireEvent.click(save)
    await waitFor(() => expect(state.recordInterval).toHaveBeenCalled())
    expect(state.recordInterval.mock.calls[0][0]).toMatchObject({
      toVisitReconciliationId: 'v-2',
      category: 'REST_BREAK',
      evidence: 'RECORDED',
      startAt: '2026-11-03T10:00:00.000Z',
      endAt: '2026-11-03T10:30:00.000Z',
      note: 'Carer took her break',
    })
  })

  it('only a training journey, a journey to a cancelled visit or "other" can be marked as paid', () => {
    render(<VisitTravelTimeCard visitReconciliationId="v-2" visitDate="2026-11-03T10:40:00.000Z" />)
    expect(screen.queryByLabelText("Paid under the employer's policy")).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Travel category'), { target: { value: 'CANCELLED_VISIT_JOURNEY' } })
    expect(screen.getByLabelText("Paid under the employer's policy")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Travel category'), { target: { value: 'ORDINARY_COMMUTE' } })
    expect(screen.queryByLabelText("Paid under the employer's policy")).not.toBeInTheDocument()
  })

  it('shows approved intervals as the basis, and lets a pending one be approved', async () => {
    state.travel = travel({
      basis: 'APPROVED_INTERVALS',
      decided: { travelMinutes: 15, waitingMinutes: 0, notPaidMinutes: 15, summary: '' },
      intervals: [
        { id: 'i-1', category: 'BETWEEN_SERVICE_USERS', evidence: 'VERIFIED', status: 'APPROVED', startAt: '2026-11-03T10:00:00.000Z', endAt: '2026-11-03T10:15:00.000Z', minutes: 15, paid: true, note: null, decisionNote: null, createdByName: 'Olivia Office', decidedByName: 'Peter Payroll' },
        { id: 'i-2', category: 'REST_BREAK', evidence: 'RECORDED', status: 'PENDING', startAt: '2026-11-03T10:15:00.000Z', endAt: '2026-11-03T10:30:00.000Z', minutes: 15, paid: false, note: 'Break', decisionNote: null, createdByName: 'Olivia Office', decidedByName: null },
      ],
    })
    render(<VisitTravelTimeCard visitReconciliationId="v-2" visitDate="2026-11-03T10:40:00.000Z" />)
    expect(screen.getByTestId('travel-basis')).toHaveTextContent('Decided by approved intervals: 15 min travel, 0 min waiting, 15 min not paid')
    const items = screen.getAllByTestId('travel-interval-item')
    expect(items[0]).toHaveTextContent('15 min · Travel between service users · Approved')
    expect(items[1]).toHaveTextContent('Rest break (not paid) · not paid · Awaiting approval')
    fireEvent.click(screen.getByRole('button', { name: 'Approve interval' }))
    await waitFor(() => expect(state.approveInterval).toHaveBeenCalledWith('i-2'))
  })

  it('a settled visit takes no new interval; a reader sees no form', () => {
    state.travel = travel({ visit: { id: 'v-2', visitRef: 'VIS-2', employeeId: 'e-1', paySettled: true } })
    const settled = render(<VisitTravelTimeCard visitReconciliationId="v-2" visitDate="2026-11-03T10:40:00.000Z" />)
    expect(screen.queryByRole('button', { name: 'Record interval' })).not.toBeInTheDocument()
    expect(screen.getByText(/corrected with a pay correction/)).toBeInTheDocument()
    settled.unmount()
    state.travel = travel()
    state.permissions = []
    render(<VisitTravelTimeCard visitReconciliationId="v-2" visitDate="2026-11-03T10:40:00.000Z" />)
    expect(screen.queryByRole('button', { name: 'Record interval' })).not.toBeInTheDocument()
  })
})

describe('visits that did not go ahead as planned (Q13)', () => {
  const cancellation: UndecidedCancellation = {
    scheduledJobId: 'j-1',
    employeeId: 'e-1',
    jobName: 'Morning call',
    scheduledStart: '2026-11-03T09:00:00.000Z',
    scheduledMinutes: 60,
    cancelledAt: '2026-11-03T08:00:00.000Z',
    noticeMinutes: 60,
    reasonCode: 'CLIENT_REQUEST',
  }
  const decision = (over: Partial<DisruptionDecision> = {}): DisruptionDecision => ({
    id: 'd-1',
    employeeId: 'e-1',
    scheduledJobId: 'j-2',
    eventType: 'NOBODY_HOME',
    eventLabel: 'Nobody home / no access',
    eventAt: '2026-11-04T09:00:00.000Z',
    noticeMinutes: null,
    scheduledMinutes: 60,
    affectedMinutes: null,
    proposedOutcome: 'NOT_DECIDED',
    proposedAmount: null,
    amount: null,
    status: 'NEEDS_DECISION',
    reason: 'No answer at the door',
    decisionNote: 'No approved rule covers this event. A person decides what is paid.',
    ...over,
  })

  beforeEach(() => {
    state.cancellations = []
    state.decisions = []
    state.permissions = ['billing.payroll_runs.manage']
    for (const fn of [state.recordDisruption, state.decide, state.approve]) fn.mockReset().mockResolvedValue(ok)
  })

  it('shows nothing when there is nothing to decide', () => {
    const { container } = render(<DisruptedVisitsPanel />)
    expect(container).toBeEmptyDOMElement()
  })

  it('lists a cancelled visit with a carer as having no pay decision, and records it for pay', async () => {
    state.cancellations = [cancellation]
    render(<DisruptedVisitsPanel />)
    expect(screen.getByTestId('disrupted-visits-panel')).toHaveTextContent('A cancelled visit is not treated as nothing to pay')
    expect(screen.getByTestId('undecided-cancellations')).toHaveTextContent('Morning call')
    expect(screen.getByTestId('undecided-cancellations')).toHaveTextContent('cancelled with 60 min notice (client request) · no pay decision')
    fireEvent.click(screen.getByRole('button', { name: 'Record for pay' }))
    await waitFor(() => expect(state.recordDisruption).toHaveBeenCalled())
    expect(state.recordDisruption.mock.calls[0][0]).toMatchObject({ employeeId: 'e-1', scheduledJobId: 'j-1', eventType: 'CLIENT_CANCELLED', noticeMinutes: 60, scheduledMinutes: 60 })
  })

  it('an event with no rule needs an amount and a reason from a person; it cannot be approved before that', async () => {
    state.decisions = [decision()]
    render(<DisruptedVisitsPanel />)
    const item = screen.getByTestId('disruption-decision-item')
    expect(item).toHaveTextContent('Nobody home / no access')
    expect(item).toHaveTextContent('Needs a decision')
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
    const set = screen.getByRole('button', { name: 'Set amount' })
    expect(set).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Amount to pay for Nobody home / no access'), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('Reason for the amount for Nobody home / no access'), { target: { value: 'Half the visit' } })
    fireEvent.click(set)
    await waitFor(() => expect(state.decide).toHaveBeenCalledWith({ id: 'd-1', amount: 7, note: 'Half the visit' }))
  })

  it('an amount awaiting approval is approved by a second person', async () => {
    state.decisions = [decision({ status: 'PENDING_APPROVAL', amount: 14, proposedOutcome: 'FULL_SCHEDULED', proposedAmount: 14 })]
    render(<DisruptedVisitsPanel />)
    expect(screen.getByTestId('disruption-decision-item')).toHaveTextContent('Awaiting approval · £14.00')
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(state.approve).toHaveBeenCalledWith('d-1'))
  })
})
