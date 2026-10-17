import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import type { PayrollRunLineDetail } from '@/features/billing/api/payroll-runs.api'
import { PayrollRunAttentionList } from './PayrollRunAttentionList'

const line = (over: Partial<PayrollRunLineDetail>): PayrollRunLineDetail => ({
  id: 'l-1',
  lineType: 'VISIT_PAY',
  visitRef: 'VIS-GEN-20261103-0001',
  employeeId: 'e-1',
  carerName: 'Ann Carer',
  serviceUserName: 'Test Client',
  payableTime: '09:00 – 10:00',
  hoursLabel: '1h',
  minutes: 60,
  unitRate: '£14.00/hr',
  formula: '1h × £14.00/hr = £14.00',
  amount: '£14.00',
  description: 'Visit pay — VIS-GEN-20261103-0001',
  exceptionMessage: null,
  ...over,
})

describe('earnings a pay run could not work out (R-22)', () => {
  it('lists each held earning with the carer, what it is and why', () => {
    render(
      <PayrollRunAttentionList
        lines={[
          line({}),
          line({
            id: 'l-2',
            lineType: 'NON_VISIT_ACTIVITY',
            visitRef: null,
            amount: '£0.00',
            description: 'Not paid: training / activity — Moving and handling (2026-11-04)',
            exceptionMessage: 'Pay card TEST-1 has no training rate. Add one, enter a pay item for this activity, or untick "include in payroll" on the activity.',
          }),
        ]}
      />,
    )
    expect(screen.getByTestId('payroll-run-attention')).toHaveTextContent('1 earning could not be worked out and is not in this run\'s pay')
    const items = screen.getAllByTestId('payroll-run-attention-item')
    expect(items).toHaveLength(1)
    expect(items[0]).toHaveTextContent('Ann Carer')
    expect(items[0]).toHaveTextContent('Not paid: training / activity — Moving and handling (2026-11-04)')
    expect(items[0]).toHaveTextContent('has no training rate')
  })

  it('shows nothing when every line was worked out', () => {
    const { container } = render(<PayrollRunAttentionList lines={[line({}), line({ id: 'l-3' })]} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('minimum wage assessments that need attention (Sprint B3)', () => {
  const exception = {
    employeeId: 'e-1',
    periodStart: '2026-11-02',
    periodEnd: '2026-11-08',
    periodSource: 'PAY_RUN_PERIOD',
    issue: 'NO_PAYROLL_SCHEDULE',
    message: 'No UK payroll schedule period covers this work, so the pay reference period is not known.',
    compliant: false,
  }

  it('shows a worker with no payroll schedule, with the period used and what to put right', () => {
    render(<PayrollRunAttentionList lines={[line({})]} nmwExceptions={[exception]} carerNames={{ 'e-1': 'Ann Carer' }} />)
    expect(screen.queryByTestId('payroll-run-attention')).not.toBeInTheDocument()
    const item = screen.getByTestId('payroll-run-nmw-exception-item')
    expect(item).toHaveTextContent('Ann Carer · 2026-11-02 to 2026-11-08')
    expect(item).toHaveTextContent('the pay reference period is not known')
    expect(screen.getByTestId('payroll-run-nmw-exceptions')).toHaveTextContent('Minimum wage: 1 assessment needs attention')
  })

  it('is shown beside held earnings, and nothing is shown when there is neither', () => {
    const both = render(
      <PayrollRunAttentionList lines={[line({ exceptionMessage: 'Held for a reason' })]} nmwExceptions={[exception]} />,
    )
    expect(screen.getByTestId('payroll-run-attention')).toBeInTheDocument()
    expect(screen.getByTestId('payroll-run-nmw-exceptions')).toBeInTheDocument()
    both.unmount()
    const { container } = render(<PayrollRunAttentionList lines={[line({})]} nmwExceptions={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
