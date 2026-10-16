import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { PayableBreakdown } from './PayableBreakdown'

describe('wages and reimbursement shown apart (TR-13)', () => {
  it('net pay, mileage and the amount payable are three separate figures', () => {
    render(<PayableBreakdown netPay={154} reimbursement={3.41} />)
    const breakdown = screen.getByTestId('payable-breakdown')
    expect(breakdown).toHaveTextContent('Net pay £154.00 + mileage and expenses £3.41')
    expect(breakdown).toHaveTextContent('Payable £157.41')
    expect(screen.queryByTestId('payable-breakdown-not-verified')).not.toBeInTheDocument()
  })

  it('says when the tax treatment of the mileage has not been verified', () => {
    render(<PayableBreakdown netPay={154} reimbursement={3.41} notVerified={3.41} />)
    expect(screen.getByTestId('payable-breakdown-not-verified')).toHaveTextContent('Tax treatment of £3.41 mileage not verified')
  })

  it('shows nothing when there is no reimbursement', () => {
    const { container } = render(<PayableBreakdown netPay={154} reimbursement={0} />)
    expect(container).toBeEmptyDOMElement()
  })
})
