import { BillingSectionLayout } from '@/features/billing/components/BillingSectionLayout'
import { BillingPayrollRunsPanel } from '@/features/billing/components/BillingPayrollRunsPanel'

export default function PayrollRunsPage() {
  return (
    <BillingSectionLayout
      title="Visit pay runs"
      description="Create and process carer visit pay for a billing period — calculate, review, approve, lock, and export. Separate from UK Payroll (PAYE)."
      testId="billing-payroll-runs-page"
    >
      <BillingPayrollRunsPanel />
    </BillingSectionLayout>
  )
}
