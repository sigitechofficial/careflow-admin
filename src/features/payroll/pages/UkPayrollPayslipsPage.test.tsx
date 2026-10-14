import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import type { UkPayrollPayslipListItem } from '@/features/payroll/types/payroll.types'

// Stable data, as react-query returns it.
const state = vi.hoisted(() => ({ rows: [] as unknown[] }))

vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }))
vi.mock('@/shared/lib/toast', () => ({ toastApiError: vi.fn(), toastSuccess: vi.fn() }))
vi.mock('@/features/locations/hooks/useGlobalLocationScope', () => ({ useGlobalLocationScope: () => ({ locationId: null }) }))
vi.mock('@/shared/context/organisation-display-format.context', () => ({ useOrganisationDisplayFormat: () => ({ formatDate: (d: string) => d }) }))
vi.mock('@/features/payroll/components/PayrollSectionLayout', () => ({
  PayrollSectionLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/features/payroll/api/payroll.api', () => ({ downloadUkPayrollPayslipPdf: vi.fn() }))
vi.mock('@/features/payroll/hooks/usePayroll', () => ({
  useUkPayrollPayslips: () => ({ data: state.rows, isLoading: false, isError: false }),
}))

import UkPayrollPayslipsPage from './UkPayrollPayslipsPage'

const row = (over: Partial<UkPayrollPayslipListItem>): UkPayrollPayslipListItem => ({
  runEmployeeId: 're-1',
  ukPayrollRunId: 'run-1',
  employeeId: 'e-1',
  displayName: 'Synthetic Carer',
  payrollNumber: 'P-1',
  runLabel: 'April run',
  periodLabel: 'April 2026',
  periodCaption: 'Monthly · April 2026',
  frequencyLabel: 'Monthly',
  paymentDate: '2026-04-30',
  periodStart: '2026-04-01',
  periodEnd: '2026-04-30',
  taxYearCode: '2026-27',
  scheduleName: 'Monthly',
  frequency: 'MONTHLY',
  totalGross: 3000,
  incomeTax: 390.2,
  employeeNi: 156.16,
  netPay: 2230.44,
  taxCodeApplied: '1257L',
  niCategoryApplied: 'A',
  bankStatus: 'CALCULATED',
  bankStatusLabel: 'Calculated — not yet paid',
  bankPaidAt: null,
  ...over,
})

describe('payslip screen: loans and pension from the saved payroll record (Gate C20)', () => {
  it('shows Student Loan (Plan 2), Postgraduate Loan and the employee pension as stored, next to gross, tax, NI and net', () => {
    state.rows = [
      row({
        studentLoanPlanApplied: '2',
        studentLoanDeduction: 49,
        postgraduateLoanApplied: true,
        postgraduateLoanDeduction: 75,
        pensionApplied: true,
        pensionEmployeeNet: 99.2,
        pensionEmployer: 74.4,
      }),
    ]
    render(<UkPayrollPayslipsPage />)
    expect(screen.getByTestId('payslip-student-loan-re-1')).toHaveTextContent('£49.00Plan 2')
    expect(screen.getByTestId('payslip-pg-loan-re-1')).toHaveTextContent('£75.00')
    expect(screen.getByTestId('payslip-pension-re-1')).toHaveTextContent('£99.20Employer-paid £74.40 (not deducted)')
    for (const amount of ['£3,000.00', '£390.20', '£156.16']) expect(screen.getAllByText(amount).length).toBeGreaterThan(0)
    expect(screen.getAllByText('£2,230.44').length).toBeGreaterThan(0)
  })

  it('a run from before loans and pensions were recorded shows "Historical detail unavailable", not £0.00; employer pension is not an employee deduction', () => {
    state.rows = [
      row({ runEmployeeId: 're-old', netPay: 2453.64 }), // no stored loan / pension markers
      row({ runEmployeeId: 're-new', studentLoanPlanApplied: 'NONE', studentLoanDeduction: 0, postgraduateLoanApplied: false, postgraduateLoanDeduction: 0, pensionApplied: true, pensionEmployeeNet: 0, pensionEmployer: 0 }),
    ]
    render(<UkPayrollPayslipsPage />)
    for (const id of ['payslip-student-loan-re-old', 'payslip-pg-loan-re-old', 'payslip-pension-re-old']) {
      expect(screen.getByTestId(id)).toHaveTextContent('Historical detail unavailable')
      expect(screen.getByTestId(id)).not.toHaveTextContent('£0.00')
    }
    // No loan recorded: a dash; a calculated pension of zero: £0.00, with the employer share labelled employer-paid.
    expect(screen.getByTestId('payslip-student-loan-re-new')).toHaveTextContent('—')
    expect(screen.getByTestId('payslip-pg-loan-re-new')).toHaveTextContent('—')
    expect(screen.getByTestId('payslip-pension-re-new')).toHaveTextContent('£0.00Employer-paid £0.00 (not deducted)')
  })
})
